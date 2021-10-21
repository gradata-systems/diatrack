namespace Diatrack.Configuration
{
    public class ElasticConfiguration
    {
        public string ConnectionUri { get; set; }
        public string ApiKeyId { get; set; }
        public string ApiKeyValue { get; set; }
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
