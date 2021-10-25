import {Component, OnInit} from '@angular/core';
import {BglUnit, TimeFormat} from "../../../api/models/UserPreferences";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {UserService} from "../../../api/user.service";
import {User} from "../../../api/models/User";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {DEFAULTS} from "../../../defaults";

@Component({
    selector: 'app-treatment-prefs',
    templateUrl: './treatment-prefs.component.html',
    styleUrls: ['./treatment-prefs.component.scss']
})
export class TreatmentPrefsComponent implements OnInit {

    readonly settingsForm: FormGroup;

    // Enum constants
    readonly bglUnit = BglUnit;
    readonly timeFormat = TimeFormat;

    private destroying$ = new Subject<boolean>();

    constructor(
        private userService: UserService,
        fb: FormBuilder
    ) {
        const defaults = DEFAULTS.userPreferences.treatment;
        this.settingsForm = fb.group({
            bglUnit: fb.control(defaults.bglUnit, Validators.required),
            timeFormat: fb.control(defaults.timeFormat, Validators.required),
            targetBglRange: fb.group({
                min: fb.control(defaults.targetBglRange.min, Validators.required),
                max: fb.control(defaults.targetBglRange.max, Validators.required)
            })
        });
    }

    ngOnInit(): void {
        this.userService.userProfile$.pipe(takeUntil(this.destroying$)).subscribe(user => {
            if (user) {
                this.updateSettingsForm(user);
            }
        });
    }

    private updateSettingsForm(user: User) {
        if (user.preferences?.treatment) {
            this.settingsForm.patchValue(user.preferences.treatment);
        }
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
