using Diatrack.Configuration;
using Diatrack.Models;
using Diatrack.Services;
using DiatrackPoller.Configuration;
using Elastic.Apm.Api;
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
        private readonly DexcomPollerConfiguration _pollerConfig;
        private readonly ElasticClient _elasticClient;
        private readonly ITracer _apmTracer;
        private readonly IHealthService _healthService;

        private readonly HttpClient _httpClient;
        private SemaphoreSlim _semaphore;

        private readonly IDictionary<string, string> _accountSessions = new Dictionary<string, string>();
        private IDictionary<string, AccountStateRecord> _accountState = new Dictionary<string, AccountStateRecord>();
        private IDictionary<string, DateTime> _accountLastQueried = new Dictionary<string, DateTime>();
        private static readonly Regex _quotedPattern = new(@"^""(.*)""$", RegexOptions.Compiled);

        public DexcomPollerService(
            IOptions<AppConfiguration> appConfig,
            IOptions<DexcomConfiguration> dexConfig,
            IOptions<DexcomPollerConfiguration> dexPollerConfig,
            ElasticDataProvider elasticProvider,
            ITracer apmTracer,
            IHealthService healthService)
            :base(TimeSpan.FromSeconds(dexPollerConfig.Value.BglQueryFrequencySeconds))
        {
            _appConfig = appConfig.Value;
            _dexConfig = dexConfig.Value;
            _pollerConfig = dexPollerConfig.Value;
            _elasticClient = elasticProvider.NestClient;
            _apmTracer = apmTracer;
            _healthService = healthService;

            _httpClient = new HttpClient()
            {
                Timeout = TimeSpan.FromSeconds(_pollerConfig.QueryTimeoutSeconds)
            };

            // Set the maximum number of concurrent HTTP requests for each Dexcom server
            ServicePointManager.DefaultConnectionLimit = _pollerConfig.MaxConcurrentRequests;
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
        private async Task GetBglReadings(CancellationToken cancellationToken)
        {
            // Get the last BGL reading from each account ID, so we know when to start querying from
            _accountState = await GetAccountState();

            // Limit concurrent API requests
            _semaphore = new SemaphoreSlim(_pollerConfig.MaxConcurrentRequests, _pollerConfig.MaxConcurrentRequests);

            // Get all unique Dexcom logins
            IDictionary<string, DataSource> accounts = await GetDexcomAccounts();

            // Accumulate BGL query tasks
            List<Task> tasks = new();

            // Mark the service as healthy
            _healthService.RegisterBglQuery();

            if (accounts.Count == 0)
            {
                Log.Information("No accounts to query");
                return;
            }

            Log.Information($"Found {accounts.Count} accounts to query");

            Stopwatch stopwatch = new();
            stopwatch.Start();
            ITransaction queryRoundTransaction = _apmTracer.StartTransaction("Process Dexcom accounts", "Account loop");

            // For each account, find out its ID (if not cached) and poll for CGM data
            foreach (DataSource account in accounts.Values)
            {
                try
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

                    if (accountState.LastReceived.HasValue)
                    {
                        TimeSpan timeSinceLastReading = DateTime.UtcNow - accountState.LastReceived.Value;

                        // If we received a BGL reading recently, don't perform the query
                        if (timeSinceLastReading.TotalSeconds < _pollerConfig.BglAccountRefreshIntervalSeconds)
                        {
                            Log.Debug("Skipped account {LoginId} as BGL was received {Seconds} seconds ago", account.LoginId, timeSinceLastReading.TotalSeconds);
                            continue;
                        }
                    }

                    if (_accountLastQueried.TryGetValue(account.Id, out DateTime lastQueryTime))
                    {
                        TimeSpan timeSinceLastQuery = DateTime.Now - lastQueryTime;

                        if (accountState.LastReceived.HasValue)
                        {
                            // If no BGL reading has been received since 2 x refresh interval, query at a reduced rate
                            TimeSpan timeSinceLastReading = DateTime.UtcNow - accountState.LastReceived.Value;
                            if (timeSinceLastReading.TotalSeconds > 2 * _pollerConfig.BglAccountRefreshIntervalSeconds &&
                                timeSinceLastQuery.TotalSeconds < _pollerConfig.BglStaleAccountQueryFrequencySeconds)
                            {
                                Log.Debug("Skipped account {LoginId} as no BGL received since {LastReceived}", account.LoginId, accountState.LastReceived.Value);
                                continue;
                            }
                        }
                        else if (timeSinceLastQuery.TotalSeconds < _pollerConfig.BglStaleAccountQueryFrequencySeconds)
                        {
                            // No BGL ever received and we've already tried querying once
                            Log.Debug("Skipped account {LoginId} as no BGL received", account.LoginId);
                            continue;
                        }
                    }

                    ISpan accountQuerySpan = queryRoundTransaction.StartSpan("Query account BGL data", "Web service query");
                    accountQuerySpan.SetLabel("LoginId", account.LoginId);
                    accountQuerySpan.SetLabel("RegionId", account.RegionId);

                    tasks.Add(Task.Run(async () =>
                    {
                        // Record the fact we're performing a query so the service is recognised as healthy
                        _healthService.RegisterBglQuery();

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
                                ISpan elasticQuerySpan = accountQuerySpan.StartSpan("Index account BGL data", "Elasticsearch bulk query");
                                BulkResponse response = await _elasticClient.BulkAsync(b => b.CreateMany(readings), cancellationToken);

                                if (!response.Errors)
                                {
                                    await PutAccountState(accountState);
                                }
                                else
                                {
                                    Log.Warning("Errors occurred when indexing BGL readings for account {LoginId} in region {RegionId}. {ServerError}",
                                        account.LoginId, account.RegionId, response.ServerError);

                                    if (response.OriginalException != null)
                                    {
                                        accountQuerySpan.CaptureException(response.OriginalException);
                                    }
                                }

                                elasticQuerySpan.End();
                            }
                            catch (Exception ex)
                            {
                                Log.Error(ex, "Failed to post BGL readings for account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                                accountQuerySpan.CaptureException(ex);
                            }
                        }

                        accountQuerySpan.End();
                    }, cancellationToken));
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Unexpected error occurred when querying account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                }
                finally
                {
                    _semaphore.Release();
                }
            }

            try
            {
                Task.WaitAll(tasks.ToArray(), cancellationToken);

                stopwatch.Stop();
                Log.Information($"Spent {stopwatch.Elapsed.TotalSeconds:0.##} seconds querying {tasks.Count} accounts");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Unexpected error occurred when processing task queue");
            }
            finally
            {
                queryRoundTransaction.End();
            }
        }

        private async Task<IDictionary<string, AccountStateRecord>> GetAccountState()
        {
            ISearchResponse<AccountStateRecord> result = await _elasticClient.SearchAsync<AccountStateRecord>(s => s
                .Size(_pollerConfig.MaxAccountQuerySize)
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
            {
                return Enumerable.Empty<BglReading>();
            }

            if (!string.IsNullOrEmpty(account.Id))
            {
                // Mark the account as queried
                if (!_accountLastQueried.TryAdd(account.Id, DateTime.Now))
                {
                    _accountLastQueried[account.Id] = DateTime.Now;
                }

                int queryWindowMins = _pollerConfig.BglMaxWindowMinutes;
                int queryMaxCount = _pollerConfig.MaxAccountQuerySize;

                // Get the last sensor data timestamp
                DateTime? lastBglReading = accountState.LastReceived;
                if (lastBglReading.HasValue)
                {
                    Log.Debug("Last BGL reading for account {LoginId} in region {RegionId} was {Timestamp}", account.LoginId, account.RegionId, lastBglReading);

                    // Calculate how much data we need to query in order to get back up-to-date
                    queryWindowMins = (int)Math.Floor(DateTime.UtcNow.Subtract(lastBglReading.Value.AddSeconds(1)).TotalMinutes);
                    queryMaxCount = (int)Math.Floor(queryWindowMins / 5.0) + 1;
                }

                Log.Information("Querying BGL readings for account {Id} {LoginId} in region {RegionId}", account.Id, account.LoginId, account.RegionId);

                if (!string.IsNullOrEmpty(sessionId))
                {
                    ITransaction queryTransaction = _apmTracer.StartTransaction("Query Dexcom BGL data", "Web service query");
                    queryTransaction.SetLabel("AccountId", account.LoginId);
                    queryTransaction.SetLabel("RegionId", account.RegionId);

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
                        queryTransaction.CaptureError("Invalid Dexcom region", account.RegionId, new StackTrace().GetFrames());
                    }
                    catch (TaskCanceledException)
                    {
                        Log.Error("Timed out querying BGL sensor data for account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                        queryTransaction.CaptureError("Dexcom BGL data query timeout", $"{account.LoginId} ({account.RegionId})", new StackTrace().GetFrames());
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "BGL sensor data could not be collected for account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                        queryTransaction.CaptureException(ex);
                    }
                    finally
                    {
                        queryTransaction.End();
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
                .Size(_pollerConfig.MaxAccountQuerySize)
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
            ITransaction queryTransaction = _apmTracer.StartTransaction("Login Dexcom account", "Web service query");
            queryTransaction.SetLabel("AccountId", account.LoginId);
            queryTransaction.SetLabel("RegionId", account.RegionId);

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
                        queryTransaction.CaptureError("Unexpected Dexcom session ID", rawSessionId, new StackTrace().GetFrames());
                    }
                }
                else
                {
                    string content = await response.Content.ReadAsStringAsync();

                    if (response.StatusCode == HttpStatusCode.InternalServerError)
                    {
                        if (content != null && content.Contains("AccountPasswordInvalid") || content.Contains("Unauthorized"))
                        {
                            // Disable polling as the login attempt failed and we want to avoid locking the user's account
                            accountState.PollingEnabled = false;
                            await PutAccountState(accountState);
                            Log.Information("Polling disabled for account {LoginId} in region {RegionId} due to failed login", account.LoginId, account.RegionId);
                        }
                    }
                    
                    Log.Error("Failed to log on account {LoginId} in region {RegionId}. Status code: {StatusCode}. Content: {Content}",
                            account.LoginId, account.RegionId, response.StatusCode, content);
                    queryTransaction.CaptureError("Dexcom logon failure", $"{account.LoginId} ({account.RegionId})", new StackTrace().GetFrames());
                }
            }
            catch (InvalidRegionException ex)
            {
                Log.Error(ex, "Invalid region for {LoginId}", account.LoginId);
                queryTransaction.CaptureError("Invalid Dexcom region", account.RegionId, new StackTrace().GetFrames());

            }
            catch (TaskCanceledException)
            {
                Log.Error("Timed out attempting to log on account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                queryTransaction.CaptureError("Dexcom logon timeout", $"{account.LoginId} ({account.RegionId})", new StackTrace().GetFrames());
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to log on account {LoginId} in region {RegionId}", account.LoginId, account.RegionId);
                queryTransaction.CaptureException(ex);
            }
            finally
            {
                queryTransaction.End();
            }

            return null;
        }
    }
}
