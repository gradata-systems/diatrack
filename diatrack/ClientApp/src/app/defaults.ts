import {BglUnit, PlotColour, TimeFormat, UserPreferences} from "./api/models/UserPreferences";

export var DEFAULTS = {
    userPreferences: {
        dashboard: {
            plotColour: PlotColour.Temperature,
            timeRangeMinutes: 0
        },
        treatment: {
            bglUnit: BglUnit.MmolL,
            targetBglRange: {
                min: 3.5,
                max: 8
            },
            timeFormat: TimeFormat.TwelveHour
        }
    } as UserPreferences
};
