import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, ReplaySubject, Subject} from "rxjs";
import {MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService} from "@azure/msal-angular";
import {AccountInfo, AuthenticationResult, EventMessage, EventType, InteractionStatus, PopupRequest} from "@azure/msal-browser";
import {filter, takeUntil} from "rxjs/operators";
import {APP_CONFIG} from "../api/variables";
import {AppConfig} from "../api/models/AppConfig";

@Injectable({
    providedIn: 'root'
})
export class AppAuthService {
    // Fired when the user's account changes
    activeAccount$ = new ReplaySubject<AccountInfo | null>(1);

    constructor(
        @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
        @Inject(APP_CONFIG) private appConfig: AppConfig,
        private msalService: MsalService,
        private msalBroadcastService: MsalBroadcastService
    ) {
    }

    configure() {
        this.msalService.instance.enableAccountStorageEvents();

        this.msalBroadcastService.msalSubject$
            .pipe(
                filter((msg: EventMessage) => msg.eventType === EventType.ACCOUNT_ADDED || msg.eventType === EventType.ACCOUNT_REMOVED)
            ).subscribe((result: EventMessage) => {
                if (this.msalService.instance.getAllAccounts().length === 0) {
                    window.location.pathname = "/";
                    this.notifyActiveAccountChanged(null);
                }
            });

        this.msalBroadcastService.inProgress$
            .pipe(
                filter((status: InteractionStatus) => status === InteractionStatus.None)
            ).subscribe(() => {
                this.checkAndSetActiveAccount();
            })
    }

    checkAndSetActiveAccount() {
        /**
         * If no active account set but there are accounts signed in, sets first account to active account
         * To use active account set here, subscribe to inProgress$ first in your component
         * Note: Basic usage demonstrated. Your app may require more complicated account selection logic
         */
        let activeAccount = this.msalService.instance.getActiveAccount();

        if (!activeAccount) {
            if (this.msalService.instance.getAllAccounts().length > 0) {
                let accounts = this.msalService.instance.getAllAccounts();
                this.msalService.instance.setActiveAccount(accounts[0]);
                this.notifyActiveAccountChanged(accounts[0]);
            } else {
                this.notifyActiveAccountChanged(null);
            }
        } else {
            this.notifyActiveAccountChanged(activeAccount);
        }
    }

    private notifyActiveAccountChanged(account: AccountInfo | null) {
        this.activeAccount$.next(account);
    }

    logIn() {
        if (this.msalGuardConfig.authRequest) {
            this.msalService.loginPopup({...this.msalGuardConfig.authRequest} as PopupRequest)
                .subscribe((response: AuthenticationResult) => {
                    this.msalService.instance.setActiveAccount(response.account);
                });
        } else {
            this.msalService.loginPopup()
                .subscribe((response: AuthenticationResult) => {
                    this.msalService.instance.setActiveAccount(response.account);
                });
        }
    }

    logOut() {
        this.msalService.logoutPopup({
            mainWindowRedirectUri: this.appConfig.redirectUri
        });
    }
}
