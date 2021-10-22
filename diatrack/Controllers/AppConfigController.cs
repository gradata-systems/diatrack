using Diatrack.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Diatrack.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AppConfigController : Controller
    {
        private readonly DexcomConfiguration _dexcomConfig;

        public AppConfigController(IOptions<DexcomConfiguration> dexcomConfig)
        {
            _dexcomConfig = dexcomConfig.Value;
        }

        [HttpGet]
        public object Get()
        {
            return new
            {
                Dexcom = new
                {
                    ApplicationId = _dexcomConfig.ApplicationId
                }
            };
        }
    }
}
