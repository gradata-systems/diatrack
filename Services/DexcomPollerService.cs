using Diatrack.Configuration;
using Diatrack.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Diatrack.Services
{
    public class DexcomPollerService : ScheduledTaskService
    {
        private readonly DexcomConfiguration _dexConfig;
        private readonly ElasticClient _elasticClient;

        private readonly HttpClient _httpClient;
        private SemaphoreSlim _semaphore;

        private IDictionary<string, DateTime> _accountBglState = new Dictionary<string, DateTime>();
        private static readonly Regex _quotedPattern = new(@"^""(.*)""$", RegexOptions.Compiled);

        public DexcomPollerService(IOptions<DexcomConfiguration> dexConfig, ElasticDataProvider elasticProvider)
            :base(TimeSpan.FromSeconds(dexConfig.Value.BglQueryFrequencySeconds))
        {
            _dexConfig = dexConfig.Value;
            _elasticClient = elasticProvider.NestClient;

            _httpClient = new HttpClient();

            // Set the maximum number of concurrent HTTP requests for each Dexcom server
            foreach (string server in _dexConfig.Regions.Select(r => r.Value.Server))
            {
                ServicePointManager.FindServicePoint(new Uri($"http://{server}")).ConnectionLimit = dexConfig.Value.MaxConcurrentRequests;
            }
        }

        protected override async Task DoWork(CancellationToken cancellationToken)
        {
            Log.Information("Querying BGL data");

            await GetBglReadings(cancellationToken);
        }

        /// <summary>
        /// Retrieve the BGL readings for all accounts. This routine occurs asynchronously and returns BGL results one account at a time,
        /// allowing them to be batched and pushed to Elasticsearch.
        /// </summary>
        /// <returns></returns>
        private async Task GetBglReadings(CancellationToken cancellationToken)
        {
            // Get the last BGL reading from each account ID, so we know when to start querying from
            _accountBglState = await GetAccountBglState();

            // Limit concurrent API requests
            _semaphore = new SemaphoreSlim(_dexConfig.MaxConcurrentRequests, _dexConfig.MaxConcurrentRequests);

            // Get all unique Dexcom logins
            IDictionary<string, DexcomAccount> accounts = await GetDexcomAccounts();

            // For each account, find out its id (if not cached) and poll for CGM data
            foreach (DexcomAccount account in accounts.Values)
            {
                await _semaphore.WaitAsync(cancellationToken);

                IEnumerable<DexcomBglReading> readings = (await QueryBglDataForAccount(account, cancellationToken)).Select(reading =>
                {
                    // Attribute the reading to the user's account
                    reading.AccountId = account.Id;

                    return reading;
                });

                if (readings.Any())
                {
                    try
                    {
                        BulkResponse response = await _elasticClient.BulkAsync(b => b.IndexMany(readings), cancellationToken);

                        if (!response.Errors)
                        {
                            await PutAccountBglState(_accountBglState);
                        }
                        else
                        {
                            Log.Warning("Errors occurred when indexing BGL readings for account {LoginId} in region {RegionId}. {ServerError}",
                                account.LoginId, account.RegionId, response.ServerError);
                        }
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "Failed to post BGL readings for account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                    }
                    finally
                    {
                        _semaphore.Release();
                    }
                }
            }
        }

        private async Task<IEnumerable<DexcomBglReading>> QueryBglDataForAccount(DexcomAccount account, CancellationToken cancellationToken)
        {
            Log.Information("Querying CGM data for {AccountId} in region {RegionId}", account.RegionId, account.LoginId);

            if (!string.IsNullOrEmpty(account.Id))
            {
                int queryWindowMins = _dexConfig.CgmMaxWindowMinutes;
                int queryMaxCount = _dexConfig.MaxAccountQuerySize;

                // Get the last sensor data timestamp
                if (_accountBglState.TryGetValue(account.Id, out DateTime lastBglReading))
                {
                    Log.Debug("Last BGL reading for account {LoginId} in region {RegionId} was {Timestamp}", account.LoginId, account.RegionId, lastBglReading);

                    // Calculate how much data we need to query in order to get back up-to-date
                    queryWindowMins = (int)Math.Floor(DateTime.UtcNow.Subtract(lastBglReading.AddSeconds(1)).TotalMinutes);
                    queryMaxCount = (int)Math.Floor(queryWindowMins / 5.0) + 1;
                }

                // Log on, returning a session ID
                string sessionId = await LoginPublisherAccount(account);

                if (!string.IsNullOrEmpty(sessionId))
                {
                    // Query CGM sensor data
                    try
                    {
                        string baseUrl = account.BuildRegionalUrl(_dexConfig.LatestCgmDataEndpoint, _dexConfig.Regions);
                        string fullUrl = QueryHelpers.AddQueryString(baseUrl, new Dictionary<string, string>()
                        {
                            { "sessionId", sessionId },
                            { "minutes", queryWindowMins.ToString() },
                            { "maxCount", queryMaxCount.ToString() }
                        });

                        HttpRequestMessage request = new(HttpMethod.Post, fullUrl);
                        HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);

                        if (response.StatusCode == HttpStatusCode.OK)
                        {
                            JsonSerializerOptions serializerOptions = new() { Converters = { new DexcomBglReadingJsonConverter() } };
                            List<DexcomBglReading> readings = await JsonSerializer.DeserializeAsync<List<DexcomBglReading>>(
                                response.Content.ReadAsStream(cancellationToken), serializerOptions, cancellationToken);
                            
                            // Update state using the timestamp from the most recent reading
                            if (readings.Count > 0)
                            {
                                _accountBglState[account.Id] = readings[0].Timestamp;

                                return readings;
                            }
                        }
                    }
                    catch (InvalidRegionException ex)
                    {
                        Log.Error(ex, "Invalid region");
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "BGL sensor data could not be collected for account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                    }
                }
            }

            return Enumerable.Empty<DexcomBglReading>();
        }

        /// <summary>
        /// Get a dictionary of all accounts IDs and for each, the last CGM reading obtained.
        /// Collection will pick up from that timestamp.
        /// </summary>
        private async Task<IDictionary<string, DateTime>> GetAccountBglState()
        {
            GetResponse<AccountBglState> result = await _elasticClient.GetAsync(new DocumentPath<AccountBglState>(1));
            if (result.Found)
            {
                return result.Source.Accounts;
            }
            else
            {
                return new Dictionary<string, DateTime>();
            }
        }

        /// <summary>
        /// Update the timestamp of the last BGL reading for each account ID
        /// </summary>
        private async Task PutAccountBglState(IDictionary<string, DateTime> state)
        {
            IndexResponse result = await _elasticClient.IndexDocumentAsync(new AccountBglState() { Id = 1, Accounts = state });
            if (result.Result == Result.Error)
            {
                Log.Error("Failed to update account BGL state", result.ServerError);
            }
        }

        /// <summary>
        /// Create a deduplicated list of accounts to be queried
        /// </summary>
        /// <returns></returns>
        private async Task<IDictionary<string, DexcomAccount>> GetDexcomAccounts()
        {
            // Get all users with a Dexcom account
            IReadOnlyCollection<User> users = (await _elasticClient.SearchAsync<User>(u => u
                .Query(
                    q => q.Exists(u => u.Field(doc => doc.DexcomAccount.LoginId))
                )
                .Size(_dexConfig.MaxAccountQuerySize)
            )).Documents;

            // For each login, retrieve the account name and ensure all Dexcom account details are complete
            Dictionary<string, DexcomAccount> accounts = new();
            foreach (User user in users)
            {
                DexcomAccount account = user.DexcomAccount;

                // Skip incomplete or invalid accounts
                if (account.IsValid)
                {
                    accounts.TryAdd(account.Id, account);
                }
            }

            return accounts;
        }

        /// <summary>
        /// Authenticate as a publisher using the user's stored Dexcom credentials
        /// </summary>
        /// <param name="account"></param>
        /// <returns>Session ID</returns>
        private async Task<string> LoginPublisherAccount(DexcomAccount account)
        {
            try
            {
                HttpRequestMessage request = new(HttpMethod.Post, account.BuildRegionalUrl(_dexConfig.LoginEndpoint, _dexConfig.Regions));
                request.Content = JsonContent.Create(new
                {
                    ApplicationId = _dexConfig.ApplicationId,
                    AccountId = account.Id,
                    Password = account.GetPlainTextPassword()
                });

                HttpResponseMessage response = await _httpClient.SendAsync(request);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string rawSessionId = await response.Content.ReadAsStringAsync();
                    Match sessionIdMatch = _quotedPattern.Match(rawSessionId);
                    if (sessionIdMatch.Success)
                    {
                        return sessionIdMatch.Groups[1].Value;
                    }
                    else
                    {
                        Log.Error("Unexpected session ID {SessionId} returned", rawSessionId);
                    }
                }
                else
                {
                    Log.Error("Failed to log on account {LoginId} in region {RegionId}. Status code: {StatusCode}. Reason: {Reason}",
                            account.LoginId, account.RegionId, response.StatusCode, response.ReasonPhrase);
                }
            }
            catch (InvalidRegionException ex)
            {
                Log.Error(ex, "Invalid region for {LoginId}", account.LoginId);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to log on account {LoginId} in region {RegionId}", account.Id, account.LoginId, account.RegionId);
            }

            return null;
        }
    }

    enum CircuitStatus
    {
        Closed = 0,
        Tripped = 1
    }
}
