export interface UserPreferences {
    treatment?: TreatmentPreferences;
    dashboard?: DashboardPreferences;
}

export interface TreatmentPreferences {
    bglUnit: BglUnit;
    timeFormat: TimeFormat;
    targetBglRange: {
        min: number;
        max: number;
    };
}

export interface DashboardPreferences {
    plotColour: PlotColour;
    timeRangeMinutes: number;
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
