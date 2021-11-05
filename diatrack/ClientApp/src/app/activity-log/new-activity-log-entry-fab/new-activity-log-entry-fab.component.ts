import {Component} from '@angular/core';
import {ActivityLogService} from "../activity-log.service";
import {MatDialog} from "@angular/material/dialog";
import {ActivityLogEntry, ActivityLogEntryCategoryInfo, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";
import {Observable} from "rxjs";
import {NewActivityLogEntryDialogComponent, ActivityLogEntryDialogParams} from "../new-activity-log-entry-dialog/new-activity-log-entry-dialog.component";
import {map, mergeMap} from "rxjs/operators";
import {DataSourceService} from "../../api/data-source.service";
import {DashboardService} from "../../pages/dashboard/dashboard.service";
import {DateTime} from "luxon";
import {BglStatsService} from "../../api/bgl-stats.service";
import {UserService} from "../../api/user.service";
import {DEFAULTS} from "../../defaults";
import {BglUnit} from "../../api/models/user-preferences";

@Component({
    selector: 'app-new-activity-log-entry-fab',
    templateUrl: './new-activity-log-entry-fab.component.html',
    styleUrls: ['./new-activity-log-entry-fab.component.scss']
})
export class NewActivityLogEntryFabComponent {

    readonly logEntryCategories: ReadonlyArray<[ActivityLogEntryCategory, ActivityLogEntryCategoryInfo]>;

    constructor(
        public activityLogService: ActivityLogService,
        public dataSourceService: DataSourceService,
        private dashboardService: DashboardService,
        private bglStatsService: BglStatsService,
        private userService: UserService,
        private dialogService: MatDialog
    ) {
        this.logEntryCategories = Array.from(this.activityLogService.activityLogCategories);
    }

    openNewEntryDialog(type: ActivityLogEntryCategory, category: ActivityLogEntryCategoryInfo): Observable<ActivityLogEntry> {
        return this.userService.userPreferences$.pipe(mergeMap(userPrefs => {
            const bglUnits = userPrefs?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment!.bglUnit;
            const selectedPoint = this.dashboardService.selectedPoint;
            let atTime: DateTime | undefined;
            let bgl: number | undefined;

            if (selectedPoint && selectedPoint.y !== undefined) {
                // Point on the dashboard is selected, so record the log entry against the time of that point
                atTime = DateTime.fromMillis(selectedPoint.x);
                bgl = this.bglStatsService.scaleBglValue(selectedPoint.y, bglUnits, BglUnit.MgDl);
            }

            const dialogRef = this.dialogService.open(NewActivityLogEntryDialogComponent, {
                width: '300px',
                data: {
                    atTime,
                    bgl,
                    entryType: type,
                    entryCategory: category
                } as ActivityLogEntryDialogParams
            });

            return dialogRef.afterClosed();
        }));
    }
}
