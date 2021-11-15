import {Inject, Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {DateTime} from "luxon";
import {merge, Observable, Subject} from "rxjs";
import {ActivityLogEntry, ActivityLogEntryCategory, ActivityLogEntryCategoryInfo, ActivityLogEntryParams, SortOrder} from "../api/models/activity-log-entry";
import {BASE_PATH} from "../api/variables";
import {LogActivityIcon} from "../app-icon.service";
import {AppConfigService} from "../api/app-config.service";
import {filter, throttleTime} from "rxjs/operators";
import {UserService} from "../api/user.service";
import {AppCoreService} from "../app-core.service";

@Injectable({
    providedIn: 'root',
})
export class ActivityLogService {

    readonly refresh$ = new Subject<void>();
    readonly changed$ = new Subject<void>();

    readonly activityLogCategories: ReadonlyMap<ActivityLogEntryCategory, ActivityLogEntryCategoryInfo> = new Map([
        [ActivityLogEntryCategory.BasalRateChange, { name: 'Basal rate change', icon: LogActivityIcon.BasalRateChange }],
        [ActivityLogEntryCategory.BglReading, { name: 'Blood glucose reading', icon: LogActivityIcon.BglReading }],
        [ActivityLogEntryCategory.Exercise, { name: 'Exercise', icon: LogActivityIcon.Exercise }],
        [ActivityLogEntryCategory.Food, { name: 'Food', icon: LogActivityIcon.Food }],
        [ActivityLogEntryCategory.Insulin, { name: 'Insulin', icon: LogActivityIcon.Insulin }],
        [ActivityLogEntryCategory.Other, { name: 'Other', icon: LogActivityIcon.Note }]
    ]);

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private appCoreService: AppCoreService,
        private httpClient: HttpClient,
        private appConfigService: AppConfigService,
        private userService: UserService
    ) {
        merge(
            this.appCoreService.autoRefresh$,
            this.userService.userPreferences$
        ).pipe(
            filter(() => this.appConfigService.autoRefreshEnabled),
            throttleTime(this.appConfigService.queryDebounceInterval, undefined, {leading: true, trailing: true})
        ).subscribe(() => {
            this.triggerRefresh();
        });
    }

    triggerRefresh() {
        this.refresh$.next();
    }

    triggerChanged() {
        this.changed$.next();
    }

    getLogEntryIcon(logEntry: ActivityLogEntry): LogActivityIcon | undefined {
        let category = this.activityLogCategories.get(logEntry.category);
        return category?.icon;
    }

    getLogEntryCategoryName(logEntry: ActivityLogEntry): string {
        let category = this.activityLogCategories.get(logEntry.category);
        return category?.name ?? '';
    }

    /*
    API methods
     */

    searchEntries(params: ActivityLogQueryParams): Observable<ActivityLogSearchHit[]> {
        return this.httpClient.post<ActivityLogSearchHit[]>(`${this.basePath}/activityLog/search`, {
            size: params.size,
            fromDate: params.fromDate?.toISO(),
            toDate: params.toDate?.toISO(),
            category: params.category,
            searchTerm: params.searchTerm,
            sortField: params.sortField,
            sortOrder: params.sortOrder
        } as ActivityLogQueryParams);
    }

    getEntry(id: string): Observable<ActivityLogEntry> {
        return this.httpClient.get<ActivityLogEntry>(`${this.basePath}/activityLog/${id}`);
    }

    addEntry(entry: ActivityLogEntryParams): Observable<void> {
        return this.httpClient.post<void>(`${this.basePath}/activityLog`, entry);
    }

    updateEntry(id: string, entry: ActivityLogEntryParams): Observable<void> {
        return this.httpClient.post<void>(`${this.basePath}/activityLog/${id}`, entry);
    }

    deleteEntry(id: string): Observable<void> {
        return this.httpClient.delete<void>(`${this.basePath}/activityLog/${id}`);
    }
}

export interface ActivityLogQueryParams
{
    size: number;

    /**
     * Offset index, for use when scrolling
     */
    from?: number;

    /**
     * Request log entries occurring on or after this date, in local time
     */
    fromDate?: DateTime;

    /**
     * Limit entries to those occurring on or before this date, in local time
     */
    toDate?: DateTime;

    category?: string;

    searchTerm?: string;

    sortField?: string;

    sortOrder?: SortOrder;
}

export interface ActivityLogSearchHit
{
    hit: ActivityLogEntry;
    highlight: Record<string, string[]>;
}
