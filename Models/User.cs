using Diatrack.Utilities;
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Diatrack.Models
{
    public class User
    {
        [Required]
        public string Id { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
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
}
