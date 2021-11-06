using System;
using System.Collections.Generic;

namespace Diatrack.Models
{
    /// <summary>
    /// Tracks the latest BGL reading recorded against each account ID
    /// </summary>
    public class AccountBglState
    {
        public int Id { get; set; }

        public IDictionary<string, DateTime> Accounts { get; set; }
    }
}
