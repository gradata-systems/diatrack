using Diatrack.Models;
using Diatrack.Models.Nightscout;
using Diatrack.Services;
using Microsoft.AspNetCore.Mvc;
using Nest;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Serilog;

namespace Diatrack.Controllers.Nightscout
{
    [Route("Nightscout")]
    [ApiController]
    public class EntriesController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EntriesController(ElasticDataProvider elasticService, IHttpContextAccessor httpContextAccessor)
        {
            _elasticClient = elasticService.NestClient;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Get BGL readings in a Nightscout compatible format
        /// </summary>
        /// <returns></returns>
        [HttpGet("v1/entries.json")]
        public async Task<ActionResult<IEnumerable<Entry>>> GetEntries([FromQuery] string token, [FromQuery] int count)
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest("Token not provided");
            }

            ISearchResponse<BglReading> response = await _elasticClient.SearchAsync<BglReading>(s => s
                .Size(count)
                .Query(q => q
                    .MatchAll()
                )
                .Sort(s => s.Descending(f => f.Timestamp))
            );

            if (response.IsValid)
            {
                return Ok(response.Documents.Select(d => new Entry(d)));
            }
            else
            {
                return Problem(response.OriginalException?.ToString());
            }
        }

        /// <summary>
        /// Get server status by checking whether the Elasticsearch connection is OK
        /// </summary>
        [HttpGet("v1/status.json")]
        public async Task<ActionResult<ServerStatus>> GetStatus()
        {
            var response = await _elasticClient.PingAsync();
            if (response.IsValid)
            {
                return Ok(new ServerStatus
                {
                    ApiEnabled = true,
                    CarePortalEnabled = false,
                    Head = "",
                    Name = "Diatrack",
                    Version = "1"
                });
            }
            else
            {
                return Problem("Data source not available");
            }
        }
    }
}
