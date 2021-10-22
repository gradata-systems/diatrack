using Diatrack.Models;
using Diatrack.Services;
using Diatrack.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nest;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Diatrack.Controllers
{
    [Authorize]
    [Route("[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IUserService _userService;

        public UserController(ElasticDataProvider elasticProvider, IUserService userService)
        {
            _elasticClient = elasticProvider.NestClient;
            _userService = userService;
        }

        [HttpGet]
        public async Task<User> Get()
        {
            User user = await _userService.GetUser();

            // Sanitise, so the encrypted password, key and IV aren't sent to the client
            user.Sanitise();

            return user;
        }

        /// <summary>
        /// Update details of the user's Dexcom account
        /// </summary>
        /// <param name="account"></param>
        /// <returns>Result of the update operation</returns>
        [HttpPut("dexcomAccount")]
        public async Task<IActionResult> UpdateDexcomAccount([FromBody] DexcomAccount account)
        {
            User user = await _userService.GetUser();

            // Password is in plaintext, so encrypt it
            account.CryptoKey = Crypto.GenerateKey();
            account.CryptoIv = Crypto.GenerateIv();
            account.Password = Crypto.EncryptString(account.Password, account.CryptoKey, account.CryptoIv);

            try
            {
                // Query the account ID
                account.Id = await _userService.GetAccountId(account);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to query the account ID for {LoginId} in region {RegionId}", account.LoginId, account.RegionId);

                return Problem("Dexcom account ID could not be retrieved");
            }

            object partialUser = new
            {
                dexcomAccount = account
            };

            var result = await _elasticClient.UpdateAsync<User, object>(new DocumentPath<User>(user.Id), u => u.Doc(partialUser));
            if (result.Result == Result.Updated)
            {
                return Ok();
            }
            else
            {
                return BadRequest(result.Result);
            }
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] UserPreferences prefs)
        {
            User user = await _userService.GetUser();

            object partialUser = new
            {
                preferences = prefs
            };

            var result = await _elasticClient.UpdateAsync<User, object>(new DocumentPath<User>(user.Id), u => u.Doc(partialUser));
            if (result.Result == Result.Updated)
            {
                return Ok();
            }
            else
            {
                return BadRequest(result.Result);
            }
        }
    }
}
