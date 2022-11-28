using Diatrack.Configuration;
using Diatrack.Models;
using Diatrack.Utilities;
using Elasticsearch.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Nest;
using Serilog;
using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Diatrack.Services
{
    public interface IUserService
    {
        public UserClaims GetUserClaims();
        public Task<UserProfile> GetUser();
        public Task<string[]> GetLinkedAccountIds();
        public Task<UserProfile> UpdateIsNewStatus(UserProfile user, bool isNew);
        public Task<string> AddDexcomAccount(DataSource account);
        public Task RemoveDexcomAccount(DataSource account);
        public Task<UserProfile> UpdatePreferences(UserPreferences preferences);
        public Task<string> GenerateShareToken(string accountId);
        public Task<DataSource> GetDataSourceByShareToken(string token);
    }

    public class UserService : IUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly HttpClient _httpClient;
        private readonly ElasticClient _elasticClient;
        private readonly AppConfiguration _appConfig;
        private readonly DexcomConfiguration _dexConfig;

        private static readonly Regex _quotedPattern = new(@"^""(.*)""$", RegexOptions.Compiled);

        public UserService(IHttpContextAccessor httpContextAccessor, HttpClient httpClient, ElasticDataProvider elasticProvider, IOptions<AppConfiguration> appConfig, IOptions<DexcomConfiguration> dexConfig)
        {
            _httpContextAccessor = httpContextAccessor;
            _httpClient = httpClient;
            _elasticClient = elasticProvider.NestClient;
            _appConfig = appConfig.Value;
            _dexConfig = dexConfig.Value;
        }

        /// <summary>
        /// Get the claims of the authenticated user
        /// </summary>
        public UserClaims GetUserClaims()
        {
            HttpContext httpContext = _httpContextAccessor.HttpContext;
            System.Security.Claims.ClaimsIdentity identity = new(httpContext.User.Identity);

            if (identity.IsAuthenticated)
            {
                var principalClaims = identity.Claims.DistinctBy(k => k.Type).ToDictionary(c => c.Type);
                UserClaims userClaims = new();

                // Unique ID of the principal
                if (principalClaims.TryGetValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", out Claim idClaim))
                {
                    userClaims.Id = idClaim.Value;
                }
                else
                {
                    Log.Error("Principal id not found in claims token");
                }

                if (principalClaims.TryGetValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", out Claim nameClaim))
                {
                    userClaims.Name = nameClaim.Value;
                }
                if (principalClaims.TryGetValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", out Claim emailClaim))
                {
                    userClaims.EmailAddress = emailClaim.Value;
                }

                return userClaims;
            }
            else
            {
                return null;
            }
        }

        /// <summary>
        /// Retrieves a user record from Elasticsearch by the email address in the claim.
        /// If not found, a record is created.
        /// </summary>
        public async Task<UserProfile> GetUser()
        {
            UserClaims userClaims = GetUserClaims();

            if (userClaims == null)
            {
                throw new ArgumentNullException("No user claim specified");
            }
            else if (string.IsNullOrEmpty(userClaims.EmailAddress))
            {
                throw new ArgumentNullException($"Missing email address claim for user ID: {userClaims.Id}");
            }

            ISearchResponse<UserProfile> userResponse = await _elasticClient.SearchAsync<UserProfile>(s => s
                .Query(q => q
                    .Term(f => f.EmailAddress, userClaims.EmailAddress)
                )
                .Sort(f => f.Descending(f => f.Created))
            );

            if (userResponse.IsValid && userResponse.Hits.Count > 0)
            {
                IHit<UserProfile> firstHit = userResponse.Hits.First();
                if (firstHit.Id != userClaims.Id)
                {
                    // Doc ID differs to claims ID, so user record has changed. Reinsert it as a new document.
                    string originalId = firstHit.Source.Id;
                    firstHit.Source.Id = userClaims.Id;
                    firstHit.Source.Name = userClaims.Name;

                    IndexResponse indexResponse = await _elasticClient.IndexDocumentAsync(firstHit.Source);
                    if (indexResponse.IsValid)
                    {
                        Log.Information("Migrated user profile {EmailAddress} from id {OriginalId} to {NewId}", userClaims.EmailAddress, originalId, userClaims.Id);

                        // Delete all documents matching the email by not the ID, as they are obsolete
                        DeleteByQueryResponse deleteResponse = await _elasticClient.DeleteByQueryAsync<UserProfile>(d => d
                            .Query(q => q
                                .Bool(b => b
                                    .Must(must => must
                                        .Term(t => t.EmailAddress, userClaims.EmailAddress)
                                    )
                                    .MustNot(mustNot => mustNot
                                        .Ids(i => i.Values(userClaims.Id))
                                    )
                                )
                            )
                        );

                        if (deleteResponse.Deleted > 0)
                        {
                            Log.Information("Deleted {DeletedItems} obsolete user profile entries", deleteResponse.Deleted);
                        }
                    }
                    else
                    {
                        throw new Exception("Failed to insert user record", indexResponse.OriginalException);
                    }
                }

                return firstHit.Source;
            }
            else
            {
                // Register the user against the claims principal
                UserProfile newUser = new()
                {
                    Id = userClaims.Id,
                    Name = userClaims.Name,
                    EmailAddress = userClaims.EmailAddress,
                    Created = DateTime.Now,
                    LastActive = DateTime.Now,
                    IsNew = true
                };

                await _elasticClient.IndexDocumentAsync(newUser);
                return newUser;
            }
        }

        /// <summary>
        /// Updates the `IsNew` status of the user
        /// </summary>
        public async Task<UserProfile> UpdateIsNewStatus(UserProfile user, bool isNew)
        {
            if (user.IsNew != isNew)
            {
                user.IsNew = isNew;
                UpdateResponse<UserProfile> response = await _elasticClient.UpdateAsync(new DocumentPath<UserProfile>(user.Id), q => q.Doc(user).DocAsUpsert());

                if (response.IsValid)
                {
                    return user;
                }
                else
                {
                    throw new Exception($"Failed to update `IsNew` status");
                }
            }
            else
            {
                return user;
            }
        }

        /// <summary>
        /// Authenticate a Dexcom account using the credentials specified by the user.
        /// If successful, link the account to the user's profile.
        /// </summary>
        public async Task<string> AddDexcomAccount(DataSource account)
        {
            // Password is in plaintext, so encrypt it
            await account.SetPasswordFromPlainText(account.Password, _appConfig);

            UserProfile user = await GetUser();
            string accountId = await GetDexcomAccountId(account);

            // Check whether the account ID has already been registered against the user
            if (user.DataSources.Any(a => a.Id == accountId))
            {
                throw new AccountAlreadyExistsException();
            }
            else
            {
                user.DataSources = user.DataSources.Append(account).ToArray();
            }

            // Replace the user's Elasticsearch record
            UpdateResponse<UserProfile> response = await _elasticClient.UpdateAsync<UserProfile>(user.Id, u => u.Doc(user).DocAsUpsert().Refresh(Refresh.WaitFor));
            if (response.IsValid)
            {
                return account.Id;
            }
            else
            {
                throw new Exception($"Error occurred when updating the user record");
            }
        }

        /// <summary>
        /// Remove any Dexcom accounts for the logged-in user matching the `LoginId` and `RegionId` of the specified account
        /// </summary>
        public async Task RemoveDexcomAccount(DataSource account)
        {
            UserProfile user = await GetUser();

            if (!user.DataSources.Any(a => a.LoginId == account.LoginId && a.RegionId == account.RegionId))
                throw new AccountNotFoundException();

            user.DataSources = user.DataSources.Where(a =>
                a.LoginId != account.LoginId ||
                a.RegionId != account.RegionId
            ).ToArray();

            // Replace the user's Elasticsearch record
            var result = await _elasticClient.UpdateAsync<UserProfile>(user.Id, u => u.Doc(user).DocAsUpsert().Refresh(Refresh.WaitFor));
            if (result.Result == Result.Error)
            {
                throw new Exception($"Error occurred when updating the user record");
            }
        }

        private async Task<string> GetDexcomAccountId(DataSource account)
        {
            // If account ID has already been obtained, return straight away
            if (!string.IsNullOrEmpty(account.Id))
                return account.Id;

            string plainTextPassword = await account.GetPlainTextPassword(_appConfig);

            // Not cached, so query the Dexcom API for the account ID
            HttpRequestMessage request = new(System.Net.Http.HttpMethod.Post, account.BuildRegionalUrl(_dexConfig.GetAccountEndpoint, _dexConfig.Regions));
            request.Content = JsonContent.Create(new
            {
                ApplicationId = _dexConfig.ApplicationId,
                AccountName = account.LoginId,
                Password = plainTextPassword
            });

            HttpResponseMessage response = await _httpClient.SendAsync(request);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string rawAccountId = await response.Content.ReadAsStringAsync();
                Match accountIdMatch = _quotedPattern.Match(rawAccountId);

                if (accountIdMatch.Success)
                {
                    string accountId = accountIdMatch.Groups[1].Value;
                    if (accountId != "00000000-0000-0000-0000-000000000000")
                    {
                        account.Id = accountIdMatch.Groups[1].Value;
                        return account.Id;
                    }
                }

                throw new Exception($"Unexpected account ID {rawAccountId} returned");
            }
            else
            {
                throw new Exception($"Failed to query the account ID for {account.LoginId} in region {account.RegionId}");
            }
        }

        /// <summary>
        /// Update the preferences for the logged-in user
        /// </summary>
        public async Task<UserProfile> UpdatePreferences(UserPreferences prefs)
        {
            UserProfile user = await GetUser();

            user.Preferences = prefs;

            var result = await _elasticClient.UpdateAsync(new DocumentPath<UserProfile>(user.Id), u => u.Doc(user).DocAsUpsert().Refresh(Refresh.WaitFor));
            if (result.Result == Result.Error)
            {
                throw new Exception($"Error occurred when updating user preferences for user {user.Id}");
            }

            // Return the full, patched User document
            return await GetUser();
        }

        /// <summary>
        /// Retrieve the IDs of each of the accounts registered to the logged-in user
        /// </summary>
        public async Task<string[]> GetLinkedAccountIds()
        {
            return (await GetUser()).DataSources.Select(d => d.Id).Distinct().ToArray();
        }

        /// <summary>
        /// Create and assign a new token to the data source matching the specified account ID,
        /// belonging to the signed-in user.
        /// 
        /// If a token is already assigned, it is replaced.
        /// </summary>
        public async Task<string> GenerateShareToken(string accountId)
        {
            UserProfile user = await GetUser();
            DataSource dataSource = user.DataSources.FirstOrDefault(d => d.Id == accountId);

            if (dataSource == null)
            {
                throw new AccountNotFoundException();
            }

            // Generate a random, URL-safe base-64 string
            string shareToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                .Replace('+', '-')
                .Replace('/', '_')
                .Replace("=", "");

            // Hash the token and persist the hash
            string hashedToken = Crypto.Sha1Hash(shareToken);
            dataSource.ShareToken = hashedToken;

            UpdateResponse<UserProfile> result = await _elasticClient.UpdateAsync(new DocumentPath<UserProfile>(user.Id), u => u
                .Doc(user)
                .DocAsUpsert()
                .Refresh(Refresh.WaitFor)
            );

            if (result.IsValid)
            {
                Log.Information("Generated share token for {UserId}, datasource {LoginId} in region {RegionId}", user.Id, dataSource.LoginId, dataSource.RegionId);
                return shareToken;
            }
            else
            {
                throw new Exception("Share token could not be generated");
            }
        }

        /// <summary>
        /// Find the first user profile containing a data source with the specified share token
        /// </summary>
        public async Task<DataSource> GetDataSourceByShareToken(string token)
        {
            // Get the first data source that matches the provided token
            ISearchResponse<UserProfile> userProfileResponse = await _elasticClient.SearchAsync<UserProfile>(s => s
                .Size(1)
                .Query(q => q
                    .Term(new Field("dataSource.shareToken"), token)
                )
            );

            if (!userProfileResponse.IsValid || userProfileResponse.Documents.Count == 0)
            {
                Log.Error("Token {Token} could not be matched against any data sources", token, userProfileResponse);
                throw new InvalidTokenException();
            }

            // Get the first DataSource that matches the provided token
            return userProfileResponse.Documents.First().DataSources.First(ds => ds.ShareToken == token);
        }
    }

    public class UserClaims
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string EmailAddress { get; set; }
    }

    public class AccountAlreadyExistsException : Exception
    { }

    public class AccountNotFoundException : Exception
    { }

    public class InvalidTokenException : Exception
    { }
}