import {Injectable, NgZone} from '@angular/core';
import {interval, Observable, of, Subject} from "rxjs";
import {DashboardPreferences, getBglUnitDisplayValue, PlotColour} from "../../api/models/user-preferences";
import {UserService} from "../../api/user.service";
import {BglStatsService} from "../../api/bgl-stats.service";
import {filter, map, mergeMap, take} from "rxjs/operators";
import {DateTime} from "luxon";
import {DEFAULTS} from "../../defaults";
import {numberFormat, Options, Point, PointOptionsObject} from "highcharts";
import {BglDataPoint} from "../../api/models/bgl-data-point";
import {AppConfigService} from "../../api/app-config.service";
import {ActivityLogService} from "../../activity-log/activity-log.service";
import {AppIconService} from "../../app-icon.service";
import {ActivityLogEntry, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";

@Injectable({
    providedIn: 'root'
})
export class DashboardService {

    dashboardSettings?: DashboardPreferences;

    // How often (in milliseconds) to check for new data
    readonly refresh$ = new Subject<void>();

    // Used to trigger the log entry edit dialog
    readonly activityLogMarkerClicked$: Subject<string> = new Subject<string>();

    constructor(
        private appConfigService: AppConfigService,
        private userService: UserService,
        private bglStatsService: BglStatsService,
        private activityLogService: ActivityLogService,
        private appIconService: AppIconService,
        private ngZone: NgZone
    ) {
        // Refresh when a user logs on
        this.userService.activeUser$.subscribe(user => {
            this.triggerRefresh();
        });

        this.userService.userPreferences$.subscribe(prefs => {
            this.dashboardSettings = prefs?.dashboard;
        });

        // Trigger refresh on timer
        interval(this.appConfigService.refreshInterval).pipe(
            filter(x => this.appConfigService.autoRefreshEnabled)
        ).subscribe(x => {
            this.triggerRefresh();
        });
    }

    triggerRefresh() {
        this.refresh$.next();
    }

    getBglHistogramChartOptions(): Observable<Options | undefined> {
        return this.userService.userProfile$.pipe(take(1), mergeMap(userProfile => {
            const userPrefs = userProfile.preferences;
            return this.activityLogService.searchEntries({
                size: this.appConfigService.initialLogEntryQuerySize,
                fromDate: DateTime.now().minus({ hours: userPrefs?.dashboard?.bglStatsHistogram.timeRangeHours })
            }).pipe(mergeMap(logEntries => {
                const histogramSettings = userPrefs?.dashboard?.bglStatsHistogram;
                const bglUnit = userPrefs?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment!.bglUnit;
                const defaults = DEFAULTS.userPreferences.dashboard!.bglStatsHistogram;
                const fromTime: DateTime = DateTime.now().minus({hours: histogramSettings?.timeRangeHours ?? defaults.timeRangeHours});
                const toTime: DateTime = DateTime.now();
                const targetBglRange = userPrefs?.treatment?.targetBglRange ?? DEFAULTS.userPreferences.treatment!.targetBglRange;
                const targetBglRangeMid = ((targetBglRange.max - targetBglRange.min) / 2) + targetBglRange.min;
                const bglLowThreshold = userPrefs?.treatment?.bglLowThreshold ?? DEFAULTS.userPreferences.treatment!.bglLowThreshold;
                const pointColourMode = histogramSettings?.plotColour ?? defaults.plotColour;
                const uniformColour = '#ff3900';

                return this.bglStatsService.getAccountStatsHistogram({
                    start: fromTime.toISO(),
                    end: toTime.toISO(),
                    buckets: histogramSettings?.buckets ?? defaults.buckets
                }).pipe(map(bglStatsResponse => {
                    const accountId = Object.keys(bglStatsResponse)[0];
                    let previousStat: BglDataPoint | undefined = undefined;
                    let maxBgl = 0;

                    const bglSeriesData = bglStatsResponse[accountId].stats.map(stat => {
                        const scaledBgl = this.bglStatsService.scaleBglValueFromMgDl(stat.stats.average, bglUnit);
                        const delta = previousStat !== undefined ? (stat.stats.average - previousStat?.stats.average) : null;
                        previousStat = stat;

                        maxBgl = Math.max(maxBgl, scaledBgl);

                        return {
                            x: DateTime.fromISO(stat.timestamp, {zone: 'UTC'}).toLocal().toMillis(),
                            y: scaledBgl,
                            color: pointColourMode === PlotColour.Uniform ? uniformColour : this.bglStatsService.getBglColour(scaledBgl),
                            options: {
                                custom: {
                                    delta: delta ? this.bglStatsService.scaleBglValueFromMgDl(delta, bglUnit) : null
                                } as any
                            }
                        } as Point;
                    });

                    let activityLogSeriesData: PointOptionsObject[] = [];
                    if (histogramSettings?.activityLog === true || (histogramSettings?.activityLog === undefined && defaults.activityLog)) {
                        activityLogSeriesData = logEntries.map(logEntry => {
                            const iconId = this.activityLogService.getLogEntryIcon(logEntry);
                            let scaledBgl = this.bglStatsService.scaleBglValueFromMgDl(logEntry.bgl !== undefined ? logEntry.bgl : 0, bglUnit);

                            // If a manual BGL reading, prefer the recorded BGL over the data source reading
                            if (logEntry.category === ActivityLogEntryCategory.BglReading && logEntry.properties.bglReading && logEntry.properties.bglUnits) {
                                scaledBgl = this.bglStatsService.scaleBglValue(logEntry.properties.bglReading, logEntry.properties.bglUnits, bglUnit);
                            }

                            return {
                                x: DateTime.fromISO(logEntry.created, {zone: 'UTC'}).toLocal().toMillis(),
                                y: scaledBgl,
                                marker: {
                                    symbol: iconId ? `url(${this.appIconService.getIconUrl(iconId)})` : undefined
                                },
                                options: {
                                    custom: {
                                        id: logEntry.id,
                                        category: this.activityLogService.getLogEntryCategoryName(logEntry),
                                        value: DashboardService.getLogEntryDataLabel(logEntry),
                                        notes: logEntry.notes
                                    }
                                }
                            } as PointOptionsObject;
                        });
                    }

                    const self = this;
                    return {
                        chart: {
                            type: 'line'
                        },
                        title: {
                            text: `Blood Glucose level (${getBglUnitDisplayValue(bglUnit)})`
                        },
                        xAxis: {
                            type: 'datetime',
                            max: DateTime.now().toMillis(),
                            maxPadding: 10
                        },
                        yAxis: {
                            min: 1,
                            softMax: userPrefs?.treatment?.targetBglRange?.max,
                            title: undefined,
                            labels: {
                                x: 8,
                                y: -5,
                                align: 'left'
                            },
                            plotLines: [{
                                color: 'rgba(2, 166, 36, 0.3)',
                                width: 3,
                                value: targetBglRange.min
                            }, {
                                color: 'rgba(2, 166, 36, 0.3)',
                                width: 3,
                                value: targetBglRange.max
                            }],
                            plotBands: [{
                                color: 'rgba(200, 0, 0, 0.1)',
                                from: 0,
                                to: bglLowThreshold
                            }]
                        },
                        tooltip: {
                            useHTML: true,
                            formatter: function (tooltip) {
                                if (this.series.type === 'line') {
                                    const delta = this.point.options.custom ? this.point.options.custom['delta'] : null;
                                    const datetime = DateTime.fromMillis(this.x);
                                    const date = datetime.toFormat('dd MMM');
                                    const time = datetime.toFormat('HH:mm');
                                    const pointColour = self.bglStatsService.getBglColour(this.y);

                                    return `<div class="chart-tooltip"><table>` +
                                        `<tr><th>${date}</th><th>${time}</th></tr>` +
                                        `<tr><td>BGL</td><td style="color: ${pointColour}">${numberFormat(this.y, 1)} ${getBglUnitDisplayValue(bglUnit)}</td></tr>` +
                                        `<tr><td>Change</td><td>${numberFormat(delta, 2)}</td></tr>` +
                                        `</table></div>`;
                                } else {
                                    const properties = this.point.options.custom!;
                                    return `<div class="chart-tooltip"><table>` +
                                        `<tr><th>${properties.category}</th></tr>` +
                                        `<tr><td>${properties.value}</td></tr>` +
                                        `<tr><td>${properties.notes ?? ''}</td></tr>` +
                                        `</table></div>`;
                                }
                            }
                        },
                        legend: {
                            enabled: false
                        },
                        plotOptions: {
                            series: {
                                stickyTracking: false
                            },
                            line: {
                                connectNulls: false,
                                lineWidth: 1,
                                marker: {
                                    lineWidth: 1,
                                    lineColor: 'rgba(255, 255, 255, 0.4)'
                                },
                                color: pointColourMode === PlotColour.Uniform ? uniformColour : {
                                    linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                                    stops: [
                                        [0, 'yellow'],
                                        [1 - (targetBglRange.max / maxBgl), 'yellow'],
                                        [1 - (targetBglRangeMid / maxBgl), 'green'],
                                        [1 - (targetBglRange.min / maxBgl), 'green'],
                                        [1, 'orange']
                                    ] as any
                                },
                                dataLabels: {
                                    enabled: histogramSettings?.dataLabels !== undefined ? histogramSettings.dataLabels : defaults.dataLabels,
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    padding: 10,
                                    formatter: function (options) {
                                        return this.y ? numberFormat(this.y, 1) : null;
                                    }
                                }
                            },
                            scatter: {
                                events: {
                                    click: function(event) {
                                        // Trigger the display of the log entry edit dialog
                                        self.ngZone.run(() => {
                                            if (event.point.options.custom?.id) {
                                                self.activityLogMarkerClicked$.next(event.point.options.custom.id);
                                            }
                                        });
                                    }
                                },
                                dataLabels: {
                                    enabled: true,
                                    y: -15,
                                    formatter: function (options) {
                                        return `${this.point.options.custom!.value}`;
                                    }
                                }
                            }
                        },
                        series: [{
                            name: 'Blood glucose level',
                            data: bglSeriesData
                        },{
                            type: 'scatter',
                            name: 'Log entries',
                            opacity: 0.6,
                            cursor: 'pointer',
                            allowPointSelect: true,
                            data: activityLogSeriesData
                        }],
                    } as Options;
                }));
            }));
        }));
    }

    private static getLogEntryDataLabel(logEntry: ActivityLogEntry) {
        switch (logEntry.category) {
            case ActivityLogEntryCategory.Insulin:
                return `${logEntry.properties.insulinUnits} units`;
            case ActivityLogEntryCategory.BasalRateChange:
                return `${logEntry.properties.basalRatePercent} %`;
            case ActivityLogEntryCategory.Food:
                return `${logEntry.properties.foodGrams} g`;
            case ActivityLogEntryCategory.BglReading:
                return `${logEntry.properties.bglReading?.toFixed(1)}`;
            case ActivityLogEntryCategory.Exercise:
                return `${logEntry.properties.exerciseDuration} mins`;
            default:
                return '';
        }
    }
}
