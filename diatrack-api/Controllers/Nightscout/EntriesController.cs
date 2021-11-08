using Diatrack.Models;
using Diatrack.Models.Nightscout;
using Diatrack.Services;
using Microsoft.AspNetCore.Mvc;
using Nest;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Serilog;
using System;

namespace Diatrack.Controllers.Nightscout
{
    [Route("Nightscout")]
    [ApiController]
    public class EntriesController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IUserService _userService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EntriesController(ElasticDataProvider elasticService, IUserService userService, IHttpContextAccessor httpContextAccessor)
        {
            _elasticClient = elasticService.NestClient;
            _userService = userService;
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
                return Unauthorized("Token not provided");
            }

            try
            {
                // Find the first DataSource assigned the share token
                DataSource dataSource = await _userService.GetDataSourceByShareToken(token);

                // Retrieve the latest BGL readings associated with the DataSource matching the share token
                ISearchResponse<BglReading> response = await _elasticClient.SearchAsync<BglReading>(s => s
                    .Size(count)
                    .Query(q => q
                        .Term(t => t.AccountId, dataSource.Id)
                    )
                    .Sort(s => s.Descending(f => f.Timestamp))
                );

                if (response.IsValid)
                {
                    return Ok(response.Documents);
                }
                else
                {
                    return Problem();
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to retrieve BGL readings by share token");
                return NotFound();
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