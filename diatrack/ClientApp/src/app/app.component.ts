import {Component, OnDestroy, OnInit} from '@angular/core';
import {MainNavService} from "./main-nav/main-nav.service";
import {AppAuthService} from "./auth/app-auth.service";
import {of, Subject} from "rxjs";
import {Title} from "@angular/platform-browser";
import {BglStatsService} from "./api/bgl-stats.service";
import {map, mergeMap, takeUntil} from "rxjs/operators";
import {UserService} from "./api/user.service";
import {DEFAULTS} from "./defaults";
import {Router} from "@angular/router";
import {AppIconService} from "./app-icon.service";

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
        private router: Router,
        private titleService: Title,
        private bglStatsService: BglStatsService,
        private userService: UserService,
        private authService: AppAuthService,
        private appIconService: AppIconService
    ) { }

    ngOnInit() {
        this.appIconService.registerIcons();

        this.authService.configure();
        this.authService.checkAndSetActiveAccount();

        // Update the browser title when the BGL status updates
        this.bglStatsService.bglStatus$.pipe(
            takeUntil(this.destroying$),
            mergeMap(bglStatus => {
                return this.userService.userPreferences$.pipe(map(userPreferences => {
                    if (bglStatus.bgl !== undefined && bglStatus.delta !== undefined && bglStatus.lastReading !== undefined) {
                        const bglUnit = userPreferences?.treatment?.bglUnit || DEFAULTS.userPreferences.treatment!.bglUnit;
                        const scaledBgl = this.bglStatsService.scaleBglValue(bglStatus.bgl, bglUnit).toFixed(1);
                        const scaledDelta = this.bglStatsService.getDeltaDisplayValue(this.bglStatsService.scaleBglValue(bglStatus.delta, bglUnit));
                        const time = bglStatus.lastReading.toRelative();

                        this.titleService.setTitle(`${scaledBgl} ${scaledDelta} : ${time}`);
                    } else {
                        this.titleService.setTitle(this.noDataMessage);
                    }
                }));
            })
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
