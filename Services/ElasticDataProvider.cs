using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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
        private ElasticConfiguration _elasticConfig;
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
                connectionSettings = connectionSettings.DefaultMappingFor<User>(m => m.IndexName(_elasticConfig.Indices.Users));
                // TODO: Add other mappings here

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
