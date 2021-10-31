import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {AppAuthService} from "../../auth/app-auth.service";
import {UserService} from "../../api/user.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {BehaviorSubject, merge, Observable, Subject} from "rxjs";
import {debounceTime, filter, map, mergeMap, take, takeUntil, throttleTime} from "rxjs/operators";
import {PlotColour} from "../../api/models/user-preferences";
import {DEFAULTS} from "../../defaults";
import {DashboardService} from "./dashboard.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Options} from "highcharts";
import {Router} from "@angular/router";
import {DateTime} from "luxon";
import {AppConfigService} from "../../api/app-config.service";
import {ActivityLogService} from "../../activity-log/activity-log.service";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {

    readonly loading$ = new BehaviorSubject<boolean>(false);
    settingsForm: FormGroup;
    bglHistogramChartOptions: Options | undefined;

    // Enum constants
    readonly plotColour = PlotColour;

    private destroying$ = new Subject<boolean>();

    constructor(
        private authService: AppAuthService,
        private appConfigService: AppConfigService,
        public userService: UserService,
        public dashboardService: DashboardService,
        private activityLogService: ActivityLogService,
        private snackBar: MatSnackBar,
        private router: Router,
        fb: FormBuilder
    ) {
        const defaults = DEFAULTS.userPreferences.dashboard!;
        this.settingsForm = fb.group({
            bglStatsHistogram: fb.group({
                timeRangeHours: fb.control(defaults.bglStatsHistogram.timeRangeHours, Validators.required),
                plotColour: fb.control(defaults.bglStatsHistogram.plotColour, Validators.required),
                activityLog: fb.control(defaults.bglStatsHistogram.activityLog),
                dataLabels: fb.control(defaults.bglStatsHistogram.dataLabels)
            })
        });
    }

    ngOnInit() {
        this.userService.userPreferences$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(prefs => {
            if (prefs?.dashboard) {
                this.settingsForm.patchValue(prefs.dashboard, {
                    emitEvent: false
                });
            }
        });

        // If a setting is changed via the UI, act on the change and store and updated prefs in the background
        this.settingsForm.valueChanges.pipe(
            debounceTime(this.appConfigService.formDebounceInterval),
            takeUntil(this.destroying$),
            mergeMap(value => this.userService.savePreferences({
                    dashboard: value
                }).pipe(map(() => {
                    this.dashboardService.triggerRefresh();
                }))
            )
        ).subscribe();

        // Query data for the main BGL display chart on auto-refresh or when an activity log change occurs
        merge(
            this.dashboardService.refresh$,
            this.activityLogService.changed$
        ).pipe(
            filter(() => this.userService.loggedIn),
            throttleTime(this.appConfigService.queryDebounceInterval, undefined, {leading: true, trailing: true}),
            takeUntil(this.destroying$),
            mergeMap(() => this.updateView())
        ).subscribe(() => {}, error => {
            this.loading$.next(false);
            this.snackBar.open('Error retrieving BGL chart data');
        });

        this.dashboardService.triggerRefresh();
    }

    private updateView(): Observable<void> {
        this.loading$.next(true);
        return this.dashboardService.getBglHistogramChartOptions().pipe(
            take(1),
            map(chartData => {
                this.loading$.next(false);
                this.bglHistogramChartOptions = chartData;
            }));
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }

    getDateFrom(): DateTime | undefined {
        const timeRangeHours: number | undefined = this.settingsForm.get('bglStatsHistogram')?.get('timeRangeHours')?.value;
        if (timeRangeHours !== undefined) {
            return DateTime.now().minus({ hours: timeRangeHours });
        } else {
            return undefined;
        }
    }
}
