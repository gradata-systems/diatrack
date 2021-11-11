using Diatrack.Configuration;
using Diatrack.Utilities;
using Elasticsearch.Net;
using Serilog;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

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

        [JsonIgnore]
        public bool IsValid
        {
            get =>
                !string.IsNullOrEmpty(Id) && !string.IsNullOrEmpty(RegionId) && !string.IsNullOrEmpty(LoginId) && !string.IsNullOrEmpty(Password);
        }

        /// <summary>
        /// Remove secrets when serialising for the client
        /// </summary>
        public void Sanitise()
        {
            Password = default;
            ShareToken = default;
        }

        /// <summary>
        /// Set the account password by encrypting a provided string
        /// </summary>
        public async Task SetPasswordFromPlainText(string plainText, AppConfiguration appConfig)
        {
            if (string.IsNullOrEmpty(plainText))
            {
                Password = String.Empty;
                return;
            }

            if (!string.IsNullOrEmpty(appConfig.EncryptionKey))
            {
                Password = Crypto.EncryptString(plainText, Convert.FromBase64String(appConfig.EncryptionKey));
            }
            else if (!string.IsNullOrEmpty(appConfig.EncryptionKeyFile))
            {
                try
                {
                    byte[] cryptoKey = await GetEncryptionKeyFromFile(appConfig.EncryptionKeyFile);
                    Password = Crypto.EncryptString(plainText, cryptoKey);
                }
                catch (Exception ex)
                {
                    Password = null;
                    Log.Error(ex, "Failed to decrypt password for user {LoginId} in region {RegionId}", LoginId, RegionId);
                    throw;
                }
            }
            else
            {
                throw new Exception("Encryption key not specified");
            }
        }

        /// <summary>
        /// Get the decrypted account password
        /// </summary>
        public async Task<string> GetPlainTextPassword(AppConfiguration appConfig)
        {
            if (!string.IsNullOrEmpty(appConfig.EncryptionKey))
            {
                return Crypto.DecryptString(Password, Convert.FromBase64String(appConfig.EncryptionKey));
            }
            else if (!string.IsNullOrEmpty(appConfig.EncryptionKeyFile))
            {
                try
                {
                    byte[] cryptoKey = await GetEncryptionKeyFromFile(appConfig.EncryptionKeyFile);
                    return Crypto.DecryptString(Password, cryptoKey);
                }
                catch (ArgumentNullException)
                {
                    return string.Empty;
                }
            }
            else
            {
                throw new Exception("Encryption key not specified");
            }
        }

        private static async Task<byte[]> GetEncryptionKeyFromFile(string encryptionKeyFile)
        {
            return await File.ReadAllBytesAsync(encryptionKeyFile);
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
