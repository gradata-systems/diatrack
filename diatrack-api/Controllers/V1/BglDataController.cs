using Diatrack.Models;
using Diatrack.Services;
using Elasticsearch.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nest;
using Serilog;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Diatrack.Controllers.V1
{
    [Authorize]
    [Route("Bgl")]
    [ApiVersion("1.0")]
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
        /// <param name="count">Number of BGL readings to retrieve per account</param>
        [HttpGet]
        public async Task<ActionResult<IDictionary<string, IEnumerable<BglReading>>>> GetLatestReadings([FromQuery] int count = 5)
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
                                    .Size(count)
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
        [HttpPost("accountStatsHistogram")]
        public async Task<ActionResult<Dictionary<string, BglAccountStats>>> GetBglReadingsForPeriod([FromBody] GetBglForPeriodParams requestParams)
        {
            try
            {
                // Get the account IDs registered to the logged-in user
                string[] accountIds = await _userService.GetLinkedAccountIds();

                if (accountIds.Length == 0)
                {
                    return BadRequest();
                }

                IMovingAverageModel movingAverageModel = requestParams.MovingAverage?.ToModel();

                ISearchResponse<BglReading> response = await _elasticClient.SearchAsync<BglReading>(r => r
                    .Size(0)
                    .Query(q => q
                        .Bool(b => b
                            .Must(
                                mu1 => mu1.DateRange(d => d
                                    .Field(f => f.Timestamp)
                                    .GreaterThanOrEquals(requestParams.QueryFrom)
                                    .LessThanOrEquals(requestParams.QueryTo ?? DateTime.UtcNow)
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
                                .DateHistogram("date", dh => dh
                                    .Field(f => f.Timestamp)
                                    .FixedInterval(new Time(requestParams.BucketTimeFactor, requestParams.BucketTimeUnit))
                                    .Aggregations(agg3 => agg3
                                        .Average("average", stats => stats
                                            .Field(f => f.Value)
                                        )
                                        .MovingAverage("movingAverage", movingAvg => movingAvg
                                            .BucketsPath("average")
                                            .Model(model => movingAverageModel ?? model.Simple())
                                            .Window(requestParams.MovingAverage?.Window)
                                            .Predict(requestParams.MovingAverage?.PredictionCount)
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
                        interval = dateAgg.AutoInterval;
                        
                        dataPoints.Add(new BglDataPoint
                        {
                            Timestamp = dateBucket.Date,
                            Average = dateBucket.Average("average"),
                            MovingAverage = dateBucket.MovingAverage("movingAverage")
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
        /// Query BGL readings occurring on or after this date/time
        /// </summary>
        public DateTime QueryFrom { get; set; }

        /// <summary>
        /// Query BGL readings occurring before or on this date/time
        /// </summary>
        public DateTime? QueryTo { get; set; }
        
        /// <summary>
        /// Create buckets using this time unit
        /// </summary>
        [StringEnum]
        public TimeUnit BucketTimeUnit { get; set; }

        /// <summary>
        /// Each bucket encompasses this number of time units
        /// </summary>
        public int BucketTimeFactor { get; set; }

        public MovingAverageParams MovingAverage { get; set; }
    }
}
