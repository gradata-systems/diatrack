import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Subject} from "rxjs";
import {DashboardPreferences} from "../../../api/models/user-preferences";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {DEFAULTS} from "../../../defaults";
import {DateTime} from "luxon";
import {AppConfigService} from "../../../api/app-config.service";
import {HISTOGRAM_PROFILES, HistogramProfileType} from "./histogram-profiles";
import {debounceTime, mergeMap, takeUntil} from "rxjs/operators";
import {UserService} from "../../../api/user.service";

@Injectable()
export class DashboardSettingsService implements OnDestroy {

    tabIndex = 0;
    dateFrom: DateTime | undefined;
    readonly settingsForm: FormGroup;
    readonly dashboardSettings$ = new BehaviorSubject<DashboardPreferences | undefined>(undefined);
    readonly histogramIntervals = HISTOGRAM_PROFILES;

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        private appConfigService: AppConfigService,
        private userService: UserService,
        fb: FormBuilder
    ) {
        const defaults = DEFAULTS.userPreferences.dashboard!;
        const histogramDefaults = defaults.bglStatsHistogram!;
        const movingAverageDefaults = histogramDefaults.movingAverage!;

        this.settingsForm = fb.group({
            bglStatsHistogram: fb.group({
                profileType: fb.control(histogramDefaults.profileType, Validators.required),
                plotHeight: fb.control(undefined),
                plotColour: fb.control(histogramDefaults.plotColour, Validators.required),
                activityLog: fb.control(histogramDefaults.activityLog),
                dataLabels: fb.control(histogramDefaults.dataLabels),
                movingAverage: fb.group({
                    enabled: fb.control(movingAverageDefaults.enabled),
                    modelType: fb.control(movingAverageDefaults.modelType, Validators.required),
                    window: fb.control(movingAverageDefaults.window, Validators.required),
                    period: fb.control(movingAverageDefaults.period),
                    alpha: fb.control(movingAverageDefaults.alpha),
                    predictionCount: fb.control(movingAverageDefaults.predictionCount)
                })
            })
        });

        this.userService.userPreferences$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(prefs => {
            if (prefs?.dashboard) {
                this.updateForm(prefs.dashboard);
            }
        });

        // If a setting is changed via the UI, act on the change and store and updated prefs in the background
        this.settingsForm.valueChanges.pipe(
            debounceTime(this.appConfigService.formDebounceInterval),
            takeUntil(this.destroying$),
            mergeMap((dashboardPrefs: DashboardPreferences) => this.userService.savePreferences({
                dashboard: dashboardPrefs
            }))
        ).subscribe(dashboardPrefs => {
            this.updateDashboardSettings(dashboardPrefs.dashboard);
        });
    }

    updateForm(dashboardPrefs: DashboardPreferences) {
        this.settingsForm.patchValue(dashboardPrefs, {
            emitEvent: false
        });

        this.dateFrom = this.getDateFrom(dashboardPrefs);
    }

    private updateDashboardSettings(dashboardPrefs: DashboardPreferences | undefined) {
        this.dashboardSettings$.next(dashboardPrefs);
        this.dateFrom = this.getDateFrom(dashboardPrefs);
    }

    getDateFrom(dashboardPrefs: DashboardPreferences | undefined): DateTime | undefined {
        const profileType: HistogramProfileType | undefined = dashboardPrefs?.bglStatsHistogram.profileType;
        if (profileType !== undefined && HISTOGRAM_PROFILES.has(profileType)) {
            const histogramProfile = HISTOGRAM_PROFILES.get(profileType)!;
            return DateTime.utc().minus(histogramProfile.displayPeriod);
        } else {
            return undefined;
        }
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
