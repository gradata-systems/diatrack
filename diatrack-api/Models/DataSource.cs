using Diatrack.Configuration;
using Diatrack.Utilities;
using Elasticsearch.Net;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Diatrack.Models
{
    public class DataSource
    {
        /// <summary>
        /// Unique ID of the user's data source account
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Data provider name (e.g. Dexcom)
        /// </summary>
        [StringEnum]
        [Required]
        public DataSourceType? Type { get; set; }

        /// <summary>
        /// Friendly display name of the data source
        /// </summary>
        [Required]
        public string Name { get; set; }

        /// <summary>
        /// Geographic region of the server the account is held in, if applicable
        /// </summary>
        [Required]
        public string RegionId { get; set; }

        /// <summary>
        /// User's data provider account ID (e.g. Dexcom login)
        /// </summary>
        [Required]
        public string LoginId { get; set; }

        /// <summary>
        /// Account password (encrypted on write)
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string Password { get; set; }

        /// <summary>
        /// A unique token for sharing data from this account with other services, like Sugarmate
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string ShareToken { get; set; }

        /// <summary>
        /// Random key and IV to use for encrypting the account password
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string CryptoKey { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string CryptoIv { get; set; }

        [JsonIgnore]
        public bool IsValid
        {
            get =>
                !string.IsNullOrEmpty(Id) && !string.IsNullOrEmpty(RegionId) && !string.IsNullOrEmpty(LoginId) &&
                !string.IsNullOrEmpty(Password) && !string.IsNullOrEmpty(CryptoKey) && !string.IsNullOrEmpty(CryptoIv);
        }

        /// <summary>
        /// Remove secrets when serialising for the client
        /// </summary>
        public void Sanitise()
        {
            Password = default;
            CryptoKey = default;
            CryptoIv = default;
            ShareToken = default;
        }

        /// <summary>
        /// Get the decrypted account password
        /// </summary>
        public string GetPlainTextPassword()
        {
            try
            {
                return Crypto.DecryptString(Password, CryptoKey, CryptoIv);
            }
            catch (ArgumentNullException)
            {
                return string.Empty;
            }
        }

        /// <summary>
        /// Build a complete URL, based on the user's region
        /// </summary>
        public string BuildRegionalUrl(string endpoint, IDictionary<string, DexcomRegion> regions)
        {
            if (string.IsNullOrEmpty(RegionId))
            {
                throw new InvalidRegionException("Empty region");
            }

            if (regions.TryGetValue(RegionId, out DexcomRegion region))
            {
                return $"https://{region.Server}{endpoint}";
            }
            else
            {
                throw new InvalidRegionException(RegionId);
            }
        }
    }

    public enum DataSourceType
    {
        Dexcom = 1
    }
}
