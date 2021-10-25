import {Component, OnInit} from '@angular/core';
import {BglUnit, TimeFormat, TreatmentPreferences} from "../../../api/models/UserPreferences";
import {AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {UserService} from "../../../api/user.service";
import {User} from "../../../api/models/User";
import {Subject} from "rxjs";
import {debounceTime, takeUntil} from "rxjs/operators";
import {DEFAULTS} from "../../../defaults";

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
        fb: FormBuilder
    ) {
        const defaults = DEFAULTS.userPreferences.treatment!;

        this.targetBglRangeMin = fb.control(defaults.targetBglRange.min, [
            Validators.min(3),
            this.rangeValidator()
        ]);
        this.targetBglRangeMax = fb.control(defaults.targetBglRange.max, [
            Validators.max(15),
            this.rangeValidator()
        ]);

        this.settingsForm = fb.group({
            bglUnit: fb.control(defaults.bglUnit, Validators.required),
            timeFormat: fb.control(defaults.timeFormat, Validators.required),
            targetBglRange: fb.group({
                min: this.targetBglRangeMin,
                max: this.targetBglRangeMax
            })
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
        this.userService.userProfile$.pipe(takeUntil(this.destroying$)).subscribe(user => {
            if (user) {
                this.updateSettingsForm(user);
            }
        });

        // Update the user profile on change
        this.settingsForm.valueChanges
            .pipe(debounceTime(1000))
            .subscribe((value: TreatmentPreferences) => {
                this.userService.updatePreferences({
                    treatment: value
                }).subscribe();
            })
    }

    private updateSettingsForm(user: User) {
        if (user.preferences?.treatment) {
            this.settingsForm.patchValue(user.preferences.treatment, {
                emitEvent: false
            });
        }
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
