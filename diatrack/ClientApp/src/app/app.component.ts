import {Component, OnDestroy, OnInit} from '@angular/core';
import {MainNavService} from "./main-nav/main-nav.service";
import {AppAuthService} from "./auth/app-auth.service";
import {Subject} from "rxjs";
import {Router} from "@angular/router";
import {Title} from "@angular/platform-browser";
import {BglStatsService} from "./api/bgl-stats.service";
import {map, mergeMap, takeUntil} from "rxjs/operators";
import {UserService} from "./api/user.service";
import {DEFAULTS} from "./defaults";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
    title = 'diatrack';

    private destroying$ = new Subject<boolean>();

    constructor(
        public mainNavService: MainNavService,
        private router: Router,
        private titleService: Title,
        private bglStatsService: BglStatsService,
        private userService: UserService,
        private authService: AppAuthService
    ) { }

    ngOnInit() {
        this.authService.configure();
        this.authService.checkAndSetActiveAccount();

        this.bglStatsService.bglStatus$.pipe(
            takeUntil(this.destroying$),
            mergeMap(bglStatus => {
                return this.userService.userPreferences$.pipe(map(userPreferences => {
                    if (bglStatus.bgl !== undefined && bglStatus.delta !== undefined && bglStatus.lastReading !== undefined) {
                        const bglUnit = userPreferences?.treatment?.bglUnit || DEFAULTS.userPreferences.treatment!.bglUnit;
                        const scaledBgl = this.bglStatsService.scaleBglValue(bglStatus.bgl, bglUnit).toFixed(1);
                        const scaledDelta = this.bglStatsService.getDeltaDisplayValue(this.bglStatsService.scaleBglValue(bglStatus.delta, bglUnit));
                        const time = bglStatus.lastReading.toRelativeCalendar({
                            unit: 'minutes'
                        });

                        this.titleService.setTitle(`${scaledBgl} ${scaledDelta} : ${time}`);
                    } else {
                        this.titleService.setTitle(`Diatrack`);
                    }
                }));
            })
        ).subscribe();
    }

    ngOnDestroy()
    {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
