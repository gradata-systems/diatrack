import {BglDataPoint} from "./bgl-data-point";

export interface BglAccountStats
{
    [key: string]: {
        interval: TimeUnit;
        factor: number;
        stats: BglDataPoint[];
    }
}

export enum TimeUnit
{
    Second = 'Second',
    Minute = 'Minute',
    Hour = 'Hour',
    Day = 'Day',
    Week = 'Week',
    Month = 'Month',
    Quarter = 'Quarter',
    Year = 'Year'
}
