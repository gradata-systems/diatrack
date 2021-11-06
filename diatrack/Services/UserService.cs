using Diatrack.Configuration;
using Diatrack.Models;
using Diatrack.Utilities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
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
    }

    public class UserService : IUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ElasticClient _elasticClient;
        private readonly DexcomConfiguration _dexConfig;

        private static readonly Regex _quotedPattern = new(@"^""(.*)""$", RegexOptions.Compiled);

        public UserService(IHttpContextAccessor httpContextAccessor, IHttpClientFactory httpClientFactory, ElasticDataProvider elasticProvider, IOptions<DexcomConfiguration> dexConfig)
        {
            _httpContextAccessor = httpContextAccessor;
            _httpClientFactory = httpClientFactory;
            _elasticClient = elasticProvider.NestClient;
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
                var principalClaims = identity.Claims.ToDictionary(c => c.Type);
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

                if (principalClaims.TryGetValue("name", out Claim nameClaim))
                {
                    userClaims.Name = nameClaim.Value;
                }
                if (principalClaims.TryGetValue("emails", out Claim emailClaim))
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
        /// Retrieves a user record from Elasticsearch based on the claims principal (ID).
        /// If not found, a record is created.
        /// </summary>
        public async Task<UserProfile> GetUser()
        {
            UserClaims userClaims = GetUserClaims();
            GetResponse<UserProfile> userResponse = (await _elasticClient.GetAsync<UserProfile>(userClaims.Id));
            UserProfile user;

            if (userResponse.Found)
            {
                user = userResponse.Source;
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
                    IsNew = true
                };

                await _elasticClient.IndexDocumentAsync(newUser);
                user = newUser;
            }

            return user;
        }

        /// <summary>
        /// Updates the `IsNew` status of the user
        /// </summary>
        public async Task<UserProfile> UpdateIsNewStatus(UserProfile user, bool isNew)
        {
            if (user.IsNew != isNew)
            {
                user.IsNew = isNew;
                UpdateResponse<UserProfile> response = await _elasticClient.UpdateAsync<UserProfile>(new DocumentPath<UserProfile>(user.Id), q => q.Doc(user).DocAsUpsert());

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
            UpdateResponse<UserProfile> response = await _elasticClient.UpdateAsync<UserProfile>(user.Id, u => u.DocAsUpsert().Doc(user));
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
            var result = await _elasticClient.UpdateAsync<UserProfile>(user.Id, u => u.DocAsUpsert().Doc(user));
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

            // Password is in plaintext, so encrypt it
            account.CryptoKey = Crypto.GenerateKey();
            account.CryptoIv = Crypto.GenerateIv();
            account.Password = Crypto.EncryptString(account.Password, account.CryptoKey, account.CryptoIv);

            // Not cached, so query the Dexcom API for the account ID
            HttpRequestMessage request = new(HttpMethod.Post, account.BuildRegionalUrl(_dexConfig.GetAccountEndpoint, _dexConfig.Regions));
            request.Content = JsonContent.Create(new
            {
                ApplicationId = _dexConfig.ApplicationId,
                AccountName = account.LoginId,
                Password = account.GetPlainTextPassword()
            });

            using (HttpClient httpClient = _httpClientFactory.CreateClient())
            {
                HttpResponseMessage response = await httpClient.SendAsync(request);

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
        }

        /// <summary>
        /// Update the preferences for the logged-in user
        /// </summary>
        public async Task<UserProfile> UpdatePreferences(UserPreferences prefs)
        {
            UserProfile user = await GetUser();

            user.Preferences = prefs;

            var result = await _elasticClient.UpdateAsync(new DocumentPath<UserProfile>(user.Id), u => u.DocAsUpsert().Doc(user));
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
}
