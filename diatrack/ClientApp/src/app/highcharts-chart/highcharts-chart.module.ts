import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HighchartsChartComponent} from './highcharts-chart.component';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [
        HighchartsChartComponent
    ],
    exports: [
        HighchartsChartComponent
    ]
})
export class HighchartsChartModule {}
