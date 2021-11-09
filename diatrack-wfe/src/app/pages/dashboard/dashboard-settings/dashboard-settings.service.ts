import {Injectable} from '@angular/core';
import {Subject} from "rxjs";
import {DashboardPreferences} from "../../../api/models/user-preferences";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {DEFAULTS} from "../../../defaults";
import {DateTime} from "luxon";

@Injectable()
export class DashboardSettingsService {

    readonly settingsForm: FormGroup;
    readonly settingsChanged$ = new Subject<DashboardPreferences>();

    constructor(
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

    getDateFrom(): DateTime | undefined {
        const timeRangeHours: number | undefined = this.settingsForm.get('bglStatsHistogram')?.get('timeRangeHours')?.value;
        if (timeRangeHours !== undefined) {
            return DateTime.now().minus({ hours: timeRangeHours });
        } else {
            return undefined;
        }
    }
}
