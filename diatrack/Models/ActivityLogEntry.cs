using Diatrack.Converters;
using Nest;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Diatrack.Models
{
    public class ActivityLogEntry : ActivityLogEntryParams
    {
        public string Id { get; set; }

        [Date(Name = "@created")]
        public DateTime? Created { get; set; }

        public User CreatedBy { get; set; }

        public ActivityLogEntry(ActivityLogEntryParams logEntryParams)
            : base(logEntryParams)
        { }
    }

    public class ActivityLogEntryParams
    {
        /// <summary>
        /// Allow the user to manually set a date/time for the log entry
        /// </summary>
        public DateTime? AtTime { get; set; }

        [Required]
        public string AccountId { get; set; }

        [Required]
        public string Category { get; set; }

        public float? Bgl { get; set; }

        [JsonConverter(typeof(DictionaryStringObjectJsonConverter))]
        public Dictionary<string, object> Properties { get; set; }

        public string Notes { get; set; }

        public ActivityLogEntryParams()
        { }

        public ActivityLogEntryParams(ActivityLogEntryParams logEntryParams)
        {
            AccountId = logEntryParams.AccountId;
            Category = logEntryParams.Category;
            Bgl = logEntryParams.Bgl;
            Properties = logEntryParams.Properties;
            Notes = logEntryParams.Notes;
        }
    }
}
