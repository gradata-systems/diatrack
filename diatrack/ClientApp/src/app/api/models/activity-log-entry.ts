import {User} from "./user";
import {LogActivityIcon} from "../../app-icon.service";

export interface ActivityLogEntry extends ActivityLogEntryParams
{
    id: string;
    created: string;
    createdBy: User;
}

export interface ActivityLogEntryParams
{
    accountId: string;
    category: ActivityLogEntryCategory;
    bgl?: number;
    properties: Record<string, any>;
    notes?: string;
}

export interface ActivityLogEntryCategoryInfo
{
    name: string;
    icon: LogActivityIcon;
}

export enum ActivityLogEntryCategory
{
    Insulin = 'insulin',
    BasalRateChange = 'basal_rate_change',
    Food = 'food',
    BglReading = 'bgl_reading',
    Exercise = 'exercise',
    Other = 'other'
}

export enum TimeUnit
{
    Second = 'second',
    Minute = 'minute',
    Hour = 'hour',
    Day = 'day'
}
