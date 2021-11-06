using Elasticsearch.Net;

namespace Diatrack.Models
{
    public class UserPreferences
    {
        public TreatmentPreferences Treatment { get; set; }

        public DashboardPreferences Dashboard { get; set; }
    }

    public class TreatmentPreferences
    {
        [StringEnum]
        public BglUnit? BglUnit { get; set; }

        [StringEnum]
        public TimeFormat? TimeFormat { get; set; }

        public Range TargetBglRange { get; set; }

        public float BglLowThreshold { get; set; }
    }

    public enum BglUnit
    {
        MgDl,
        MmolL
    }

    public enum TimeFormat
    {
        TwelveHour,
        TwentyFourHour
    }

    public class Range
    {
        public float? Min { get; set; }

        public float? Max { get; set; }
    }

    public class DashboardPreferences
    {
        public BglStatsHistogramPreferences BglStatsHistogram { get; set; }
    }

    public class BglStatsHistogramPreferences
    {
        [StringEnum]
        public PlotColour? PlotColour { get; set; }

        public int? TimeRangeHours { get; set; }

        public bool? ActivityLog { get; set; }

        public bool? DataLabels { get; set; }

        public int? Buckets { get; set; }
    }

    public enum PlotColour
    {
        Uniform,
        ScaledByBgl
    }
}
