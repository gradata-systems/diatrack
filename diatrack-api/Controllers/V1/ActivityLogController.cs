using Diatrack.Models;
using Diatrack.Services;
using Elasticsearch.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Diatrack.Controllers.V1
{
    [Authorize]
    [Route("[controller]")]
    [ApiVersion("1.0")]
    [ApiController]
    public class ActivityLogController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IUserService _userService;

        public ActivityLogController(ElasticDataProvider elasticProvider, IUserService userService)
        {
            _elasticClient = elasticProvider.NestClient;
            _userService = userService;
        }

        [HttpPost("Search")]
        public async Task<ActionResult<IEnumerable<ActivityLogEntry>>> GetEntries([FromBody] ActivityLogQueryParams queryParams)
        {
            UserProfile user = await _userService.GetUser();
            string[] accountIds = await _userService.GetLinkedAccountIds();

            try
            {
                ISearchResponse<ActivityLogEntry> response = (await _elasticClient.SearchAsync<ActivityLogEntry>(s => s
                    .Size(queryParams.Size)
                    .Query(q => q
                        .Bool(b => b
                            .Must(
                                mu => mu
                                    .Terms(t => t
                                        .Field(f => f.AccountId)
                                        .Terms(accountIds)
                                    ),
                                mu2 => mu2
                                    .DateRange(dr => dr
                                        .Field(f => f.Created)
                                        .GreaterThanOrEquals(queryParams.FromDate ?? DateTime.MinValue)
                                        .LessThanOrEquals(queryParams.ToDate ?? DateTime.UtcNow)
                                    )
                            )
                        )
                    )
                    .Sort(s => s
                        .Field(f => f.Created, SortOrder.Descending)
                    )
                ));

                return Ok(response.Hits.Select(hit =>
                {
                    hit.Source.Id = hit.Id;
                    return hit.Source;
                }));
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to query activity log entries for {UserId}", user.Id);
                return Problem($"Error occurred when querying log entries. {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ActivityLogEntry>> GetEntry(string id)
        {
            // Get the log entry
            GetResponse<ActivityLogEntry> result = await _elasticClient.GetAsync(new DocumentPath<ActivityLogEntry>(id));
            if (result.Found)
            {
                ActivityLogEntry entry = result.Source;
                entry.Id = id;

                // Ensure the account is registered to the user
                string[] accountIds = await _userService.GetLinkedAccountIds();
                if (!accountIds.Contains(entry.AccountId))
                {
                    return BadRequest("Invalid account ID");
                }

                return Ok(entry);
            }
            else
            {
                return NotFound();
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddEntry([FromBody] ActivityLogEntryParams entryParams)
        {
            // Ensure the account is registered to the user
            string[] accountIds = await _userService.GetLinkedAccountIds();
            if (!accountIds.Contains(entryParams.AccountId))
            {
                return BadRequest("Invalid account ID");
            }

            ActivityLogEntry entry = new (entryParams)
            {
                Created = entryParams.AtTime ?? DateTime.UtcNow,
                CreatedBy = await _userService.GetUser()
            };

            IndexResponse response = (await _elasticClient.IndexAsync(entry, r => r.Refresh(Refresh.WaitFor)));
            if (response.IsValid)
            {
                return Ok();
            }
            else
            {
                return Problem();
            }
        }

        [HttpPost("{id}")]
        public async Task<IActionResult> UpdateEntry(string id, [FromBody] ActivityLogEntryParams entry)
        {
            // Get the actual document
            GetResponse<ActivityLogEntry> existingEntryResponse = await _elasticClient.GetAsync<ActivityLogEntry>(new GetRequest<ActivityLogEntry>(id));
            if (existingEntryResponse.Found)
            {
                ActivityLogEntry existingEntry = existingEntryResponse.Source;

                // Ensure the account is registered to the user
                string[] accountIds = await _userService.GetLinkedAccountIds();
                if (!accountIds.Contains(existingEntry.AccountId) || !accountIds.Contains(entry.AccountId))
                {
                    return BadRequest();
                }

                // Update log entry properties

                existingEntry.AccountId = entry.AccountId;
                existingEntry.Category = entry.Category;
                existingEntry.Properties = entry.Properties;
                existingEntry.Notes = entry.Notes;

                UpdateResponse<ActivityLogEntry> response = await _elasticClient.UpdateAsync(new DocumentPath<ActivityLogEntry>(id), d => d
                    .Doc(existingEntry)
                    .Refresh(Refresh.WaitFor)
                );

                if (response.IsValid)
                {
                    return Ok();
                }
                else
                {
                    return Problem();
                }
            }
            else
            {
                return NotFound();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEntry(string id)
        {
            // Get the actual document
            GetResponse<ActivityLogEntry> existingEntryResponse = await _elasticClient.GetAsync<ActivityLogEntry>(new GetRequest<ActivityLogEntry>(id));
            if (existingEntryResponse.Found)
            {
                ActivityLogEntry existingEntry = existingEntryResponse.Source;

                // Ensure the account is registered to the user
                string[] accountIds = await _userService.GetLinkedAccountIds();
                if (!accountIds.Contains(existingEntry.AccountId))
                {
                    return BadRequest();
                }

                DeleteResponse response = await _elasticClient.DeleteAsync(new DocumentPath<ActivityLogEntry>(id), d => d.Refresh(Refresh.WaitFor));
                if (response.IsValid)
                {
                    return Ok();
                }
                else
                {
                    return Problem();
                }
            }
            else
            {
                return NotFound();
            }
        }
    }

    public class ActivityLogQueryParams
    {
        public int Size { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }
    }
}
