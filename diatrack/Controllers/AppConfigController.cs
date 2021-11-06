using Diatrack.Configuration;
using Diatrack.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Diatrack.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AppConfigController : Controller
    {
        private readonly AzureAdB2CConfiguration _azureConfig;
        private readonly AppConfiguration _appConfig;

        public AppConfigController(IOptions<AzureAdB2CConfiguration> azureConfig, IOptions<AppConfiguration> appConfig)
        {
            _azureConfig = azureConfig.Value;
            _appConfig = appConfig.Value;
        }

        [HttpGet]
        public AppConfig Get()
        {
            return new AppConfig
            {
                ClientId = _azureConfig.ClientId,
                Authority = $"{_azureConfig.Instance}/{_azureConfig.Domain}",
                RedirectUri = _appConfig.RedirectUri,
                Scopes = _appConfig.Scopes
            };
        }
    }
}
