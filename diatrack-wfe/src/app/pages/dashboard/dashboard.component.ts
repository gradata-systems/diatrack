import {AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AppAuthService} from "../../auth/app-auth.service";
import {UserService} from "../../api/user.service";
import {BehaviorSubject, merge, Observable, Subject} from "rxjs";
import {filter, map, mergeMap, takeUntil, throttleTime} from "rxjs/operators";
import {DashboardService} from "./dashboard.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Options} from "highcharts";
import {AppConfigService} from "../../api/app-config.service";
import {ActivityLogService} from "../../activity-log/activity-log.service";
import {HighchartsChartComponent} from "../../highcharts-chart/highcharts-chart.component";
import {DashboardSettingsService} from "./dashboard-settings/dashboard-settings.service";
import {PageService} from "../page.service";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    providers: [
        DashboardSettingsService,
        PageService
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('bglChart') bglChart?: HighchartsChartComponent;

    readonly loading$ = new BehaviorSubject<boolean>(false);
    readonly bglHistogramChartOptions$ = new BehaviorSubject<Options | undefined>(undefined);

    private destroying$ = new Subject<boolean>();

    constructor(
        private authService: AppAuthService,
        private appConfigService: AppConfigService,
        public userService: UserService,
        public dashboardService: DashboardService,
        public dashboardSettingsService: DashboardSettingsService,
        private activityLogService: ActivityLogService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit() {
        // Query data for the main BGL display chart on auto-refresh or when an activity log change occurs
        merge(
            this.dashboardService.refresh$,
            this.dashboardSettingsService.dashboardSettings$,
            this.activityLogService.changed$
        ).pipe(
            filter(() => this.userService.loggedIn),
            throttleTime(this.appConfigService.queryDebounceInterval, undefined, {leading: true, trailing: true}),
            mergeMap(() => this.updateView()),
            takeUntil(this.destroying$)
        ).subscribe();

        this.dashboardService.triggerRefresh();
    }

    private updateView(): Observable<void> {
        this.loading$.next(true);
        return this.dashboardService.getBglHistogramChartOptions().pipe(map(chartData => {
            this.loading$.next(false);
            if (chartData !== undefined) {
                // Only update chart options if they were obtained successfully. Else keep the existing options.
                this.bglHistogramChartOptions$.next(chartData);
            } else {
                this.snackBar.open('Error getting the latest chart data');
            }
        }));
    }

    ngAfterViewInit() {
        this.activityLogService.changed$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(() => {
            // If a log entry is created, clear the selected BGL point so the new log entry icon is visible
            this.bglChart?.deselectAllPoints();
            this.dashboardService.selectedPoint = undefined;
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
