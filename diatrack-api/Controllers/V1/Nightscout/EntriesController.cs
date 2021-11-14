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
using System.Linq;
using Microsoft.Extensions.Primitives;
using System.Text.RegularExpressions;
using System.Text;
using Diatrack.Utilities;

namespace Diatrack.Controllers.V1.Nightscout
{
    [Route("Nightscout")]
    [Route("")]
    [ApiVersion("1.0")]
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
        [HttpGet("v{version:apiVersion}/entries.json")]
        public async Task<ActionResult<IEnumerable<Entry>>> GetEntries([FromQuery(Name = "token")] string plainTextToken, [FromQuery] int count = 1)
        {
            string token;

            // First try and get the token from the query string
            if (!string.IsNullOrEmpty(plainTextToken))
            {
                // If the token is provided via query string parameter, assume it is the plaintext, unhashed version (i.e. Sugarmate).
                // It therefore needs to be hashed before lookup.
                token = Crypto.Sha1Hash(plainTextToken);
            }
            else
            {
                IHeaderDictionary headers = _httpContextAccessor.HttpContext.Request.Headers;

                if (headers.TryGetValue("Authorization", out StringValues authHeader))
                {
                    // Plain-text token passed in `Authorization` header
                    Match basicAuthMatch = Regex.Match(authHeader.First(), "^Basic (.+)$");
                    if (basicAuthMatch.Success)
                    {
                        token = Crypto.Sha1Hash(Encoding.UTF8.GetString(Convert.FromBase64String(basicAuthMatch.Groups[1].Value)).TrimEnd(':'));
                    }
                    else
                    {
                        Log.Warning("Invalid token {Token} provided in Authorization header {Headers}", authHeader.First(), _httpContextAccessor.HttpContext.Request.Headers);
                        return Unauthorized("Invalid authentication header");
                    }
                }
                else if (headers.TryGetValue("api-secret", out StringValues apiSecretHeader))
                {
                    // SHA-1 hashed token provided in `api-secret` header (such as by xDrip)
                    token = apiSecretHeader.First();
                }
                else
                {
                    Log.Warning("No token provided {Headers}", _httpContextAccessor.HttpContext.Request.Headers);
                    return Unauthorized("Token not provided");
                }
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
                    return Ok(response.Documents.Select(d => new Entry(d)));
                }
                else
                {
                    Log.Error("Query error occurred when searching BGL readings by token {Token}", token);
                    return Problem();
                }
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Failed to retrieve BGL readings by share token");
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Get server status by checking whether the Elasticsearch connection is OK
        /// </summary>
        [HttpGet("v{version:apiVersion}/status.json")]
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
                    Version = "1",
                    Settings = new
                    { }
                });
            }
            else
            {
                return Problem("Data source not available");
            }
        }
    }
}