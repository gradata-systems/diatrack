using Diatrack.Models;
using Diatrack.Utilities;
using Microsoft.AspNetCore.Http;
using Nest;
using Serilog;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Diatrack.Services
{
    public interface IUserService
    {
        public UserClaims GetUserClaims();
        public Task<User> GetUser();
    }

    public class UserService : IUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ElasticClient _elasticClient;

        public UserService(IHttpContextAccessor httpContextAccessor, ElasticDataProvider elasticProvider)
        {
            _httpContextAccessor = httpContextAccessor;
            _elasticClient = elasticProvider.NestClient;
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
    }

    public class UserClaims
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string EmailAddress { get; set; }
    }
}
