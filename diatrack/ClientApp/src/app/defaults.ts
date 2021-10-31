import {BglUnit, PlotColour, TimeFormat, UserPreferences} from "./api/models/user-preferences";

export var DEFAULTS = {
    userPreferences: {
        dashboard: {
            bglStatsHistogram: {
                timeRangeHours: 2,
                plotColour: PlotColour.ScaledByBgl,
                dataLabels: false,
                buckets: 1000
            }
        },
        treatment: {
            bglUnit: BglUnit.MmolL,
            targetBglRange: {
                min: 3.5,
                max: 8
            },
            bglLowThreshold: 3,
            timeFormat: TimeFormat.TwelveHour
        }
    } as UserPreferences
};
