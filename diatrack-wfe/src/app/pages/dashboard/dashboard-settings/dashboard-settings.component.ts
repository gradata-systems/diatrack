import {Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from "../../../api/user.service";
import {debounceTime, mergeMap, takeUntil, tap} from "rxjs/operators";
import {AppConfigService} from "../../../api/app-config.service";
import {Subject} from "rxjs";
import {DashboardSettingsService} from "./dashboard-settings.service";
import {PlotColour} from "../../../api/models/user-preferences";

@Component({
    selector: 'app-dashboard-settings',
    templateUrl: './dashboard-settings.component.html',
    styleUrls: ['./dashboard-settings.component.scss']
})
export class DashboardSettingsComponent implements OnInit, OnDestroy {

    readonly destroying$ = new Subject<boolean>();

    // Enum constants
    readonly plotColour = PlotColour;

    constructor(
        private userService: UserService,
        private appConfigService: AppConfigService,
        public dashboardSettingsService: DashboardSettingsService
    ) { }

    ngOnInit() {
        this.userService.userPreferences$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(prefs => {
            if (prefs?.dashboard) {
                this.dashboardSettingsService.settingsForm.patchValue(prefs.dashboard, {
                    emitEvent: false
                });
            }
        });

        // If a setting is changed via the UI, act on the change and store and updated prefs in the background
        this.dashboardSettingsService.settingsForm.valueChanges.pipe(
            debounceTime(this.appConfigService.formDebounceInterval),
            takeUntil(this.destroying$),
            mergeMap(value => this.userService.savePreferences({
                dashboard: value
            }).pipe(
                tap(() => this.dashboardSettingsService.settingsChanged$.next(value))
            ))
        ).subscribe();
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
