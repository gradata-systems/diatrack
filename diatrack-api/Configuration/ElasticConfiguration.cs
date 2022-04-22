namespace Diatrack.Configuration
{
    public class ElasticConfiguration
    {
        /// <summary>
        /// Elasticsearch host(s) to connect to
        /// </summary>
        public string ConnectionUri { get; set; }
        public string ApiKeyId { get; set; }
        public string ApiKeyValue { get; set; }

        /// <summary>
        /// Number of workers to use to send bulk data
        /// </summary>
        public int ForwardingWorkers { get; set; }

        /// <summary>
        /// Number of documents to batch together when forwarding
        /// </summary>
        public int ForwardingBatchSize { get; set; }

        /// <summary>
        /// Names of the indices used by the app
        /// </summary>
        public ElasticIndexConfiguration Indices { get; set; }
    }

    public class ElasticIndexConfiguration
    {
        public string Users { get; set; }
        public string AccountBglState { get; set; }
        public string BglReadings { get; set; }
        public string ActivityLog { get; set; }
        public string AccountState { get; set; }
    }
}
