import {Inject, Injectable} from '@angular/core';
import {Observable, ReplaySubject} from "rxjs";
import {MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService} from "@azure/msal-angular";
import {AccountInfo, AuthenticationResult, EventMessage, EventType, InteractionStatus, PopupRequest, RedirectRequest} from "@azure/msal-browser";
import {filter} from "rxjs/operators";
import {APP_CONFIG} from "../api/variables";
import {AppConfig} from "../api/models/app-config";

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
    ) { }

    configure() {
        this.msalBroadcastService.msalSubject$.pipe(
            filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS)
        ).subscribe((result) => {
            const payload = result.payload as AuthenticationResult;
            console.debug(`Login success: ${payload.account?.username}`)
            this.notifyActiveAccountChanged(payload.account);
        });

        this.msalBroadcastService.inProgress$.pipe(
            filter((status: InteractionStatus) => status === InteractionStatus.None)
        ).subscribe(() => {
            this.checkAndSetActiveAccount();
        });
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

    logIn(): void {
        if (this.msalGuardConfig.authRequest) {
            this.msalService.loginRedirect({...this.msalGuardConfig.authRequest} as RedirectRequest);
        } else {
            this.msalService.loginRedirect();
        }
    }

    logOut(): void {
        this.msalService.logoutRedirect();
    }
}
