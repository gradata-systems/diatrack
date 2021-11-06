using Diatrack.Models;
using Diatrack.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Diatrack.Controllers
{
    [Authorize]
    [Route("Bgl")]
    [ApiController]
    public class BglDataController : ControllerBase
    {
        private readonly ElasticClient _elasticClient;
        private readonly IUserService _userService;

        public BglDataController(ElasticDataProvider elasticProvider, IUserService userService)
        {
            _elasticClient = elasticProvider.NestClient;
            _userService = userService;
        }

        /// <summary>
        /// For each account ID associated with the logged-in user, get the most recent BGL readings
        /// </summary>
        /// <param name="size">Number of BGL readings to retrieve per account</param>
        [HttpGet]
        public async Task<ActionResult<IDictionary<string, IEnumerable<BglReading>>>> GetLatestReadings([FromQuery] int size = 5)
        {
            // TODO: Add configurable cap on `size` parameter

            try
            {
                string[] accountIds = await _userService.GetLinkedAccountIds();
                if (accountIds.Length == 0)
                {
                    return Problem("No accounts registered");
                }

                ISearchResponse<BglReading> response = await _elasticClient.SearchAsync<BglReading>(r => r
                    .Size(0)
                    .Query(q => q
                        .Terms(t => t
                            .Field(f => f.AccountId)
                            .Terms(accountIds)
                        )
                    )
                    .Aggregations(agg => agg
                        .Terms("account", t => t
                            .Field(f => f.AccountId)
                            .Size(accountIds.Length)
                            .Aggregations(agg2 => agg2
                                .TopHits("top_hits", th => th
                                    .Size(size)
                                    .Sort(s => s
                                        .Descending(f => f.Timestamp)
                                    )
                                )
                            )
                        )
                    )
                );

                if (!response.IsValid)
                {
                    return Problem(response.OriginalException?.Message);
                }

                Dictionary<string, IEnumerable<BglReading>> accountReadings = new();

                foreach (KeyedBucket<string> accountBucket in response.Aggregations.Terms("account").Buckets)
                {
                    accountReadings.Add(accountBucket.Key, accountBucket.TopHits("top_hits").Documents<BglReading>());
                }

                return Ok(accountReadings);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to perform latest BGL aggregate query");

                return BadRequest();
            }
        }
        
        /// <summary>
        /// For each account ID associated with the logged-in user, get a date histogram of statistics
        /// </summary>
        [HttpPost("AccountStatsHistogram")]
        public async Task<ActionResult<Dictionary<string, BglAccountStats>>> GetBglReadingsForPeriod([FromBody] GetBglForPeriodParams period)
        {
            try
            {
                // Get the account IDs registered to the logged-in user
                string[] accountIds = await _userService.GetLinkedAccountIds();

                if (accountIds.Length == 0)
                {
                    return BadRequest();
                }

                ISearchResponse<BglReading> response = await _elasticClient.SearchAsync<BglReading>(r => r
                    .Size(0)
                    .Query(q => q
                        .Bool(b => b
                            .Must(
                                mu1 => mu1.DateRange(d => d
                                    .Field(f => f.Timestamp)
                                    .GreaterThanOrEquals(period.Start)
                                    .LessThanOrEquals(period.End)
                                ),
                                mu2 => mu2.Terms(t => t
                                    .Field(f => f.AccountId)
                                    .Terms(accountIds)
                                )
                            )
                        )
                    )
                    // Bucket by `AccountId` then by BGL timestamp
                    .Aggregations(agg => agg
                        .Terms("account", t => t
                            .Field(f => f.AccountId)
                            .Size(accountIds.Length)
                            .Aggregations(agg2 => agg2
                                .AutoDateHistogram("date", adh => adh
                                    .Field(f => f.Timestamp)
                                    .Buckets(period.Buckets)
                                    .Aggregations(agg3 => agg3
                                        .Stats("stats", stats => stats
                                            .Field(f => f.Value)
                                        )
                                    )
                                )
                            )
                        )
                    )
                );

                if (!response.IsValid)
                {
                    return Problem(response.OriginalException?.Message);
                }

                // Accumulate by account, a date histogram of all BGL statistics
                Dictionary<string, BglAccountStats> bglByAccount = new();

                foreach (KeyedBucket<string> accountBucket in response.Aggregations.Terms("account")?.Buckets)
                {
                    List<BglDataPoint> dataPoints = new();
                    DateMathTime interval = null;

                    AutoDateHistogramAggregate dateAgg = accountBucket.AutoDateHistogram("date");
                    foreach (DateHistogramBucket dateBucket in dateAgg.Buckets)
                    {
                        // Ignore empty buckets
                        if (dateBucket.DocCount == 0)
                            continue;

                        interval = dateAgg.AutoInterval;
                        
                        dataPoints.Add(new BglDataPoint
                        {
                            Timestamp = dateBucket.Date,
                            Stats = dateBucket.Stats("stats")
                        });
                    }

                    bglByAccount.Add(accountBucket.Key, new()
                    {
                        Interval = interval,
                        Stats = dataPoints
                    });
                }

                return Ok(bglByAccount);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to perform BGL stats aggregate query");

                return BadRequest();
            }
        }
    }

    public class BglAccountStats
    {
        public DateMathTime Interval { get; set; }

        public List<BglDataPoint> Stats { get; set; }
    }

    public class GetBglForPeriodParams
    {
        /// <summary>
        /// Return BGL readings occurring on or after this date/time
        /// </summary>
        public DateTime Start { get; set; }

        /// <summary>
        /// Return BGL readings occurring before or on this date/time
        /// </summary>
        public DateTime End { get; set; }

        /// <summary>
        /// Number of buckets to return as part of the auto-interval date histogram aggregation
        /// </summary>
        public int Buckets { get; set; }
    }
}
