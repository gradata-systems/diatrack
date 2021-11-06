using Diatrack.Models;
using NUnit.Framework;
using System.Collections.Generic;
using System.Text.Json;
using System.Linq;
using System;
using System.Text;

namespace diatrack_tests
{
    [TestFixture]
    public class DexcomBglReadingTest
    {
        private readonly string _sampleJson = Encoding.UTF8.GetString(Resource1.SampleBglOutput);
        private JsonSerializerOptions _serializerOptions;

        [SetUp]
        public void Setup()
        {
            _serializerOptions = new()
            {
                Converters = { new BglReadingJsonConverter() }
            };
        }

        [Test]
        public void ReadFromJson()
        {
            List<BglReading> readings = JsonSerializer.Deserialize<IEnumerable<BglReading>>(_sampleJson, _serializerOptions).ToList();

            Assert.IsTrue(readings.Count > 0, "Items were parsed from the sample JSON");
            Assert.AreEqual(readings[0].Timestamp, DateTimeOffset.FromUnixTimeMilliseconds(1634827923000).DateTime);
            Assert.AreEqual(readings[0].Value, 110);
            Assert.AreEqual(readings[0].Trend, BglTrend.Flat);
        }
    }
}