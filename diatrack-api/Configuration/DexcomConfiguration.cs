using Diatrack.Models;
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
        /// Dexcom API endpoints, as relative URIs
        /// </summary>
        public string GetAccountEndpoint { get; set; }
        public string LoginEndpoint { get; set; }
        public string LatestCgmDataEndpoint { get; set; }
    }

    public class InvalidRegionException : Exception
    {
        public InvalidRegionException(string message) : base(message)
        { }
    }
}
