using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Diatrack.Configuration
{
    public class DexcomConfiguration
    {
        public IDictionary<string, DexcomRegion> Regions { get; set; }
        public string ApplicationId { get; set; }
        public string GetAccountEndpoint { get; set; }
        public string LoginEndpoint { get; set; }
        public string LatestCgmDataEndpoint { get; set; }
    }

    public class DexcomRegion
    {
        public string Name { get; set; }
        public string Server { get; set; }
    }
}
