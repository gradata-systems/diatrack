using Diatrack.Models;
using Diatrack.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nest;
using Serilog;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Diatrack.Controllers
{
    [Authorize]
    [Route("User/[controller]")]
    [ApiController]
    public class DataSourceController : ControllerBase
    {
        private readonly IUserService _userService;

        public DataSourceController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Register a Dexcom account against the user's profile
        /// </summary>
        [HttpPut]
        public async Task<IActionResult> AddDexcomAccount([FromBody] DataSource dataSource)
        {
            try
            {
                await _userService.AddDexcomAccount(dataSource);
                return Ok();
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to link the Dexcom account ID for {LoginId} in region {RegionId}", dataSource.LoginId, dataSource.RegionId);
                return Problem($"Dexcom account could not be added. {ex.Message}");
            }
        }

        /// <summary>
        /// Removes a Dexcom account from the logged-in user's profile
        /// </summary>
        [HttpDelete]
        public async Task<IActionResult> RemoveDexcomAccount([FromBody] DataSource dataSource)
        {
            try
            {
                await _userService.RemoveDexcomAccount(dataSource);
                return Ok();
            }
            catch (AccountNotFoundException ex)
            {
                Log.Error(ex, "Account {LoginId} in region {RegionId} does not exist", dataSource.LoginId, dataSource.RegionId);
                return NotFound($"Dexcom account not found");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to remove the account for {LoginId} in region {RegionId}", dataSource.LoginId, dataSource.RegionId);
                return Problem($"Dexcom account could not be removed. {ex.Message}");
            }
        }

        /// <summary>
        /// Generate a token for sharing this data source with another service.
        /// If a token already exists, it is replaced with this one.
        /// </summary>
        /// <param name="accountId"></param>
        /// <returns></returns>
        [HttpGet("{accountId}/shareToken")]
        public async Task<ActionResult<string>> GenerateShareToken([FromRoute] string accountId)
        {
            try
            {
                string shareToken = await _userService.GenerateShareToken(accountId);
                return Ok(shareToken);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Share token could not be generated for account {AccountId}", accountId);
                return Problem($"Share token could not be generated. {ex.Message}");
            }
        }
    }
}
