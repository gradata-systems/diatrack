import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AppCoreModule} from "../app-core.module";
import {NotificationDialogComponent} from './notification-dialog/notification-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        AppCoreModule
    ],
    declarations: [
        NotificationDialogComponent
    ]
})
export class CommonDialogModule {
}
