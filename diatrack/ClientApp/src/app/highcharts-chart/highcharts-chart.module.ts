import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HighchartsChartComponent} from './highcharts-chart.component';
import * as Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';

HighchartsMore(Highcharts);

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
