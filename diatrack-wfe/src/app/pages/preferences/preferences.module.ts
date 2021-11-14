import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {PreferencesComponent} from "./preferences.component";
import {AppCoreModule} from "../../app-core.module";
import {DataSourcePrefsComponent} from './data-source-prefs/data-source-prefs.component';
import {NewDataSourceDialogComponent} from './data-source-prefs/new-data-source-dialog/new-data-source-dialog.component';
import {TreatmentPrefsComponent} from './treatment-prefs/treatment-prefs.component';
import {RouterModule} from "@angular/router";
import {GenerateShareTokenDialogComponent} from './data-source-prefs/generate-share-token-dialog/generate-share-token-dialog.component';


@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AppCoreModule
    ],
    declarations: [
        PreferencesComponent,
        DataSourcePrefsComponent,
        NewDataSourceDialogComponent,
        TreatmentPrefsComponent,
        GenerateShareTokenDialogComponent,
    ]
})
export class PreferencesModule {
}
