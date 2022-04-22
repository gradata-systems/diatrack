import {Component, OnDestroy, OnInit} from '@angular/core';
import {MainNavService} from "./main-nav/main-nav.service";
import {AppAuthService} from "./auth/app-auth.service";
import {of, Subject} from "rxjs";
import {Title} from "@angular/platform-browser";
import {BglStatsService} from "./api/bgl-stats.service";
import {filter, mergeMap, takeUntil, tap} from "rxjs/operators";
import {UserService} from "./api/user.service";
import {DEFAULTS} from "./defaults";
import {Router} from "@angular/router";
import {AppIconService} from "./app-icon.service";
import {AppUpdateService} from "./app-update.service";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

    private readonly noDataMessage = 'No data';

    private destroying$ = new Subject<boolean>();

    constructor(
        public mainNavService: MainNavService,
        public userService: UserService,
        public authService: AppAuthService,
        private router: Router,
        private titleService: Title,
        private bglStatsService: BglStatsService,
        private appIconService: AppIconService,
        appUpdateService: AppUpdateService
    ) {
        appUpdateService.registerForUpdateCheck();
    }

    ngOnInit() {
        this.appIconService.registerIcons();

        this.authService.configure();
        this.authService.checkAndSetActiveAccount();

        // Update the browser title when the BGL status updates
        this.bglStatsService.bglStatus$.pipe(
            filter(() => this.userService.loggedIn),
            mergeMap(bglStatus => {
                return this.userService.userPreferences$.pipe(tap(userPreferences => {
                    if (bglStatus.bgl !== undefined && bglStatus.delta !== undefined && bglStatus.lastReading !== undefined) {
                        const bglUnit = userPreferences?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment!.bglUnit;
                        const scaledBgl = this.bglStatsService.scaleBglValueFromMgDl(bglStatus.bgl, bglUnit).toFixed(1);
                        const scaledDelta = this.bglStatsService.getDeltaDisplayValue(this.bglStatsService.scaleBglValueFromMgDl(bglStatus.delta, bglUnit));
                        const time = bglStatus.lastReading.toRelative();

                        this.titleService.setTitle(`${scaledBgl} ${scaledDelta} : ${time}`);
                    } else {
                        this.titleService.setTitle(this.noDataMessage);
                    }
                }));
            }),
            takeUntil(this.destroying$)
        ).subscribe(() => {}, error => {
            this.titleService.setTitle(this.noDataMessage);
            return of();
        });
    }

    ngOnDestroy()
    {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
