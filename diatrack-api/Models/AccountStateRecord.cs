using System;
using System.ComponentModel.DataAnnotations;

namespace Diatrack.Models
{
    public class AccountStateRecord
    {
        [Required]
        public string Id { get; set; }

        public bool PollingEnabled { get; set; }

        public DateTime? LastReceived { get; set; }
    }
}
