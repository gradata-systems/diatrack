import {ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ActivityLogQueryParams, ActivityLogSearchHit, ActivityLogService} from "../activity-log.service";
import {BehaviorSubject, merge, Observable, of, range, Subject} from "rxjs";
import {ActivityLogEntry, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../common-dialog/common-dialog.service";
import {DateTime} from "luxon";
import {BglStatsService} from "../../api/bgl-stats.service";
import {UserService} from "../../api/user.service";
import {catchError, concatMap, map, mergeMap, takeUntil, tap, throttleTime} from "rxjs/operators";
import {MatDialog} from "@angular/material/dialog";
import {ActivityLogEntryDialogParams, NewActivityLogEntryDialogComponent} from "../new-activity-log-entry-dialog/new-activity-log-entry-dialog.component";
import {AppConfigService} from "../../api/app-config.service";
import {DashboardService} from "../../pages/dashboard/dashboard.service";
import {DEFAULTS} from "../../defaults";
import {CollectionViewer, DataSource, ListRange} from "@angular/cdk/collections";
import {PageService} from "../../pages/page.service";

@Component({
    selector: 'app-activity-log-list',
    templateUrl: './activity-log-list.component.html',
    styleUrls: ['./activity-log-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityLogListComponent extends DataSource<ActivityLogSearchHit> implements OnInit, OnChanges, OnDestroy {
    @Input() options: ActivityLogQueryParams | undefined | null = undefined;
    @Input() pageSize = 10;

    readonly logEntries$ = new BehaviorSubject<ActivityLogSearchHit[]>([]);
    readonly destroying$ = new Subject<boolean>();
    private readonly changed$ = new Subject<void>();
    listRange?: ListRange;

    readonly activityLogEntryCategory = ActivityLogEntryCategory;

    constructor(
        public activityLogService: ActivityLogService,
        public bglStatsService: BglStatsService,
        public userService: UserService,
        private pageService: PageService,
        private snackBar: MatSnackBar,
        private appConfigService: AppConfigService,
        private appDialogService: DialogService,
        private dialogService: MatDialog,
        private dashboardService: DashboardService
    ) {
        super();
    }

    connect(collectionViewer: CollectionViewer): Observable<readonly (ActivityLogSearchHit)[]> {
        merge(
            collectionViewer.viewChange.pipe(
                mergeMap(listRange => {
                    this.listRange = listRange;
                    return this.fetchPages();
                }),
                takeUntil(this.destroying$)
            ),
            this.activityLogService.refresh$,
            this.activityLogService.changed$,
            this.changed$
        ).pipe(
            throttleTime(this.appConfigService.queryDebounceInterval, undefined, {leading: true, trailing: true}),
            mergeMap(() => this.fetchPages()),
            takeUntil(this.destroying$)
        ).subscribe();

        return this.logEntries$;
    }

    disconnect(collectionViewer: CollectionViewer): void {
        this.destroying$.next(true);
    }

    private fetchPages(): Observable<ActivityLogSearchHit[]> {
        let startPage, endPage: number;

        if (this.listRange) {
            startPage = Math.floor(this.listRange.start / this.pageSize);
            endPage = Math.floor((this.listRange.end - 1) / this.pageSize);
        } else {
            startPage = 0;
            endPage = 1;
        }

        if (endPage - startPage <= 0) {
            return of([]);
        } else {
            this.pageService.isLoading(true);
            return range(startPage, endPage - startPage).pipe(
                concatMap(pageIndex => this.activityLogService.searchEntries({
                    size: this.appConfigService.initialLogEntryQuerySize,
                    from: pageIndex * this.pageSize,
                    ...this.options
                })),
                tap(entries => {
                    this.pageService.isLoading(false);
                    this.logEntries$.next(entries);
                }),
                catchError(() => {
                    this.pageService.isLoading(false);
                    this.snackBar.open('Error occurred when querying the activity log');
                    return of([]);
                })
            );
        }
    }

    ngOnInit() {
        // If a dashboard log entry marker is clicked, display the edit dialog
        this.dashboardService.activityLogMarkerClicked$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(logEntryId => {
            this.editLogEntryById(logEntryId);
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        // Reset virtual scroll viewport range as we're about to filter or sort the view
        this.listRange = undefined;

        this.changed$.next();
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
