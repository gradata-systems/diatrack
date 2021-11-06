import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {HIGHCHARTS_BASE_OPTIONS} from './base-options';
import {AxisSetExtremesEventObject, chart, Chart, ChartSelectionContextObject, merge, Options, Point, setOptions} from 'highcharts';
import {EMPTY, Observable, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';

@Component({
    selector: 'highcharts-chart',
    exportAs: 'highartsChart',
    template: `
        <div class="highcharts-chart" #chart></div>
    `,
    styleUrls: ['./highcharts-chart.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HighchartsChartComponent implements OnInit, OnDestroy
{
    @ViewChild('chart', { static: true }) private chartEl?: ElementRef;

    private _chart: Chart | undefined;
    get chart() { return this._chart; }

    /**
     * Allow bind mapping to a Highcharts `Options` object. Changing these options will result in the
     * chart to be regenerated. The alternative to this is via the `update()` method, which returns
     * an Observable.
     */
    private _options: Options | undefined;
    get options() { return this._options; }
    @Input() set options(options) {
        this.update(options).subscribe();
    }

    /**
     * Enables databinding to axis extremes
     */
    private _extremes: Array<number> | undefined;
    @Output() extremesChange: EventEmitter<Array<number>> = new EventEmitter();
    get extremes() { return this._extremes; }
    @Input() set extremes(value: Array<number> | undefined) {
        this._extremes = value;
        // if (this.chart && this.extremes && this.extremes.length === 2)
        //     this.chart.xAxis[0].setExtremes(this.extremes[0], this.extremes[1], true, false);
        // else if (this.chart && this.chart.xAxis[0])
        //     this.chart.xAxis[0].setExtremes(undefined, undefined);

        this.subRangeSelected = this.isSubRangeSelected();
        this.extremesChange.emit(this.extremes);
    }

    /**
     * Whether a range other than the data extremes is selected
     */
    subRangeSelected = false;

    /**
     * When set, selects points based on the provided X values.
     * The consumer of the chart is responsible for responding to Highcharts point 'selected' events and
     * tracking selected points.
     */
    private _selectedPoints: Array<number | string> = [];
    get selectedPoints() { return this._selectedPoints; }
    @Input() set selectedPoints(value: Array<number | string>) {
        this._selectedPoints = value;
        this.selectPoints(this.selectedPoints);
    }

    @Output() areaSelect: EventEmitter<ChartSelectionContextObject> = new EventEmitter();

    /*
    Events
     */
    loaded$ = new Subject<void>();
    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(private zone: NgZone)
    {
        setOptions({
            lang: {
                thousandsSep: ','
            }
        });
    }

    private isSubRangeSelected(): boolean
    {
        if (this.chart && this.chart.xAxis && this.chart.xAxis[0])
        {
            const extremes = this.chart.xAxis[0].getExtremes();
            return extremes.min > extremes.dataMin || extremes.max < extremes.dataMax;
        }

        return false;
    }

    ngOnInit()
    {
        // this.regenerate();
    }

    ngOnDestroy()
    {
        this.destroy$.next(true);
        this.destroy$.complete();

        this.destroy();
        this._options = undefined;
    }

    /**
     * Regenerates the chart with a new set of parameters
     * @param options
     */
    update(options: Options | undefined): Observable<void>
    {
        // TODO: Preserve existing bindings and values
        if (options)
        {
            this._options = merge(HIGHCHARTS_BASE_OPTIONS, options);
            return this.regenerate(this.options);
        }
        else
        {
            // Destroy the chart if it currently exists
            if (this._options)
                this.destroy();

            this._options = undefined;
            return EMPTY;
        }
    }

    /**
     * Returns the X values of any points between or equalling the specified X value range
     */
    getPointsWithinRange(min: number, max: number): Array<Point>
    {
        const xValues: Array<Point> = [];
        if (this.chart)
        {
            this.chart.series.forEach((series) => {
                series.data.forEach((point) => {
                    if (point.x >= min && point.x <= max && !xValues.find((p) => p.x === point.x))
                        xValues.push(point);
                });
            });
        }

        return xValues;
    }

    reflow()
    {
        this.zone.runOutsideAngular(() => {
            setTimeout(() => {
                if (this.chart)
                    this.chart.reflow();
            });
        });
    }

    deselectAllPoints() {
        if (this.chart) {
            this.chart.series.forEach(series => {
                series.points.forEach(point => {
                    point.select(false);
                });
            });
        }
    }

    /**
     * For all selected series, select all points matching an X or 'name' value in the provided array
     */
    private selectPoints(selectedPoints: Array<string | number>)
    {
        const selectedPointSet: ReadonlySet<string | number> = new Set(selectedPoints);
        const selectedPointType = selectedPoints.length > 0 ? typeof selectedPoints[0] : '';

        if (this.chart)
        {
            this.chart.series.forEach((series) => {
                series.points.forEach((point) => {
                    let found = false;
                    if (selectedPointType === 'string')
                        found = selectedPointSet.has(point.name);
                    else
                        found = selectedPointSet.has(point.x);

                    point.select(found, true);
                });
            });
        }
    }

    private onAfterSetExtremes(event: AxisSetExtremesEventObject)
    {
        this.extremes = [event.min, event.max];
    }

    private regenerate(oldOptions?: Options): Observable<void>
    {
        return this.generate(oldOptions).pipe(
            takeUntil(this.destroy$),
            map((chartInstance) => {
                this._chart = chartInstance;
                if (this.chart)
                {
                    // if (this.selectedPoints)
                    //     this.selectPoints(this.selectedPoints);
                    // if (this.extremes && this.extremes.length === 2 && this.chart.xAxis[0])
                    //     this.chart.xAxis[0].setExtremes(this.extremes[0], this.extremes[1]);

                    this.reflow();
                    this.loaded$.next();
                }

                this.subRangeSelected = this.isSubRangeSelected();
            })
        );
    }

    /**
     * Generates a chart using the set options
     */
    private generate(oldOptions?: Options): Observable<Chart>
    {
        return new Observable((subscription) => {
            if (this.options !== undefined)
            {
                if (this.chart)
                {
                    this.zone.runOutsideAngular(() => {
                        this.chart!.update(this.options!, true, true, false);
                        subscription.next(this.chart);
                        subscription.complete();
                    });

                    return;
                } else {
                    this.destroy();
                    this.zone.runOutsideAngular(() => {
                        if (this.chartEl) {
                            chart(this.chartEl.nativeElement, this.options!, (chart) => {
                                this._chart = chart;
                                subscription.next(chart);
                                subscription.complete();
                            });
                        } else {
                            throw new Error('Chart element not found')
                        }
                    });
                }
            }
            else
            {
                this.destroy();
                subscription.next();
                subscription.complete();
            }
        });
    }

    /**
     * Destroys the chart instance
     */
    destroy()
    {
        this.zone.runOutsideAngular(() => {
            if (this.chart)
            {
                this.chart.destroy();
                this._chart = undefined;
            }
        });
    }
}
