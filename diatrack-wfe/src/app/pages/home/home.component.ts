import {Component, OnInit} from '@angular/core';
import {filter} from "rxjs/operators";
import {AuthenticationResult, EventMessage, EventType, InteractionStatus} from "@azure/msal-browser";
import {MsalBroadcastService, MsalService} from "@azure/msal-angular";
import {AppAuthService} from "../../auth/app-auth.service";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

    constructor(
        private msalService: MsalService,
        private msalBroadcastService: MsalBroadcastService,
        private authService: AppAuthService
    ) {
    }

    ngOnInit(): void {
        // this.msalBroadcastService.msalSubject$.pipe(
        //     filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS)
        // ).subscribe((result) => {
        //     const payload = result.payload as AuthenticationResult;
        //     console.debug(`Login success: ${payload.account?.username}`);
        //     this.authService.activeAccount$.next(payload.account);
        // });
        //
        // this.msalBroadcastService.inProgress$.pipe(
        //     filter((status: InteractionStatus) => status === InteractionStatus.None)
        // ).subscribe(() => {
        //     this.authService.checkAndSetActiveAccount();
        // });
    }

}
