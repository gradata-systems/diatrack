using Diatrack.Models;
using Diatrack.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<UserProfile> Get()
        {
            UserProfile user = await _userService.GetUser();

            // Sanitise, so the encrypted password, key and IV aren't sent to the client
            user.Sanitise();

            return user;
        }

        [HttpPost("IsNew")]
        public async Task<ActionResult<UserProfile>> SetIsNew(bool isNew)
        {
            UserProfile user = await _userService.GetUser();

            try
            {
                await _userService.UpdateIsNewStatus(user, isNew);
                return Ok(user);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "{UserId}", user.Id);
                return Problem();
            }
        }
    }
}
