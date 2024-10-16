import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {ActivityLogEntry, ActivityLogEntryCategory, ActivityLogEntryCategoryInfo, ActivityLogEntryParams} from "../../api/models/activity-log-entry";
import {UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {AppConfigService} from "../../api/app-config.service";
import {DataSourceService} from "../../api/data-source.service";
import {ActivityLogService} from "../activity-log.service";
import {UserService} from "../../api/user.service";
import {BglStatsService} from "../../api/bgl-stats.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DialogService} from "../../common-dialog/common-dialog.service";
import {BglUnit} from "../../api/models/user-preferences";
import {take} from "rxjs/operators";
import {DEFAULTS} from "../../defaults";
import {DateTime} from "luxon";
import {TimeUnit} from "../../api/models/bgl-account-stats";

@Component({
    selector: 'app-new-activity-log-entry-dialog',
    templateUrl: './new-activity-log-entry-dialog.component.html',
    styleUrls: ['./new-activity-log-entry-dialog.component.scss']
})
export class NewActivityLogEntryDialogComponent implements OnInit {

    readonly formGroup: UntypedFormGroup;
    inProgress = false;

    readonly activityLogEntryType = ActivityLogEntryCategory;
    readonly bglUnit = BglUnit;
    readonly timeUnit = TimeUnit;

    constructor(
        @Inject(MAT_DIALOG_DATA) public readonly dialogData: ActivityLogEntryDialogParams,
        private dialogRef: MatDialogRef<NewActivityLogEntryDialogComponent>,
        private fb: UntypedFormBuilder,
        public appConfigService: AppConfigService,
        public dataSourceService: DataSourceService,
        public userService: UserService,
        private activityLogService: ActivityLogService,
        private bglStatsService: BglStatsService,
        private dialogService: DialogService,
        private snackBar: MatSnackBar
    ) {
        const dataSources = this.dataSourceService.dataSources$.value;

        this.formGroup = fb.group({
            accountId: fb.control(dataSources.length > 0 ? dataSources[0].id : '', Validators.required),
            properties: fb.group({
                ...this.createControls()
            }),
            notes: fb.control(null, this.dialogData.entryType === ActivityLogEntryCategory.Other ? Validators.required : undefined)
        });

        if (this.dialogData.existingEntry) {
            this.formGroup.patchValue(this.dialogData.existingEntry, {
                emitEvent: false
            });
        }
    }

    private createControls() {
        switch (this.dialogData.entryType) {
            case ActivityLogEntryCategory.Insulin:
                return {
                    insulinUnits: this.fb.control(null, Validators.min(0.1))
                };
            case ActivityLogEntryCategory.BasalRateChange:
                return {
                    basalRatePercent: this.fb.control(null, Validators.required),
                    basalRateDuration: this.fb.control('', Validators.required),
                    basalRateTimeUnit: this.fb.control(TimeUnit.Minute, Validators.required)
                };
            case ActivityLogEntryCategory.Food:
                return {
                    foodGrams: this.fb.control(null, Validators.min(0.1)),
                    foodType: this.fb.control('')
                };
            case ActivityLogEntryCategory.BglReading:
                return {
                    bglReading: this.fb.control(null, Validators.min(0.1)),
                    bglUnits: this.fb.control('', Validators.required)
                };
            case ActivityLogEntryCategory.Exercise:
                return {
                    exerciseDuration: this.fb.control(null, Validators.min(0.1)),
                    exerciseIntensity: this.fb.control('', Validators.required)
                };
            default:
                return {};
        }
    }

    ngOnInit() {
        // Pre-fill BGL units
        this.userService.userPreferences$.pipe(take(1)).subscribe(userPrefs => {
            const bglUnits = this.dialogData.existingEntry?.properties.bglUnits ?? userPrefs?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment?.bglUnit;
            this.formGroup.patchValue({
                properties: {
                    bglUnits: bglUnits
                }
            }, {
                emitEvent: false
            });
        });
    }

    onSubmit() {
        this.formGroup.markAllAsTouched();
        if (this.formGroup.valid) {
            // Attempt to create a log entry
            const bglStatus = this.bglStatsService.bglStatus$.value;
            const logEntryParams: ActivityLogEntryParams = {
                atTime: this.dialogData.atTime?.toISO(),
                bgl: this.dialogData.bgl ?? bglStatus.bgl,
                category: this.dialogData.entryType,
                ...this.formGroup.value,
            };

            if (this.dialogData.existingEntry) {
                this.updateLogEntry(logEntryParams);
            } else {
                this.createLogEntry(logEntryParams);
            }
        }
    }

    createLogEntry(logEntryParams: ActivityLogEntryParams) {
        this.inProgress = true;
        this.activityLogService.addEntry(logEntryParams).subscribe(() => {
            this.snackBar.open('Log entry added');
            this.activityLogService.triggerChanged();
            this.dialogRef.close(true);
        }, error => {
            this.dialogService.error('Add log entry', 'Log entry could not be added. Please try again in a moment.');
        }, () => {
            this.inProgress = false;
        });
    }

    updateLogEntry(logEntryParams: ActivityLogEntryParams) {
        const existingEntry = this.dialogData.existingEntry!;

        this.inProgress = true;
        this.activityLogService.updateEntry(existingEntry.id, logEntryParams).subscribe(() => {
            this.snackBar.open('Log entry updated');
            this.activityLogService.triggerChanged();
            this.dialogRef.close(true);
        }, error => {
            this.dialogService.error('Edit log entry', 'Log entry could not be updated. Please try again in a moment.');
        }, () => {
            this.inProgress = false;
        });
    }

    deleteLogEntry() {
        const existingEntry = this.dialogData.existingEntry!;

        this.inProgress = true;
        this.activityLogService.deleteEntry(existingEntry.id).subscribe(() => {
            this.snackBar.open('Log entry deleted');
            this.activityLogService.triggerChanged();
            this.dialogRef.close(false);
        }, error => {
            this.dialogService.error('Delete log entry', 'Log entry could not be deleted. Please try again in a moment.');
        }, () => {
            this.inProgress = false;
        });
    }

    getDialogTitle() {
        return this.dialogData.existingEntry ? 'Edit log entry' : 'New log entry'
    }

    getSubmitButtonCaption() {
        return this.dialogData.existingEntry ? 'Save' : 'Create';
    }

    getAtTimeDisplayValue() {
        return this.dialogData.atTime?.toLocaleString(DateTime.DATETIME_MED);
    }
}

export interface ActivityLogEntryDialogParams
{
    atTime?: DateTime;
    bgl?: number;
    entryType: ActivityLogEntryCategory;
    entryCategory: ActivityLogEntryCategoryInfo;
    existingEntry?: ActivityLogEntry;
}
