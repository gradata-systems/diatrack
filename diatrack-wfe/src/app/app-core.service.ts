import {ApplicationRef, Injectable, NgZone, OnDestroy} from '@angular/core';
import {AsyncSubject, concat, interval, Subject} from "rxjs";
import {filter, first, takeUntil, tap} from "rxjs/operators";
import {AppConfigService} from "./api/app-config.service";

@Injectable({
    providedIn: 'root'
})
export class AppCoreService implements OnDestroy {

    readonly isStable$ = new AsyncSubject<boolean>();
    readonly autoRefresh$ = new Subject<void>();
    private readonly destroying$ = new Subject<boolean>();

    constructor(
        appRef: ApplicationRef,
        ngZone: NgZone,
        appConfigService: AppConfigService
    ) {
        // Once the app is stable, start the auto-refresh timer to trigger app-wide data refreshes
        concat(
            appRef.isStable.pipe(
                first(stable => stable),
                tap(() => {
                    ngZone.run(() => {
                        this.isStable$.next(true);
                        this.isStable$.complete();
                    });
                })
            ),
            interval(appConfigService.refreshInterval)
        ).pipe(
            filter(() => appConfigService.autoRefreshEnabled),
            takeUntil(this.destroying$)
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
