using Elasticsearch.Net;
using Nest;

namespace Diatrack.Models
{
    /// <summary>
    /// Moving average aggregation parameters
    /// </summary>
    /// <see cref="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-movavg-aggregation.html"/>
    public class MovingAverageParams
    {
        public bool? Enabled { get; set; }

        [StringEnum]
        public MovingAverageModelType? ModelType { get; set; }

        /// <summary>
        /// Size of the window to slide across the histogram
        /// </summary>
        public int? Window { get; set; }

        public bool? Minimize { get; set; }

        public float? Alpha { get; set; }

        public float? Beta { get; set; }

        public float? Gamma { get; set; }

        public int? Period { get; set; }

        public int? PredictionCount { get; set; }

        public string ToScript()
        {
            switch (ModelType)
            {
                case MovingAverageModelType.Simple:
                    return "MovingFunctions.unweightedAvg(values)";
                case MovingAverageModelType.Linear:
                    return "MovingFunctions.linearWeightedAvg(values)";
                case MovingAverageModelType.Ewma:
                    return $"MovingFunctions.ewma(values, {Alpha})";
                case MovingAverageModelType.HoltLinear:
                    return $"MovingFunctions.holt(values, {Alpha}, {Beta})";
                case MovingAverageModelType.HoltWinters:
                    return $"MovingFunctions.holtWinters(values, {Alpha}, {Beta}, {Gamma}, {Period}, {false})";
                default:
                    return "MovingFunctions.unweightedAvg(values)";
            }
        }
    }

    public enum MovingAverageModelType
    {
        Simple,
        Linear,
        Ewma,
        HoltLinear,
        HoltWinters
    }
}
