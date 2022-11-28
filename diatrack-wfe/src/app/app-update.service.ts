import {Injectable, OnDestroy} from '@angular/core';
import {SwUpdate} from "@angular/service-worker";
import {MatSnackBar} from "@angular/material/snack-bar";
import {concat, from, interval, Subject} from "rxjs";
import {AppConfigService} from "./api/app-config.service";
import {filter, takeUntil} from "rxjs/operators";
import {AppCoreService} from "./app-core.service";
import {environment} from "../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class AppUpdateService implements OnDestroy {

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        private swUpdate: SwUpdate,
        private appCoreService: AppCoreService,
        private appConfigService: AppConfigService,
        private updateService: SwUpdate,
        private snackBar: MatSnackBar
    ) { }

    registerForUpdateCheck() {
        // If an update is found, prompt the user to reload the window, thereby updating the app
        this.updateService.versionUpdates.pipe(
            takeUntil(this.destroying$),
            filter(e => e.type === 'VERSION_READY')
        ).subscribe(event => {
            this.snackBar.open('An app update is available', 'Reload to Update', {
                duration: undefined
            }).onAction().subscribe(() => {
                // Reload the page if the user chooses to update
                window.location.reload();
            });
        });

        // Periodically use the service worker to check for a new app version
        concat(
            this.appCoreService.isStable$,
            interval(this.appConfigService.appUpdateCheckInterval.toMillis())
        ).pipe(
            takeUntil(this.destroying$)
        ).subscribe(() => {
            this.checkForAppUpdate();
        });
    }

    /**
     * Check whether a newer version of the app is available by using the service worker
     */
    private checkForAppUpdate() {
        from(this.swUpdate.checkForUpdate()).subscribe(() => {
            console.log('Update check complete');
        }, error => {
            if (!environment.production) {
                console.error(`Failed to check for app update: ${error}`);
            }
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
