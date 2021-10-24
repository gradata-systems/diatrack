import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DashboardComponent} from './dashboard.component';
import {AppCoreModule} from "../../app-core.module";
import {MatRadioModule} from "@angular/material/radio";
import {MatInputModule} from "@angular/material/input";


@NgModule({
    imports: [
        CommonModule,
        AppCoreModule,
        MatRadioModule,
        MatInputModule
    ],
    declarations: [
        DashboardComponent
    ]
})
export class DashboardModule {
}
