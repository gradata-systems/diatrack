import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivityLogQueryParams, ActivityLogService} from "../../activity-log/activity-log.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {SortOrder} from "../../api/models/activity-log-entry";
import {debounceTime, takeUntil} from "rxjs/operators";
import {Subject} from "rxjs";
import {AppConfigService} from "../../api/app-config.service";

@Component({
    selector: 'app-activity-log',
    templateUrl: './activity-log.component.html',
    styleUrls: ['./activity-log.component.scss']
})
export class ActivityLogPageComponent implements OnInit, OnDestroy {

    activityLogOptions?: ActivityLogQueryParams;
    readonly formGroup: FormGroup;

    readonly categories = Array.from(this.activityLogService.activityLogCategories);
    readonly sortOrder = SortOrder;

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        public activityLogService: ActivityLogService,
        private appConfigService: AppConfigService,
        fb: FormBuilder
    ) {
        this.formGroup = fb.group({
            category: fb.control(''),
            searchTerm: fb.control(''),
            sortField: fb.control('@created'),
            sortOrder: fb.control(SortOrder.Descending, Validators.required)
        });
    }

    ngOnInit(): void {
        this.formGroup.valueChanges.pipe(
            takeUntil(this.destroying$),
            debounceTime(this.appConfigService.formDebounceInterval)
        ).subscribe(value => {
            this.activityLogOptions = value;
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
