import {Component, OnInit} from '@angular/core';
import {BglUnit, TimeFormat, TreatmentPreferences, UserPreferences} from "../../../api/models/UserPreferences";
import {AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {UserService} from "../../../api/user.service";
import {Subject} from "rxjs";
import {debounceTime, takeUntil} from "rxjs/operators";
import {DEFAULTS} from "../../../defaults";
import {AppConfigService} from "../../../api/app-config.service";

@Component({
    selector: 'app-treatment-prefs',
    templateUrl: './treatment-prefs.component.html',
    styleUrls: ['./treatment-prefs.component.scss']
})
export class TreatmentPrefsComponent implements OnInit {

    readonly settingsForm: FormGroup;
    readonly targetBglRangeMin: FormControl;
    readonly targetBglRangeMax: FormControl;

    // Enum constants
    readonly bglUnit = BglUnit;
    readonly timeFormat = TimeFormat;

    private destroying$ = new Subject<boolean>();

    constructor(
        private userService: UserService,
        private appConfigService: AppConfigService,
        fb: FormBuilder
    ) {
        const defaults = DEFAULTS.userPreferences.treatment!;

        this.targetBglRangeMin = fb.control(defaults.targetBglRange.min, [
            Validators.required,
            this.rangeValidator()
        ]);
        this.targetBglRangeMax = fb.control(defaults.targetBglRange.max, [
            Validators.required,
            this.rangeValidator()
        ]);

        this.settingsForm = fb.group({
            bglUnit: fb.control(defaults.bglUnit, Validators.required),
            timeFormat: fb.control(defaults.timeFormat, Validators.required),
            targetBglRange: fb.group({
                min: this.targetBglRangeMin,
                max: this.targetBglRangeMax
            }),
            bglLowThreshold: fb.control(defaults.bglLowThreshold, Validators.required)
        });
    }

    /**
     * Validates the min/max bounds of a range, ensuring min < max and vice versa
     */
    private rangeValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!this.targetBglRangeMin || !this.targetBglRangeMax) {
                return null;
            } else if (this.targetBglRangeMin.value < this.targetBglRangeMax.value && this.targetBglRangeMax.value > this.targetBglRangeMin.value) {
                return null;
            } else {
                return {
                    invalidRange: {
                        value: control.value
                    }
                };
            }
        }
    }

    ngOnInit(): void {
        // Update the form if the user profile updates
        this.userService.userPreferences$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(prefs => {
            if (prefs) {
                this.updateSettingsForm(prefs);
            }
        });

        // Update the user profile on change
        this.settingsForm.valueChanges.pipe(
            debounceTime(this.appConfigService.formDebounceInterval),
            takeUntil(this.destroying$)
        ).subscribe((value: TreatmentPreferences) => {
            this.userService.savePreferences({
                treatment: value
            }).subscribe();
        })
    }

    private updateSettingsForm(prefs: UserPreferences) {
        if (prefs.treatment) {
            this.settingsForm.patchValue(prefs.treatment, {
                emitEvent: false
            });
        }
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
