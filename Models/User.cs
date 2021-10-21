using Diatrack.Utilities;
using Serilog;
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Diatrack.Models
{
    public class User
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string EmailAddress { get; set; }
        public DateTime Created { get; set; }

        public UserPreferences Preferences { get; set; }
        public DexcomAccount DexcomAccount { get; set; }

        /// <summary>
        /// Remove secrets when serialising for the client
        /// </summary>
        public void Sanitise()
        {
            if (DexcomAccount != null)
            {
                DexcomAccount.Password = default;
                DexcomAccount.CryptoKey = default;
                DexcomAccount.CryptoIv = default;
            }
        }
    }

    public class UserPreferences
    {
        public BglUnit BglUnit { get; set; }
    }

    public enum BglUnit
    {
        MgDl,
        MmolL
    }

    public class DexcomAccount
    {
        public string Region { get; set; }

        public string Name { get; set; }

        /// <summary>
        /// Account password (encrypted on write)
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string Password { get; set; }

        /// <summary>
        /// Random key and IV to use for encrypting the account password
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string CryptoKey { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string CryptoIv { get; set; }

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
    }
}
