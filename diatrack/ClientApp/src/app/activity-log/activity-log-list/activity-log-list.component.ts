import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivityLogService} from "../activity-log.service";
import {Observable, Subject} from "rxjs";
import {ActivityLogEntry, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../common-dialog/common-dialog.service";
import {DateTime} from "luxon";
import {BglStatsService} from "../../api/bgl-stats.service";
import {UserService} from "../../api/user.service";
import {map} from "rxjs/operators";
import {MatDialog} from "@angular/material/dialog";
import {ActivityLogEntryDialogParams, NewActivityLogEntryDialogComponent} from "../new-activity-log-entry-dialog/new-activity-log-entry-dialog.component";

@Component({
    selector: 'app-activity-log-list',
    templateUrl: './activity-log-list.component.html',
    styleUrls: ['./activity-log-list.component.scss']
})
export class ActivityLogListComponent implements OnInit, OnDestroy {

    readonly destroying$ = new Subject<boolean>();

    readonly activityLogEntryCategory = ActivityLogEntryCategory;

    constructor(
        public activityLogService: ActivityLogService,
        public bglStatsService: BglStatsService,
        public userService: UserService,
        private snackBar: MatSnackBar,
        private appDialogService: DialogService,
        private dialogService: MatDialog
    ) { }

    ngOnInit() {
        this.activityLogService.refreshEntries();
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
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

        return dialogRef.afterClosed().pipe(map(result => {
            return result;
        }));
    }

    deleteLogEntry(logEntry: ActivityLogEntry) {
        this.activityLogService.deleteEntry(logEntry.id).subscribe(() => {
            this.activityLogService.refreshEntries();
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
                return this.bglStatsService.scaleBglValue(logEntry.bgl!, bglUnits)
            } else {
                return undefined;
            }
        }));
    }
}
