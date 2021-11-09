import {Injectable} from '@angular/core';
import {Subject} from "rxjs";
import {DashboardPreferences} from "../../../api/models/user-preferences";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {DEFAULTS} from "../../../defaults";
import {DateTime} from "luxon";
import {AppConfigService} from "../../../api/app-config.service";
import {HISTOGRAM_PROFILES, HistogramProfileType} from "./histogram-profiles";

@Injectable()
export class DashboardSettingsService {

    tabIndex = 0;
    readonly settingsForm: FormGroup;
    readonly settingsChanged$ = new Subject<DashboardPreferences>();
    readonly histogramIntervals = HISTOGRAM_PROFILES;

    constructor(
        private appConfigService: AppConfigService,
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
    }

    updateForm(dashboardPrefs: DashboardPreferences) {
        this.settingsForm.patchValue(dashboardPrefs, {
            emitEvent: false
        });
    }

    getDateFrom(): DateTime | undefined {
        const profileType: HistogramProfileType | undefined = this.settingsForm.get('bglStatsHistogram.profileType')?.value;
        if (profileType !== undefined && HISTOGRAM_PROFILES.has(profileType)) {
            const histogramProfile = HISTOGRAM_PROFILES.get(profileType)!;
            return DateTime.utc().minus(histogramProfile.displayPeriod);
        } else {
            return undefined;
        }
    }
}
