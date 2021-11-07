using System;

namespace Diatrack.Models.Nightscout
{
    public class Entry
    {
        public string Type { get; set; }

        public string DateString { get; set; }

        public long Date { get; set; }

        public double Sgv { get; set; }

        public string Direction { get; set; }

        public double? Noise { get; set; }

        public double? Filtered { get; set; }

        public double? Unfiltered { get; set; }

        public double? Rssi { get; set; }

        /// <summary>
        /// Convert from a `BglReading`
        /// </summary>
        public Entry(BglReading bglReading)
        {
            DateTime utcTime = bglReading.Timestamp.ToUniversalTime();
            
            Type = "sgv";
            DateString = utcTime.ToString("o");
            Date = (long)(utcTime - new DateTime(1970, 1, 1)).TotalMilliseconds;
            Sgv = bglReading.Value;
            Direction = Enum.GetName(bglReading.Trend);
        }
    }
}
