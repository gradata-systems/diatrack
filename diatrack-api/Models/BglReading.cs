using Elasticsearch.Net;
using Nest;
using Serilog;
using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Diatrack.Models
{
    public class BglReading
    {
        public string AccountId { get; set; }

        [Date(Name = "@timestamp")]
        public DateTime Timestamp { get; set; }

        [Date(Name = "@received")]
        public DateTime Received { get; set; }

        public int TrendId { get; set; }

        [StringEnum]
        public BglTrend Trend { get; set; }

        public double Value { get; set; }
    }

    public enum BglTrend
    {
        None = 0,
        DoubleUp = 1,
        SingleUp = 2,
        FortyFiveUp = 3,
        Flat = 4,
        FortyFiveDown = 5,
        SingleDown = 6,
        DoubleDown = 7,
        NotComputable = 8,
        RateOutOfRange = 9
    }

    public class BglReadingJsonConverter : JsonConverter<BglReading>
    {
        private static readonly Regex _datePattern = new(@"^/Date\((\d+)\)/$", RegexOptions.Compiled);

        public override BglReading Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.StartObject)
                throw new JsonException("Expected StartObject token");

            BglReading reading = new()
            {
                Received = DateTime.UtcNow
            };

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndObject)
                    return reading;
                if (reader.TokenType != JsonTokenType.PropertyName)
                    throw new JsonException("Expected PropertyName token");

                string propertyName = reader.GetString();
                reader.Read();

                switch (propertyName)
                {
                    case "WT":
                        string rawDate = reader.GetString();
                        Match dateMatch = _datePattern.Match(rawDate);
                        try
                        {
                            long epochMillis = long.Parse(dateMatch.Groups[1].Value);
                            reading.Timestamp = DateTimeOffset.FromUnixTimeMilliseconds(epochMillis).DateTime;
                        }
                        catch (Exception)
                        {
                            Log.Error($"Invalid date/time format for: '{rawDate}'");
                        }
                        break;
                    case "Trend":
                        if (reader.TryGetInt32(out int trend))
                        {
                            reading.TrendId = trend;
                            reading.Trend = (BglTrend)trend;
                        }
                        break;
                    case "Value":
                        if (reader.TryGetDouble(out double val))
                        {
                            reading.Value = val;
                        }
                        break;
                }
            }

            throw new JsonException("Expected EndObject token");
        }

        public override void Write(Utf8JsonWriter writer, BglReading value, JsonSerializerOptions options)
        {
            throw new NotImplementedException();
        }
    }
}
