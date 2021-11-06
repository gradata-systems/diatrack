import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NewActivityLogEntryDialogComponent} from './new-activity-log-entry-dialog/new-activity-log-entry-dialog.component';
import {AppCoreModule} from "../app-core.module";
import {NewActivityLogEntryFabComponent} from './new-activity-log-entry-fab/new-activity-log-entry-fab.component';
import {ActivityLogListComponent} from './activity-log-list/activity-log-list.component';

@NgModule({
    imports: [
        CommonModule,
        AppCoreModule
    ],
    exports: [
        ActivityLogListComponent,
        NewActivityLogEntryFabComponent
    ],
    declarations: [
        NewActivityLogEntryDialogComponent,
        NewActivityLogEntryFabComponent,
        ActivityLogListComponent
    ]
})
export class ActivityLogModule {
}
