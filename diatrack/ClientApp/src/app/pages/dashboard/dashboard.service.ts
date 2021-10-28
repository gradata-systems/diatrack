import {Injectable} from '@angular/core';
import {interval, Observable, of, Subject, timer} from "rxjs";
import {DashboardPreferences, getBglUnitDisplayValue} from "../../api/models/UserPreferences";
import {UserService} from "../../api/user.service";
import {BglStatsService} from "../../api/bgl-stats.service";
import {filter, map, mergeMap, repeatWhen, take, takeWhile} from "rxjs/operators";
import {DateTime} from "luxon";
import {DEFAULTS} from "../../defaults";
import {numberFormat, Options, Point} from "highcharts";
import {BglDataPoint} from "../../api/models/BglDataPoint";
import {AppConfigService} from "../../api/app-config.service";

@Injectable({
    providedIn: 'root'
})
export class DashboardService {

    dashboardSettings?: DashboardPreferences;

    // How often (in milliseconds) to check for new data
    readonly refresh$ = new Subject<void>();

    constructor(
        private appConfigService: AppConfigService,
        private userService: UserService,
        private bglStatsService: BglStatsService
    ) {
        // Refresh when a user logs on
        this.userService.activeUser$.subscribe(user => {
            this.refresh$.next();
        });

        this.userService.userPreferences$.subscribe(prefs => {
            this.dashboardSettings = prefs?.dashboard;
        })

        // Trigger refresh on timer
        interval(this.appConfigService.refreshInterval).pipe(
            filter(x => this.appConfigService.autoRefreshEnabled)
        ).subscribe(x => this.refresh$.next());
    }

    refresh() {
        this.refresh$.next();
    }

    getBglHistogramChartOptions(): Observable<Options | undefined> {
        return this.userService.userPreferences$.pipe(mergeMap(userPreferences => {
            const histogramSettings = userPreferences?.dashboard?.bglStatsHistogram;
            const bglUnit = userPreferences?.treatment?.bglUnit || DEFAULTS.userPreferences.treatment!.bglUnit;
            const defaults = DEFAULTS.userPreferences.dashboard!.bglStatsHistogram;
            const fromTime: DateTime = DateTime.now().minus({ hours: histogramSettings?.timeRangeHours || defaults.timeRangeHours });
            const toTime: DateTime = DateTime.now();
            const targetBglRange = userPreferences?.treatment?.targetBglRange || DEFAULTS.userPreferences.treatment!.targetBglRange;

            return this.bglStatsService.getAccountStatsHistogram({
                start: fromTime.toISO(),
                end: toTime.toISO(),
                buckets: histogramSettings?.buckets || defaults.buckets
            }).pipe(map(response => {
                const accountId = Object.keys(response)[0];
                let previousStat: BglDataPoint | undefined = undefined;

                const data = response[accountId].stats.map(stat => {
                    const delta = previousStat !== undefined ? (stat.stats.average - previousStat?.stats.average) : null;
                    previousStat = stat;
                    return {
                        x: DateTime.fromISO(stat.timestamp).toMillis(),
                        y: this.bglStatsService.scaleBglValue(stat.stats.average, bglUnit),
                        color: '#ffb635',
                        options: {
                            custom: {
                                delta: delta ? this.bglStatsService.scaleBglValue(delta, bglUnit) : null
                            } as any
                        }
                    } as Point;
                });

                return {
                    chart: {
                        type: 'line'
                    },
                    title: {
                        text: `Blood Glucose level (${getBglUnitDisplayValue(bglUnit)})`
                    },
                    xAxis: {
                        type: 'datetime',
                        max: DateTime.now().toMillis()
                    },
                    yAxis: {
                        min: 1,
                        softMax: userPreferences?.treatment?.targetBglRange?.max,
                        title: undefined,
                        plotLines: [{
                            color: 'rgba(2, 166, 36, 0.3)',
                            width: 3,
                            value: targetBglRange.min
                        },{
                            color: 'rgba(2, 166, 36, 0.3)',
                            width: 3,
                            value: targetBglRange.max
                        }],
                        plotBands: [{
                            color: 'rgba(255, 0, 0, 0.1)',
                            from: 0,
                            to: userPreferences?.treatment?.bglLowThreshold || DEFAULTS.userPreferences.treatment!.bglLowThreshold
                        }]
                    },
                    tooltip: {
                        useHTML: true,
                        formatter: function(tooltip) {
                            const delta = this.point.options.custom ? this.point.options.custom['delta'] : null;
                            const datetime = DateTime.fromMillis(this.x);
                            const date = datetime.toFormat('dd MMM');
                            const time = datetime.toFormat('HH:mm');
                            return `<div class="chart-tooltip"><table>` +
                                `<tr><th>${date}</th><th>${time}</th></tr>` +
                                `<tr><td>BGL</td><td>${numberFormat(this.y, 1)} ${getBglUnitDisplayValue(bglUnit)}</td></tr>` +
                                `<tr><td>Change</td><td>${numberFormat(delta, 2)}</td></tr>` +
                                `</table></div>`;
                        }
                    },
                    legend: {
                        enabled: false
                    },
                    plotOptions: {
                        line: {
                            connectNulls: false,
                            color: '#f37711',
                            marker: {
                                lineWidth: 1,
                                lineColor: 'rgba(255, 255, 255, 0.5)'
                            },
                            dataLabels: {
                                enabled: histogramSettings?.dataLabels !== undefined ? histogramSettings.dataLabels : defaults.dataLabels,
                                color: 'rgba(255, 255, 255, 0.6)',
                                padding: 10,
                                formatter: function(options) {
                                    return this.y ? numberFormat(this.y, 1) : null;
                                }
                            }
                        }
                    },
                    series: [{
                        name: 'Blood glucose level',
                        data: data
                    }],
                } as Options;
            }));
        }));
    }
}
