import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DashboardComponent} from './dashboard.component';
import {AppCoreModule} from "../../app-core.module";
import {HighchartsChartModule} from "../../highcharts-chart/highcharts-chart.module";
import {ActivityLogModule} from "../../activity-log/activity-log.module";

@NgModule({
    imports: [
        CommonModule,
        AppCoreModule,
        HighchartsChartModule,
        ActivityLogModule
    ],
    declarations: [
        DashboardComponent
    ]
})
export class DashboardModule {
}
