using Diatrack.Models;
using Diatrack.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Diatrack.Controllers.V1
{
    [Authorize]
    [Route("User/Preferences")]
    [ApiVersion("1.0")]
    [ApiController]
    public class UserPreferencesController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserPreferencesController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPost]
        public async Task<ActionResult<UserPreferences>> UpdatePreferences([FromBody] UserPreferences preferences)
        {
            try
            {
                UserProfile user = await _userService.UpdatePreferences(preferences);
                return Ok(user.Preferences);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to update user preferences");
                return Problem(ex.Message);
            }
        }
    }
}
