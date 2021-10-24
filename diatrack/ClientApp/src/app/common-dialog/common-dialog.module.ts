import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfirmationDialogComponent} from './confirmation-dialog/confirmation-dialog.component';
import {AppCoreModule} from "../app-core.module";

@NgModule({
    imports: [
        CommonModule,
        AppCoreModule
    ],
    declarations: [
        ConfirmationDialogComponent
    ]
})
export class CommonDialogModule {
}
