using Diatrack.Services;
using Microsoft.AspNetCore.Mvc;
using Nest;
using System.Threading.Tasks;

namespace Diatrack.Controllers.V1
{
    [Route("[controller]")]
    [ApiController]
    public class HealthcheckController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;

        public HealthcheckController(ElasticDataProvider elasticProvider)
        {
            _elasticClient = elasticProvider.NestClient;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            PingResponse response = await _elasticClient.PingAsync();
            if (response.IsValid)
            {
                return Ok();
            }
            else
            {
                return Problem(response.OriginalException.Message);
            }
        }
    }
}
