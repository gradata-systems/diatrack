import {ApplicationRef, Injectable, NgZone, OnDestroy} from '@angular/core';
import {concat, Subject, timer} from "rxjs";
import {filter, first, takeUntil} from "rxjs/operators";
import {AppConfigService} from "./api/app-config.service";

@Injectable({
    providedIn: 'root'
})
export class AppCoreService implements OnDestroy {

    readonly autoRefresh$ = new Subject<void>();
    private readonly destroying$ = new Subject<boolean>();

    constructor(
        appRef: ApplicationRef,
        ngZone: NgZone,
        appConfigService: AppConfigService
    ) {
        // Once the app is stable, start the auto-refresh timer to trigger app-wide data refreshes
        concat(
            appRef.isStable.pipe(first(stable => stable)),
            timer(appConfigService.refreshInterval, appConfigService.refreshInterval)
        ).pipe(
            takeUntil(this.destroying$),
            filter(() => appConfigService.autoRefreshEnabled)
        ).subscribe(() => {
            // `isStable` runs outside the Angular Zone
            ngZone.run(() => {
                this.autoRefresh$.next();
            });
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
