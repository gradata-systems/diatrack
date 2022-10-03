import {Injectable, NgZone, OnDestroy} from '@angular/core';
import {Observable, of, Subject} from "rxjs";
import {DashboardPreferences, getBglUnitDisplayValue, PlotColour, UserPreferences} from "../../api/models/user-preferences";
import {UserService} from "../../api/user.service";
import {BglStatsService} from "../../api/bgl-stats.service";
import {catchError, map, mergeMap, take} from "rxjs/operators";
import {DateTime} from "luxon";
import {DEFAULTS} from "../../defaults";
import {numberFormat, Options, Point, PointOptionsObject} from "highcharts";
import {BglDataPoint} from "../../api/models/bgl-data-point";
import {AppConfigService} from "../../api/app-config.service";
import {ActivityLogSearchHit, ActivityLogService} from "../../activity-log/activity-log.service";
import {AppIconService} from "../../app-icon.service";
import {ActivityLogEntry, ActivityLogEntryCategory} from "../../api/models/activity-log-entry";
import {mergeDeep} from "../../utilities";
import {HISTOGRAM_PROFILES} from "./dashboard-settings/histogram-profiles";
import {HistogramProfile} from "./histogram-profile";
import {MovingAverageModelType} from "../../api/models/moving-average-params";
import {AppCoreService} from "../../app-core.service";
import {MatSnackBar} from "@angular/material/snack-bar";

@Injectable({
    providedIn: 'root'
})
export class DashboardService implements OnDestroy {

    dashboardSettings?: DashboardPreferences;
    selectedPoint: Point | undefined;

    // How often (in milliseconds) to check for new data
    readonly refresh$ = new Subject<void>();
    private readonly destroying$ = new Subject<boolean>();

    // Used to trigger the log entry edit dialog
    readonly activityLogMarkerClicked$: Subject<string> = new Subject<string>();

    constructor(
        private appCoreService: AppCoreService,
        private appConfigService: AppConfigService,
        private userService: UserService,
        private bglStatsService: BglStatsService,
        private activityLogService: ActivityLogService,
        private appIconService: AppIconService,
        private snackBar: MatSnackBar,
        private ngZone: NgZone
    ) {
        // Refresh when a user logs on
        this.userService.activeUser$.subscribe(user => {
            this.triggerRefresh();
        });

        this.userService.userPreferences$.subscribe(prefs => {
            this.dashboardSettings = prefs?.dashboard;
        });

        // this.appCoreService.autoRefresh$.subscribe(() => {
        //     this.triggerRefresh();
        // });
    }

    triggerRefresh() {
        this.refresh$.next();
    }

    getBglHistogramChartOptions(): Observable<Options | undefined> {
        return this.userService.userPreferences$.pipe(
            take(1),
            mergeMap(userPrefs => {
                const histogramProfileType = userPrefs?.dashboard?.bglStatsHistogram.profileType ?? DEFAULTS.userPreferences.dashboard!.bglStatsHistogram.profileType;
                const histogramProfile = HISTOGRAM_PROFILES.get(histogramProfileType);

                return this.activityLogService.searchEntries({
                    size: this.appConfigService.initialLogEntryQuerySize,
                    fromDate: DateTime.now().minus(histogramProfile!.displayPeriod)
                }).pipe(mergeMap(logEntries => {
                    return this.generateBglHistogramChart(userPrefs, logEntries);
                }));
            }),
            catchError(error => {
                this.snackBar.open('Error getting the latest chart data');
                return of(undefined);
            })
        );
    }

