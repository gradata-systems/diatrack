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
    bglLowThreshold: number;
}

export interface DashboardPreferences {
    bglStatsHistogram: {
        plotColour: PlotColour;
        timeRangeHours: number;
        buckets: number;
        activityLog: boolean;
        dataLabels: boolean;
    }
}

export enum BglUnit {
    MgDl = "MgDl",
    MmolL = "MmolL"
}

export function getBglUnitDisplayValue(bglUnit: BglUnit) {
    switch (bglUnit) {
        case BglUnit.MmolL:
            return 'mmol/L';
        case BglUnit.MgDl:
            return 'mg/dL';
    }
}

export enum TimeFormat {
    TwelveHour = 12,
    TwentyFourHour = 24
}

export enum PlotColour {
    Uniform = 'Uniform',
    ScaledByBgl = 'ScaledByBgl'
}
