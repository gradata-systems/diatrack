using Nest;
using System;

namespace Diatrack.Models
{
    public class BglDataPoint
    {
        public DateTime Timestamp { get; set; }

        public StatsAggregate Stats { get; set; }
    }
}
