import {Component} from '@angular/core';
import {ActivityLogService} from "../activity-log.service";
import {MatDialog} from "@angular/material/dialog";
import {ActivityLogEntry, ActivityLogEntryCategoryInfo, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";
import {Observable} from "rxjs";
import {NewActivityLogEntryDialogComponent, ActivityLogEntryDialogParams} from "../new-activity-log-entry-dialog/new-activity-log-entry-dialog.component";
import {map} from "rxjs/operators";
import {DataSourceService} from "../../api/data-source.service";

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
        private dialogService: MatDialog
    ) {
        this.logEntryCategories = Array.from(this.activityLogService.activityLogCategories);
    }

    openNewEntryDialog(type: ActivityLogEntryCategory, category: ActivityLogEntryCategoryInfo): Observable<ActivityLogEntry> {
        const dialogRef = this.dialogService.open(NewActivityLogEntryDialogComponent, {
            width: '300px',
            data: {
                entryType: type,
                entryCategory: category
            } as ActivityLogEntryDialogParams
        });

        return dialogRef.afterClosed().pipe(map(result => {
            return result;
        }));
    }
}
