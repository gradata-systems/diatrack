using System;
using System.Collections.Generic;

namespace Diatrack.Configuration
{
    public class DexcomConfiguration
    {
        /// <summary>
        /// Valid Dexcom regions
        /// </summary>
        public IDictionary<string, DexcomRegion> Regions { get; set; }

        /// <summary>
        /// Constant application GUID (assumed to be the Dexcom app itself)
        /// </summary>
        public string ApplicationId { get; set; }

        /// <summary>
        /// Maximum number of Dexcom API queries to run concurrently
        /// </summary>
        public int MaxConcurrentRequests { get; set; }

        /// <summary>
        /// Maximum number of Dexcom accounts to retrieve from Elasticsearch.
        /// If user base grows, consider using the scroll API instead.
        /// </summary>
        public int MaxAccountQuerySize { get; set; }

        /// <summary>
        /// Maximum amount of time for all CGM data queries to complete, before being aborted
        /// </summary>
        public int MaxQueryPeriodSeconds { get; set; }

        /// <summary>
        /// How often to query BGL data from all accounts
        /// </summary>
        public int BglQueryFrequencySeconds { get; set; }

        /// <summary>
        /// Query up to this number of minutes worth of readings for a given account ID
        /// </summary>
        public int BglMaxWindowMinutes { get; set; }

        /// <summary>
        /// Maximum number of readings to return at once
        /// </summary>
        public int BglMaxReadings { get; set; }

        /// <summary>
        /// Dexcom API endpoints, as relative URIs
        /// </summary>
        public string GetAccountEndpoint { get; set; }
        public string LoginEndpoint { get; set; }
        public string LatestCgmDataEndpoint { get; set; }
    }

    public class DexcomRegion
    {
        public string Name { get; set; }
        public string Server { get; set; }
    }

    public class InvalidRegionException : Exception
    {
        public InvalidRegionException(string message) : base(message)
        { }
    }
}
