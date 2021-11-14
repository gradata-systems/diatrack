using System;
using Diatrack.Configuration;
using Diatrack.Models;
using Elasticsearch.Net;
using Microsoft.Extensions.Options;
using Nest;
using Serilog;

namespace Diatrack.Services
{
    public class ElasticDataProvider
    {
        private readonly ElasticConfiguration _elasticConfig;
        public ElasticClient NestClient { get; set; }
        public IElasticLowLevelClient LowLevelClient => NestClient.LowLevel;

        public ElasticDataProvider(IOptions<ElasticConfiguration> settings)
        {
            _elasticConfig = settings.Value;

            try
            {
                Uri connectionUri = new(_elasticConfig.ConnectionUri);
                SingleNodeConnectionPool connectionPool = new(connectionUri);
                ConnectionSettings connectionSettings = new(connectionPool);

                if (!string.IsNullOrEmpty( _elasticConfig.ApiKeyId) && !string.IsNullOrEmpty(_elasticConfig.ApiKeyValue))
                    connectionSettings.ApiKeyAuthentication(_elasticConfig.ApiKeyId, _elasticConfig.ApiKeyValue);

                // Disable certificate validation
                connectionSettings.ServerCertificateValidationCallback((obj, cert, chain, errors) => true);

                // Map configured index names to CLR types
                connectionSettings.DefaultMappingFor<UserProfile>(m => m.IndexName(_elasticConfig.Indices.Users));
                connectionSettings.DefaultMappingFor<BglReading>(m => m.IndexName(_elasticConfig.Indices.BglReadings));
                connectionSettings.DefaultMappingFor<ActivityLogEntry>(m => m.IndexName(_elasticConfig.Indices.ActivityLog));
                connectionSettings.DefaultMappingFor<AccountStateRecord>(m => m.IndexName(_elasticConfig.Indices.AccountState));

                NestClient = new ElasticClient(connectionSettings);

                Log.Information("Connected to Elasticsearch cluster at '{ClusterURI}'", _elasticConfig.ConnectionUri);
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Could not connect to Elasticsearch cluster at '{ClusterURI}'", _elasticConfig.ConnectionUri);
            }
        }
    }
}
