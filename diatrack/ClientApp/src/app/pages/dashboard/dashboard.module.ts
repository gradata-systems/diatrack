import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DashboardComponent} from './dashboard.component';
import {AppCoreModule} from "../../app-core.module";
import {HighchartsChartModule} from "../../highcharts-chart/highcharts-chart.module";

@NgModule({
    imports: [
        CommonModule,
        AppCoreModule,
        HighchartsChartModule
    ],
    declarations: [
        DashboardComponent
    ]
})
export class DashboardModule {
}
