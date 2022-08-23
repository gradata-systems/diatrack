using Diatrack.Services;
using DiatrackPoller.Services;
using Microsoft.AspNetCore.Mvc;
using Nest;
using System.Threading.Tasks;

namespace DiatrackPoller.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class HealthCheckController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IHealthService _healthService;

        public HealthCheckController(ElasticDataProvider elasticProvider, IHealthService healthService)
        {
            _elasticClient = elasticProvider.NestClient;
            _healthService = healthService;
        }

        [HttpGet]
        public async Task<IActionResult> HealthCheck()
        {
            PingResponse response = await _elasticClient.PingAsync();
            
            if (response.IsValid && _healthService.IsHealthy())
            {
                return Ok();
            }
            else
            {
                return Problem(response.OriginalException?.Message);
            }
        }
    }
}