    private generateBglHistogramChart(userPrefs: UserPreferences | undefined, logEntryHits: ActivityLogSearchHit[]) {
        const effectiveUserPrefs: UserPreferences = mergeDeep(userPrefs || {}, DEFAULTS.userPreferences);
        const histogramSettings = effectiveUserPrefs.dashboard!.bglStatsHistogram;
        const bglUnit = effectiveUserPrefs.treatment!.bglUnit;
        const movingAverageModelType = histogramSettings.movingAverage!.modelType;
        const defaults = DEFAULTS.userPreferences.dashboard!.bglStatsHistogram;
        const targetBglRange = effectiveUserPrefs.treatment!.targetBglRange;
        const targetBglRangeMid = ((targetBglRange.max - targetBglRange.min) / 2) + targetBglRange.min;
        const bglLowThreshold = effectiveUserPrefs.treatment!.bglLowThreshold;
        const pointColourMode = histogramSettings.plotColour;
        const uniformColour = '#ff3900';

        let histogramProfile: HistogramProfile;
        if (HISTOGRAM_PROFILES.has(histogramSettings.profileType)) {
            histogramProfile = HISTOGRAM_PROFILES.get(histogramSettings.profileType)!;
        } else {
            // Histogram profile type from preferences is invalid (may have been deleted), so fall back to default
            histogramProfile = HISTOGRAM_PROFILES.get(defaults.profileType)!;
        }

        const movingAverageEnabled = histogramSettings.movingAverage!.enabled;
        return this.bglStatsService.getAccountStatsHistogram({
            queryFrom: DateTime.now().minus(histogramProfile.queryPeriod).toISO(),
            queryTo: DateTime.now().toISO(),
            bucketTimeUnit: histogramProfile.bucketTimeUnit,
            bucketTimeFactor: histogramProfile.bucketTimeFactor,
            movingAverage: {
                enabled: movingAverageEnabled,
                modelType: movingAverageEnabled ? histogramSettings.movingAverage!.modelType : MovingAverageModelType.Simple, // If not enabled, just use simple type for efficiency
                alpha: histogramSettings.movingAverage!.alpha,
                window: Math.max(histogramSettings.movingAverage!.window ?? 0, histogramProfile.movingAveragePeriod * 2), // Must be at least twice the period, otherwise an error is thrown
                minimize: movingAverageModelType === MovingAverageModelType.HoltLinear || movingAverageModelType === MovingAverageModelType.HoltWinters,
                period: histogramProfile.movingAveragePeriod,
                predictionCount: histogramSettings.movingAverage!.predictionCount
            }
        }).pipe(map(bglStatsResponse => {
            if (!bglStatsResponse) {
                return;
            }

            const accountId = Object.keys(bglStatsResponse)[0];
            let previousStat: BglDataPoint | undefined = undefined;
            let maxBgl = 0;
            const bglDataPoints: Point[] = [];
            const trendDataPoints: Point[] = [];

            bglStatsResponse[accountId].stats.forEach(stat => {
                const x = DateTime.fromISO(stat.timestamp, {zone: 'UTC'}).toLocal().toMillis()

                if (stat.average?.value !== undefined) {
                    // Scaled BGL data point
                    const scaledBgl = this.bglStatsService.scaleBglValueFromMgDl(stat.average.value, bglUnit);
                    const delta = previousStat?.average?.value !== undefined ? (stat.average.value - previousStat?.average.value) : null;
                    previousStat = stat;

                    maxBgl = Math.max(maxBgl, scaledBgl);

                    bglDataPoints.push({
                        x: x,
                        y: scaledBgl,
                        color: pointColourMode === PlotColour.Uniform ? uniformColour : this.bglStatsService.getBglColour(scaledBgl),
                        options: {
                            custom: {
                                delta: delta ? this.bglStatsService.scaleBglValueFromMgDl(delta, bglUnit) : null
                            } as any
                        }
                    } as Point);
                }

                if (stat.movingAverage !== undefined && histogramSettings.movingAverage!.enabled) {
                    // Moving average statistic
                    trendDataPoints.push({
                        x: x,
                        y: this.bglStatsService.scaleBglValueFromMgDl(stat.movingAverage.value, bglUnit),
                        options: {
                            custom: {
                                future: stat.average === undefined
                            } as any
                        }
                    } as Point);
                }
            });

            let activityLogSeriesData: PointOptionsObject[] = [];
            if (histogramSettings?.activityLog === true || (histogramSettings?.activityLog === undefined && defaults.activityLog)) {
                activityLogSeriesData = logEntryHits.map(logEntryHit => {
                    const logEntry = logEntryHit.hit;
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
                            symbol: iconId ? `url(${this.appIconService.getLogActivityIconUrl(iconId)})` : undefined
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
                    text: `Blood glucose level (${getBglUnitDisplayValue(bglUnit)})`
                },
                xAxis: {
                    type: 'datetime',
                    min: DateTime.now().minus(histogramProfile.displayPeriod).toMillis(),
                    max: null
                },
                yAxis: {
                    min: 1,
                    softMax: histogramSettings.plotHeight ?? effectiveUserPrefs.treatment!.targetBglRange!.max,
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
                        if (this.series.index === 0) {
                            const delta = this.point.options.custom ? this.point.options.custom['delta'] : null;
                            const datetime = DateTime.fromMillis(this.point.x);
                            const date = datetime.toFormat('dd MMM');
                            const time = datetime.toFormat('HH:mm');
                            const pointColour = self.bglStatsService.getBglColour(this.point.y);

                            return `<div class="chart-tooltip"><table>` +
                                `<tr><th>${date}</th><th>${time}</th></tr>` +
                                `<tr><td>BGL</td><td style="color: ${pointColour}">${numberFormat(this.point.y!, 1)} ${getBglUnitDisplayValue(bglUnit)}</td></tr>` +
                                `<tr><td>Change</td><td>${numberFormat(delta, 2)}</td></tr>` +
                                `</table></div>`;
                        } else if (this.series.index === 1) {
                            const pointColour = self.bglStatsService.getBglColour(this.point.y);
                            const title: string = this.point.options.custom!['future'] === true ? 'Predicted' : 'Trend';
                            return `<div class="chart-tooltip"><table>` +
                                `<tr><th>${title}</th></tr>` +
                                `<tr><td>BGL</td><td style="color: ${pointColour}">${numberFormat(this.point.y!, 1)} ${getBglUnitDisplayValue(bglUnit)}</td></tr>` +
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
                        lineWidth: 2,
                        allowPointSelect: true,
                        marker: {
                            lineWidth: 1,
                            lineColor: 'rgba(255, 255, 255, 0.4)',
                            states: {
                                select: {
                                    radius: 8,
                                    lineColor: '#af0000',
                                    lineWidth: 2,
                                    fillColor: 'white'
                                }
                            }
                        },
                        dataLabels: {
                            enabled: histogramSettings?.dataLabels !== undefined ? histogramSettings.dataLabels : defaults.dataLabels,
                            color: 'rgba(255, 255, 255, 0.6)',
                            padding: 10,
                            formatter: function (options) {
                                return this.y ? numberFormat(this.y, 1) : null;
                            }
                        },
                        events: {
                            click: function (event) {
                                if (!event.point.selected) {
                                    // Record the selected point, so it may be used when creating a log entry
                                    self.selectedPoint = event.point;
                                } else {
                                    self.selectedPoint = undefined;
                                }
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
                    data: bglDataPoints,
                    color: pointColourMode === PlotColour.Uniform ? uniformColour : {
                        linearGradient: {x1: 0, x2: 0, y1: 0, y2: 1},
                        stops: [
                            [0, 'yellow'],
                            [1 - (targetBglRange.max / maxBgl), 'yellow'],
                            [1 - (targetBglRangeMid / maxBgl), 'green'],
                            [1 - (targetBglRange.min / maxBgl), 'green'],
                            [1, 'orange']
                        ] as any
                    }
                },{
                    name: 'Trend',
                    data: trendDataPoints,
                    opacity: 1,
                    zIndex: -1,
                    zoneAxis: 'x',
                    zones: [{
                        value: DateTime.now().toMillis(),
                        dashStyle: 'Solid',
                        color: 'rgba(0,219,255,0.3)'
                    }, {
                        dashStyle: 'Dot',
                        color: '#00dbff'
                    }],
                    marker: {
                        enabled: false
                    }
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

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
