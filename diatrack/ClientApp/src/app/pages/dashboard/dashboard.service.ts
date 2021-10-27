import {Injectable} from '@angular/core';
import {Observable, of, Subject, timer} from "rxjs";
import {DashboardPreferences, getBglUnitDisplayValue} from "../../api/models/UserPreferences";
import {UserService} from "../../api/user.service";
import {BglStatsService} from "../../api/bgl-stats.service";
import {map, mergeMap, take, takeWhile} from "rxjs/operators";
import {DateTime} from "luxon";
import {DEFAULTS} from "../../defaults";
import {numberFormat, Options, Point} from "highcharts";
import {BglDataPoint} from "../../api/models/BglDataPoint";

@Injectable({
    providedIn: 'root'
})
export class DashboardService {

    dashboardSettings?: DashboardPreferences;

    // How often (in milliseconds) to check for new data
    private readonly refreshInterval = 5000;
    autoRefreshEnabled = true;
    readonly refresh$ = new Subject<void>();

    constructor(
        private userService: UserService,
        private bglStatsService: BglStatsService
    ) {
        // Trigger refresh on timer
        timer(this.refreshInterval, this.refreshInterval)
            .pipe(takeWhile(x => this.autoRefreshEnabled))
            .subscribe(x => this.refresh$.next());

        // Also refresh when a user logs on
        this.userService.activeUser$.subscribe(user => {
            this.refresh$.next();
        });

        this.userService.userPreferences$.subscribe(prefs => {
            this.dashboardSettings = prefs?.dashboard;
        })
    }

    refresh() {
        this.refresh$.next();
    }

    getBglHistogramChartOptions(): Observable<Options | undefined> {
        return this.userService.userPreferences$.pipe(mergeMap(userPreferences => {
            const histogramSettings = this.dashboardSettings?.bglStatsHistogram;
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
                    // Ignore empty date buckets
                    if (stat.stats.count === 0) {
                        return null;
                    }

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
                }).filter(point => point !== null);

                return {
                    chart: {
                        type: 'line'
                    },
                    title: {
                        text: `Blood Glucose level (${getBglUnitDisplayValue(bglUnit)})`
                    },
                    xAxis: {
                        type: 'datetime'
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
                                `<tr><td>Change</td><td>${numberFormat(delta, 1)}</td></tr>` +
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
