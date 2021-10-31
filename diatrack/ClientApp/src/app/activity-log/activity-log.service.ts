import {Inject, Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {DateTime} from "luxon";
import {combineLatest, interval, Observable, Subject} from "rxjs";
import {ActivityLogEntry, ActivityLogEntryCategory, ActivityLogEntryCategoryInfo, ActivityLogEntryParams} from "../api/models/activity-log-entry";
import {BASE_PATH} from "../api/variables";
import {AppIcon} from "../app-icon.service";
import {AppConfigService} from "../api/app-config.service";
import {filter} from "rxjs/operators";
import {UserService} from "../api/user.service";

@Injectable({
    providedIn: 'root',
})
export class ActivityLogService {

    readonly refresh$ = new Subject<void>();

    readonly activityLogCategories: ReadonlyMap<ActivityLogEntryCategory, ActivityLogEntryCategoryInfo> = new Map([
        [ActivityLogEntryCategory.Insulin, { name: 'Insulin', icon: AppIcon.Insulin }],
        [ActivityLogEntryCategory.Food, { name: 'Food', icon: AppIcon.Food }],
        [ActivityLogEntryCategory.BglReading, { name: 'Blood glucose reading', icon: AppIcon.BglReading }],
        [ActivityLogEntryCategory.Exercise, { name: 'Exercise', icon: AppIcon.Exercise }],
        [ActivityLogEntryCategory.Other, { name: 'Other', icon: AppIcon.Note }]
    ]);

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private appConfigService: AppConfigService,
        private userService: UserService
    ) {
        combineLatest([
            interval(this.appConfigService.refreshInterval),
            this.userService.userPreferences$
        ]).pipe(
            filter(() => this.appConfigService.autoRefreshEnabled)
        ).subscribe(() => {
            this.refreshEntries();
        });
    }

    refreshEntries() {
        this.refresh$.next();
    }

    getLogEntryIcon(logEntry: ActivityLogEntry): string {
        let category = this.activityLogCategories.get(logEntry.category);
        return category?.icon || '';
    }

    getLogEntryCategoryName(logEntry: ActivityLogEntry): string {
        let category = this.activityLogCategories.get(logEntry.category);
        return category?.name || '';
    }

    /*
    API methods
     */

    searchEntries(params: LogEntryQueryParams): Observable<ActivityLogEntry[]> {
        return this.httpClient.post<ActivityLogEntry[]>(`${this.basePath}/activityLog/search`, {
            size: params.size,
            fromDate: params.fromDate?.toISO() || undefined,
            toDate: params.toDate?.toISO() || undefined
        });
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

interface LogEntryQueryParams
{
    size: number;
    fromDate?: DateTime;
    toDate?: DateTime;
}
