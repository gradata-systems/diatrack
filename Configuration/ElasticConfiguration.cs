namespace Diatrack.Configuration
{
    public class ElasticConfiguration
    {
        // Elasticsearch host(s) to connect to
        public string ConnectionUri { get; set; }
        public string ApiKeyId { get; set; }
        public string ApiKeyValue { get; set; }
        // Names of the indices used by the app
        public ElasticIndexConfiguration Indices { get; set; }
    }

    public class ElasticIndexConfiguration
    {
        public string Users { get; set; }
        public string Bgl { get; set; }
        public string Actions { get; set; }
        public string Events { get; set; }
    }
}
