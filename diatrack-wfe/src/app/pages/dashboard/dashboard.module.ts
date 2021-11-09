import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DashboardComponent} from './dashboard.component';
import {AppCoreModule} from "../../app-core.module";
import {HighchartsChartModule} from "../../highcharts-chart/highcharts-chart.module";
import {ActivityLogModule} from "../../activity-log/activity-log.module";
import {RouterModule} from "@angular/router";
import { DashboardSettingsComponent } from './dashboard-settings/dashboard-settings.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AppCoreModule,
        HighchartsChartModule,
        ActivityLogModule
    ],
    declarations: [
        DashboardComponent,
        DashboardSettingsComponent
    ]
})
export class DashboardModule {
}
