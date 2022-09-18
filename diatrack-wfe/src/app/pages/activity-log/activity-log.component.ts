import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {ActivityLogQueryParams, ActivityLogService} from "../../activity-log/activity-log.service";
import {UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {SortOrder} from "../../api/models/activity-log-entry";
import {debounceTime, takeUntil} from "rxjs/operators";
import {BehaviorSubject, Subject} from "rxjs";
import {AppConfigService} from "../../api/app-config.service";
import {PageService} from "../page.service";

@Component({
    selector: 'app-activity-log',
    templateUrl: './activity-log.component.html',
    styleUrls: ['./activity-log.component.scss'],
    providers: [PageService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityLogPageComponent implements OnInit, OnDestroy {

    readonly activityLogOptions$: BehaviorSubject<ActivityLogQueryParams | undefined> = new BehaviorSubject<ActivityLogQueryParams | undefined>(undefined);
    readonly formGroup: UntypedFormGroup;

    readonly categories = Array.from(this.activityLogService.activityLogCategories);
    readonly sortOrder = SortOrder;

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        public activityLogService: ActivityLogService,
        public pageService: PageService,
        private appConfigService: AppConfigService,
        fb: UntypedFormBuilder
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
            debounceTime(this.appConfigService.formDebounceInterval),
            takeUntil(this.destroying$)
        ).subscribe(value => {
            this.activityLogOptions$.next(value);
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
