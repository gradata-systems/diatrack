namespace DiatrackPoller.Configuration
{
    public class DexcomPollerConfiguration
    {
        /// <summary>
        /// How long to wait for a single query to complete
        /// </summary>
        public int QueryTimeoutSeconds { get; set; }

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
        /// How often new BGL readings are expected to appear.
        /// If we receive a BGL reading for an account, wait this number of seconds until attempting to retrieve another value.
        /// </summary>
        public int BglAccountRefreshIntervalSeconds { get; set; }

        /// <summary>
        /// Where an account has no BGL readings for a while, reduce the poll interval to this number of seconds
        /// </summary>
        public int BglStaleAccountQueryFrequencySeconds { get; set; }

        /// <summary>
        /// Query up to this number of minutes worth of readings for a given account ID
        /// </summary>
        public int BglMaxWindowMinutes { get; set; }

        /// <summary>
        /// Maximum number of readings to return at once
        /// </summary>
        public int BglMaxReadings { get; set; }
    }
}
