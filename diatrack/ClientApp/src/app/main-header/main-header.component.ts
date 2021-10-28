import {Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from "../api/user.service";
import {User} from "../api/models/User";
import {AppAuthService} from "../auth/app-auth.service";
import {BglStatsService, BglStatus} from "../api/bgl-stats.service";
import {BehaviorSubject, Observable, of, Subject} from "rxjs";
import {map, mergeMap, takeUntil} from "rxjs/operators";
import {DEFAULTS} from "../defaults";
import {getBglUnitDisplayValue} from "../api/models/UserPreferences";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
    selector: 'app-main-header',
    templateUrl: './main-header.component.html',
    styleUrls: ['./main-header.component.scss']
})
export class MainHeaderComponent implements OnInit, OnDestroy {
    user?: User;
    loggedIn = false;

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        public authService: AppAuthService,
        public userService: UserService,
        public bglStatsService: BglStatsService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.userService.activeUser$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(user => {
            console.log(`Logged in user: ${user?.emailAddress}`);
            this.user = user
            this.loggedIn = user != null;
        });

        this.bglStatsService.refresh$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(() => {
            this.bglStatsService.updateBglStatus(5);
            console.log('Updated BGL status');
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
            const bglUnit = prefs?.treatment?.bglUnit || DEFAULTS.userPreferences.treatment!.bglUnit;

            if (stats.delta !== undefined) {
                const scaledDelta = this.bglStatsService.scaleBglValue(stats.delta, bglUnit);
                return this.bglStatsService.getDeltaDisplayValue(scaledDelta);
            } else {
                return '---';
            }
        }));
    }

    getLastReadingDisplayValue(bglStats: BglStatus) {
        if (bglStats.lastReading !== undefined) {
            return bglStats.lastReading.toRelativeCalendar({
                unit: 'minutes'
            })
        } else {
            return 'No sensor data';
        }
    }

    getBglUnit(): Observable<string> {
        return this.userService.userPreferences$.pipe(map(prefs => {
            return getBglUnitDisplayValue(prefs?.treatment?.bglUnit || DEFAULTS.userPreferences.treatment!.bglUnit);
        }));
    }

    getScaledBgl(bgl: number): Observable<number> {
        return this.userService.userPreferences$.pipe(map(prefs => {
            const bglUnit = prefs?.treatment?.bglUnit || DEFAULTS.userPreferences.treatment!.bglUnit;
            return this.bglStatsService.scaleBglValue(bgl, bglUnit);
        }));
    }
}
