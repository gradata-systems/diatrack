export interface UserPreferences {
    treatment: {
        bglUnit: BglUnit,
        timeFormat: TimeFormat,
        targetBglRange: {
            min: number,
            max: number
        }
    }
    dashboard: {
        plotColour: PlotColour,
        timeRangeMinutes: number
    }
}

export enum BglUnit {
    MgDl = "MgDl",
    MmolL = "MmolL"
}

export enum TimeFormat {
    TwelveHour = 12,
    TwentyFourHour = 24
}

export enum PlotColour {
    Uniform = 'Uniform',
    Temperature = 'Temperature'
}
