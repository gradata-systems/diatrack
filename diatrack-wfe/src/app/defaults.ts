import {BglUnit, PlotColour, TimeFormat, UserPreferences} from "./api/models/user-preferences";
import {MovingAverageModelType} from "./api/models/moving-average-params";

export const DEFAULTS = {
    userPreferences: {
        dashboard: {
            bglStatsHistogram: {
                profileType: '6 hours',
                plotColour: PlotColour.ScaledByBgl,
                movingAverage: {
                    enabled: true,
                    modelType: MovingAverageModelType.HoltWinters,
                    window: 10,
                    period: 1,
                    alpha: 0.8,
                    predictionCount: 10
                },
                activityLog: true,
                dataLabels: false
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
