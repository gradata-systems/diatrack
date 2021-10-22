using Diatrack.Configuration;
using Diatrack.Models;
using Diatrack.Utilities;
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
        public Task<User> GetUser();
        public Task<string> GetAccountId(DexcomAccount account);
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
            ClaimsIdentity identity = new(httpContext.User.Identity);

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
        /// Retrieves the user's profile
        /// </summary>
        /// <returns></returns>
        public async Task<User> GetUser()
        {
            UserClaims userClaims = GetUserClaims();
            GetResponse<User> userResponse = (await _elasticClient.GetAsync<User>(userClaims.Id));
            User user;

            if (userResponse.Found)
            {
                user = userResponse.Source;
            }
            else
            {
                // Register the user against the claims principal
                User newUser = new()
                {
                    Id = userClaims.Id,
                    Name = userClaims.Name,
                    EmailAddress = userClaims.EmailAddress,
                    Created = DateTime.Now
                };

                await _elasticClient.IndexDocumentAsync(newUser);
                user = newUser;
            }

            return user;
        }

        /// <summary>
        /// Retrieve the account ID for a given user's linked Dexcom account
        /// </summary>
        public async Task<string> GetAccountId(DexcomAccount account)
        {
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
                        return accountIdMatch.Groups[1].Value;
                    }
                    else
                    {
                        throw new Exception($"Unexpected account ID {rawAccountId} returned");
                    }
                }
                else
                {
                    throw new Exception($"Status code: {response.StatusCode}. Reason: {response.ReasonPhrase}");
                }
            }
        }
    }

    public class UserClaims
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string EmailAddress { get; set; }
    }
}
