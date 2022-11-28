import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from "../api/user.service";
import {UserProfile} from "../api/models/user";
import {BglStatsService, BglStatus} from "../api/bgl-stats.service";
import {merge, Observable, Subject} from "rxjs";
import {filter, map, takeUntil} from "rxjs/operators";
import {DEFAULTS} from "../defaults";
import {MatSnackBar} from "@angular/material/snack-bar";
import {environment} from "../../environments/environment";
import {DateTime} from "luxon";
import {AppIconService} from "../app-icon.service";

@Component({
    selector: 'app-main-header',
    templateUrl: './main-header.component.html',
    styleUrls: ['./main-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainHeaderComponent implements OnInit, OnDestroy {
    user?: UserProfile;
    loggedIn = false;

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        public userService: UserService,
        public bglStatsService: BglStatsService,
        public appIconService: AppIconService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.userService.activeUser$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(user => {
            this.user = user
            this.loggedIn = user != null;
            if (!environment.production) {
                console.log(`Logged in user: ${user?.emailAddress}`);
            }
        });

        merge(
            this.userService.activeUser$,
            this.bglStatsService.refresh$
        ).pipe(
            filter(() => this.userService.loggedIn),
            takeUntil(this.destroying$)
        ).subscribe(() => {
            this.bglStatsService.updateBglStatus(5);
        }, error => {
            this.snackBar.open('Error retrieving BGL status');
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }

    getDeltaDisplayValue(stats: BglStatus): Observable<string> {
        return this.userService.userPreferences$.pipe(map(prefs => {
            const bglUnit = prefs?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment!.bglUnit;

            if (stats.delta !== undefined) {
                const scaledDelta = this.bglStatsService.scaleBglValueFromMgDl(stats.delta, bglUnit);
                return this.bglStatsService.getDeltaDisplayValue(scaledDelta);
            } else {
                return '---';
            }
        }));
    }

    getLastReadingDisplayValue(bglStats: BglStatus) {
        if (bglStats.lastReading !== undefined) {
            return bglStats.lastReading.toRelative();
        } else {
            return 'No sensor data';
        }
    }

    getLastReadingFullDate(bglStats: BglStatus) {
        if (bglStats.lastReading !== undefined) {
            return bglStats.lastReading.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS);
        } else {
            return '';
        }
    }

    getScaledBgl(bgl: number): Observable<number> {
        return this.userService.userPreferences$.pipe(map(prefs => {
            const bglUnit = prefs?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment!.bglUnit;
            return this.bglStatsService.scaleBglValueFromMgDl(bgl, bglUnit);
        }));
    }
}
