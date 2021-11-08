import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivityLogService} from "../activity-log.service";
import {merge, Observable, of, Subject} from "rxjs";
import {ActivityLogEntry, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../common-dialog/common-dialog.service";
import {DateTime} from "luxon";
import {BglStatsService} from "../../api/bgl-stats.service";
import {UserService} from "../../api/user.service";
import {catchError, map, mergeMap, takeUntil, tap, throttleTime} from "rxjs/operators";
import {MatDialog} from "@angular/material/dialog";
import {ActivityLogEntryDialogParams, NewActivityLogEntryDialogComponent} from "../new-activity-log-entry-dialog/new-activity-log-entry-dialog.component";
import {AppConfigService} from "../../api/app-config.service";
import {DashboardService} from "../../pages/dashboard/dashboard.service";
import {DEFAULTS} from "../../defaults";

@Component({
    selector: 'app-activity-log-list',
    templateUrl: './activity-log-list.component.html',
    styleUrls: ['./activity-log-list.component.scss']
})
export class ActivityLogListComponent implements OnInit, OnDestroy {
    @Input() dateFrom?: DateTime;

    readonly logEntries$: Subject<ActivityLogEntry[]> = new Subject<ActivityLogEntry[]>();
    readonly destroying$ = new Subject<boolean>();
    loading = false;

    readonly activityLogEntryCategory = ActivityLogEntryCategory;

    constructor(
        public activityLogService: ActivityLogService,
        public bglStatsService: BglStatsService,
        public userService: UserService,
        private snackBar: MatSnackBar,
        private appConfigService: AppConfigService,
        private appDialogService: DialogService,
        private dialogService: MatDialog,
        private dashboardService: DashboardService
    ) { }

    ngOnInit() {
        merge(
            this.activityLogService.refresh$,
            this.activityLogService.changed$
        ).pipe(
            takeUntil(this.destroying$),
            throttleTime(this.appConfigService.queryDebounceInterval, undefined, {leading: true, trailing: true}),
            mergeMap(() => {
                this.loading = true;
                return this.activityLogService.searchEntries({
                    size: this.appConfigService.initialLogEntryQuerySize,
                    fromDate: this.dateFrom ?? undefined
                }).pipe(
                    tap(() => {
                        this.loading = false;
                    }),
                    catchError(() => of(undefined))
                );
            })
        ).subscribe(entries => {
            if (entries !== undefined) {
                // Only update the list if the query succeeded
                this.logEntries$.next(entries);
            }
        }, error => {
            this.snackBar.open('Error occurred when querying the activity log');
        });

        // If a dashboard log entry marker is clicked, display the edit dialog
        this.dashboardService.activityLogMarkerClicked$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(logEntryId => {
            this.editLogEntryById(logEntryId);
        });

        this.activityLogService.triggerRefresh();
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }

    editLogEntryById(id: string) {
        this.activityLogService.getEntry(id).subscribe(logEntry => {
            this.editLogEntry(logEntry);
        }, error => {
            this.snackBar.open('Could not find the requested log entry');
        });
    }

    editLogEntry(logEntry: ActivityLogEntry) {
        const dialogRef = this.dialogService.open(NewActivityLogEntryDialogComponent, {
            width: '300px',
            data: {
                entryType: logEntry.category,
                entryCategory: this.activityLogService.activityLogCategories.get(logEntry.category),
                existingEntry: logEntry
            } as ActivityLogEntryDialogParams
        });

        return dialogRef.afterClosed();
    }

    deleteLogEntry(logEntry: ActivityLogEntry) {
        this.activityLogService.deleteEntry(logEntry.id).subscribe(() => {
            this.activityLogService.triggerChanged();
            this.snackBar.open('Log entry deleted');
        }, error => {
            this.appDialogService.error('Delete log entry', 'The selected log entry could not be deleted. Please try again later.');
        });
    }

    getLogEntryTime(logEntry: ActivityLogEntry) {
        if (logEntry.created) {
            return DateTime.fromISO(logEntry.created).toRelative();
        } else {
            return '';
        }
    }

    getLogEntryFullTime(logEntry: ActivityLogEntry): string {
        if (logEntry.created) {
            return DateTime.fromISO(logEntry.created).toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
        } else {
            return '';
        }
    }

    getScaledBgl(logEntry: ActivityLogEntry): Observable<number | undefined> {
        return this.userService.getBglUnits().pipe(map(bglUnits => {
            if (logEntry.bgl !== undefined) {
                return this.bglStatsService.scaleBglValueFromMgDl(logEntry.bgl!, bglUnits)
            } else {
                return undefined;
            }
        }));
    }

    getScaledManualBglReading(logEntry: ActivityLogEntry): Observable<number | undefined> {
        return this.userService.getBglUnits().pipe(map(profileBglUnits => {
            if (logEntry.properties.bglReading !== undefined) {
                const logEntryBglUnits = logEntry.properties.bglUnits ?? DEFAULTS.userPreferences.treatment?.bglUnit;
                return this.bglStatsService.scaleBglValue(logEntry.properties.bglReading!, logEntryBglUnits, profileBglUnits);
            } else {
                return undefined;
            }
        }));
    }
}
