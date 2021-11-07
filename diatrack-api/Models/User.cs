using Nest;
using System;
using System.ComponentModel.DataAnnotations;

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
    }

    public class UserProfile : User
    {
        [Date(Name = "@created")]
        public DateTime Created { get; set; }

        [Date(Name = "@lastActive")]
        public DateTime LastActive { get; set; }

        public bool IsNew { get; set; }

        public UserPreferences Preferences { get; set; }

        [Object(Name = "dataSource")]
        public DataSource[] DataSources { get; set; } = Array.Empty<DataSource>();

        /// <summary>
        /// Remove secrets when serialising for the client
        /// </summary>
        public void Sanitise()
        {
            foreach (DataSource account in DataSources)
            {
                account.Sanitise();
            }
        }
    }
}
