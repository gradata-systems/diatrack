import {User} from "./user";
import {AppIcon} from "../../app-icon.service";

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
    icon: AppIcon;
}

export enum ActivityLogEntryCategory
{
    Insulin = 'insulin',
    Food = 'food',
    BglReading = 'bgl_reading',
    Exercise = 'exercise',
    Other = 'other'
}
