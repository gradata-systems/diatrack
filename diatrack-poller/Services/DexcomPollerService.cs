using Diatrack.Configuration;
using Diatrack.Models;
using Diatrack.Services;
using DiatrackPoller.Configuration;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace DiatrackPoller.Services
{
    public class DexcomPollerService : ScheduledTaskService
    {
        private readonly AppConfiguration _appConfig;
        private readonly DexcomConfiguration _dexConfig;
        private readonly DexcomPollerConfiguration _dexPollerConfig;
        private readonly ElasticClient _elasticClient;

        private readonly HttpClient _httpClient;
        private SemaphoreSlim _semaphore;

        private readonly IDictionary<string, string> _accountSessions = new Dictionary<string, string>();
        private IDictionary<string, AccountStateRecord> _accountState = new Dictionary<string, AccountStateRecord>();
        private static readonly Regex _quotedPattern = new(@"^""(.*)""$", RegexOptions.Compiled);

        public DexcomPollerService(IOptions<AppConfiguration> appConfig, IOptions<DexcomConfiguration> dexConfig, IOptions<DexcomPollerConfiguration> dexPollerConfig, ElasticDataProvider elasticProvider)
            :base(TimeSpan.FromSeconds(dexPollerConfig.Value.BglQueryFrequencySeconds))
        {
            _appConfig = appConfig.Value;
            _dexConfig = dexConfig.Value;
            _dexPollerConfig = dexPollerConfig.Value;
            _elasticClient = elasticProvider.NestClient;

            _httpClient = new HttpClient();

            // Set the maximum number of concurrent HTTP requests for each Dexcom server
            ServicePointManager.DefaultConnectionLimit = _dexPollerConfig.MaxConcurrentRequests;
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
            _accountState = await GetAccountState();

            // Limit concurrent API requests
            _semaphore = new SemaphoreSlim(_dexPollerConfig.MaxConcurrentRequests, _dexPollerConfig.MaxConcurrentRequests);

            // Get all unique Dexcom logins
            IDictionary<string, DataSource> accounts = await GetDexcomAccounts();

            // Accumulate BGL query tasks
            List<Task> tasks = new();

            // For each account, find out its id (if not cached) and poll for CGM data
            Stopwatch stopwatch = new();
            stopwatch.Start();
            foreach (DataSource account in accounts.Values)
            {
                await _semaphore.WaitAsync(cancellationToken);

                // If an account state record doesn't exist, create it
                if (!_accountState.TryGetValue(account.Id, out AccountStateRecord accountState))
                {
                    accountState = new AccountStateRecord()
                    {
                        Id = account.Id,
                        PollingEnabled = true
                    };

                    _accountState.Add(account.Id, accountState);
                }
                else if (!accountState.PollingEnabled)
                {
                    Log.Information("Skipped disabled account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                    continue;
                }

                tasks.Add(Task.Run(async () => {
                    string sessionId;
                    IEnumerable<BglReading> bglReadings;
                    try
                    {
                        sessionId = _accountSessions[account.Id];
                        bglReadings = await QueryBglDataForAccount(sessionId, account, accountState, cancellationToken);
                    }
                    catch (Exception)
                    {
                        try
                        {
                            // Session probably expired or invalid so retry, this time logging in first
                            sessionId = await LoginPublisherAccount(account, accountState);
                            if (sessionId == null)
                            {
                                // Disable polling as login failed and we want to avoid locking the user's account
                                accountState.PollingEnabled = false;
                                bglReadings = Enumerable.Empty<BglReading>();
                            }
                            else
                            {
                                _accountSessions[account.Id] = sessionId;
                                bglReadings = await QueryBglDataForAccount(sessionId, account, accountState, cancellationToken);
                            }
                        }
                        catch (Exception)
                        {
                            // Still failed, so return an empty result
                            bglReadings = Enumerable.Empty<BglReading>();
                        }
                    }

                    IEnumerable<BglReading> readings = bglReadings.Select(reading =>
                    {
                        // Attribute the reading to the user's account
                        reading.AccountId = account.Id;

                        return reading;
                    });

                    if (readings.Any())
                    {
                        try
                        {
                            BulkResponse response = await _elasticClient.BulkAsync(b => b.CreateMany(readings), cancellationToken);

                            if (!response.Errors)
                            {
                                await PutAccountState(accountState);
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
                    }

                    _semaphore.Release();
                }, cancellationToken));
            }

            Task.WaitAll(tasks.ToArray(), cancellationToken);

            stopwatch.Stop();
            Log.Information($"Spent {stopwatch.Elapsed.TotalSeconds} seconds querying {tasks.Count} accounts");
        }

        private async Task<IDictionary<string, AccountStateRecord>> GetAccountState()
        {
            ISearchResponse<AccountStateRecord> result = await _elasticClient.SearchAsync<AccountStateRecord>(s => s
                .Size(_dexPollerConfig.MaxAccountQuerySize)
            );

            if (result.IsValid)
            {
                return result.Documents.ToDictionary(d => d.Id);
            }
            else
            {
                return new Dictionary<string, AccountStateRecord>();
            }
        }

        private async Task PutAccountState(AccountStateRecord accountState)
        {
            UpdateResponse<AccountStateRecord> result = await _elasticClient.UpdateAsync(new DocumentPath<AccountStateRecord>(accountState.Id), q => q
                .Doc(accountState)
                .DocAsUpsert()
            );

            if (!result.IsValid)
            {
                throw new Exception("Failed to write account state");
            }
        }

        private async Task<IEnumerable<BglReading>> QueryBglDataForAccount(string sessionId, DataSource account, AccountStateRecord accountState, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(sessionId))
                return null;

            Log.Information("Querying BGL readings for account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);

            if (!string.IsNullOrEmpty(account.Id))
            {
                int queryWindowMins = _dexPollerConfig.BglMaxWindowMinutes;
                int queryMaxCount = _dexPollerConfig.MaxAccountQuerySize;

                // Get the last sensor data timestamp
                DateTime? lastBglReading = accountState.LastReceived;
                if (lastBglReading.HasValue)
                {
                    Log.Debug("Last BGL reading for account {LoginId} in region {RegionId} was {Timestamp}", account.LoginId, account.RegionId, lastBglReading);

                    // Calculate how much data we need to query in order to get back up-to-date
                    queryWindowMins = (int)Math.Floor(DateTime.UtcNow.Subtract(lastBglReading.Value.AddSeconds(1)).TotalMinutes);
                    queryMaxCount = (int)Math.Floor(queryWindowMins / 5.0) + 1;
                }

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
                            JsonSerializerOptions serializerOptions = new() { Converters = { new BglReadingJsonConverter() } };
                            List<BglReading> readings = await JsonSerializer.DeserializeAsync<List<BglReading>>(
                                response.Content.ReadAsStream(cancellationToken), serializerOptions, cancellationToken);
                            
                            // Update state using the timestamp from the most recent reading
                            if (readings.Count > 0)
                            {
                                accountState.LastReceived = readings[0].Timestamp;
                            }

                            return readings;
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

            throw new Exception("Error querying sensor data");
        }

        /// <summary>
        /// Create a deduplicated list of accounts to be queried
        /// </summary>
        /// <returns></returns>
        private async Task<IDictionary<string, DataSource>> GetDexcomAccounts()
        {
            // Get all users with a Dexcom account
            IReadOnlyCollection<UserProfile> users = (await _elasticClient.SearchAsync<UserProfile>(u => u
                .Query(
                    q => q.Exists(u => u.Field(doc => doc.DataSources))
                )
                .Size(_dexPollerConfig.MaxAccountQuerySize)
            )).Documents;

            // For each login, retrieve the account name and ensure all Dexcom account details are complete
            Dictionary<string, DataSource> accounts = new();
            foreach (UserProfile user in users)
            {
                foreach (DataSource account in user.DataSources)
                {
                    // Skip incomplete or invalid accounts
                    if (account.IsValid)
                    {
                        accounts.TryAdd(account.Id, account);
                    }
                }
            }

            return accounts;
        }

        /// <summary>
        /// Authenticate as a publisher using the user's stored Dexcom credentials
        /// </summary>
        /// <param name="account"></param>
        /// <returns>Session ID</returns>
        private async Task<string> LoginPublisherAccount(DataSource account, AccountStateRecord accountState)
        {
            try
            {
                string plainTextPassword = await account.GetPlainTextPassword(_appConfig);
                HttpRequestMessage request = new(HttpMethod.Post, account.BuildRegionalUrl(_dexConfig.LoginEndpoint, _dexConfig.Regions));
                request.Content = JsonContent.Create(new
                {
                    ApplicationId = _dexConfig.ApplicationId,
                    AccountId = account.Id,
                    Password = plainTextPassword
                });

                HttpResponseMessage response = await _httpClient.SendAsync(request);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string rawSessionId = await response.Content.ReadAsStringAsync();
                    Match sessionIdMatch = _quotedPattern.Match(rawSessionId);
                    if (sessionIdMatch.Success)
                    {
                        string sessionId = sessionIdMatch.Groups[1].Value;

                        // Reuse the session ID for future BGL data queries
                        if (!_accountSessions.TryAdd(account.Id, sessionId))
                        {
                            _accountSessions[account.Id] = sessionId;
                        }

                        return sessionId;
                    }
                    else
                    {
                        Log.Error("Unexpected session ID {SessionId} returned", rawSessionId);
                    }
                }
                else
                {
                    // Disable polling for this account
                    accountState.PollingEnabled = false;

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
                Log.Error(ex, "Failed to log on account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
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
