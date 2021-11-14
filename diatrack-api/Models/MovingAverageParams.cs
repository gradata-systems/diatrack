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

        public IMovingAverageModel ToModel()
        {
            switch (ModelType)
            {
                case MovingAverageModelType.Simple:
                    return new SimpleModel();
                case MovingAverageModelType.Linear:
                    return new LinearModel();
                case MovingAverageModelType.Ewma:
                    return new EwmaModel()
                    {
                        Alpha = Alpha
                    };
                case MovingAverageModelType.HoltLinear:
                    return new HoltLinearModel()
                    {
                        Alpha = Alpha,
                        Beta = Beta
                    };
                case MovingAverageModelType.HoltWinters:
                    return new HoltWintersModel()
                    {
                        Period = Period,
                        Type = HoltWintersType.Additive
                    };
                default:
                    return new SimpleModel();
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
