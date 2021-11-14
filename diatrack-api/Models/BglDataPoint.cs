using Nest;
using System;

namespace Diatrack.Models
{
    public class BglDataPoint
    {
        public DateTime Timestamp { get; set; }

        public ValueAggregate Average { get; set; }

        public ValueAggregate MovingAverage { get; set; }
    }
}
