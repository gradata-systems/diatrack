import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppAuthService} from "../../auth/app-auth.service";
import {UserService} from "../../api/user.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {combineLatest, Observable, Subject} from "rxjs";
import {debounceTime, filter, map, mergeMap, take, takeUntil} from "rxjs/operators";
import {DashboardPreferences, PlotColour} from "../../api/models/UserPreferences";
import {DEFAULTS} from "../../defaults";
import {DashboardService} from "./dashboard.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Options} from "highcharts";
import {Router} from "@angular/router";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

    loading = false;
    settingsForm: FormGroup;
    bglHistogramChartOptions: Options | undefined;

    // Enum constants
    readonly plotColour = PlotColour;

    private destroying$ = new Subject<boolean>();

    constructor(
        private authService: AppAuthService,
        private userService: UserService,
        public dashboardService: DashboardService,
        private snackBar: MatSnackBar,
        private router: Router,
        fb: FormBuilder
    ) {
        const defaults = DEFAULTS.userPreferences.dashboard!;
        this.settingsForm = fb.group({
            bglStatsHistogram: fb.group({
                timeRangeHours: fb.control(defaults.bglStatsHistogram.timeRangeHours, Validators.required),
                plotColour: fb.control(defaults.bglStatsHistogram.plotColour, Validators.required),
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
            takeUntil(this.destroying$)
        ).subscribe((value: DashboardPreferences) => {
            this.userService.savePreferences({
                dashboard: value
            }).pipe(mergeMap(() => {
                return this.updateView();
            })).subscribe();
        });

        // Query data for the main BGL display chart
        combineLatest([
            this.dashboardService.refresh$
        ]).pipe(
            filter(() => this.userService.loggedIn),
            mergeMap(() => {
                return this.updateView()
            }),
            takeUntil(this.destroying$),
        ).subscribe(() => {
            console.log('BGL histogram refreshed');
        }, error => {
            this.snackBar.open('Error retrieving BGL chart data');
        });

        this.dashboardService.refresh();
    }

    private updateView(): Observable<void> {
        this.loading = true;
        return this.dashboardService.getBglHistogramChartOptions().pipe(
            take(1),
            map(chartData => {
                this.loading = false;
                this.bglHistogramChartOptions = chartData;
            }));
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
