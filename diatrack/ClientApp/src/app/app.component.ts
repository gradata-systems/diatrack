import {Component, OnDestroy, OnInit} from '@angular/core';
import {MainNavService} from "./main-nav/main-nav.service";
import {AppAuthService} from "./auth/app-auth.service";
import {Subject} from "rxjs";
import {Router} from "@angular/router";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
    title = 'diatrack';

    private destroy$ = new Subject<boolean>();

    constructor(
        public mainNavService: MainNavService,
        private router: Router,
        private authService: AppAuthService
    ) {
    }

    ngOnInit() {
        this.authService.configure();
        this.authService.checkAndSetActiveAccount();
    }

    ngOnDestroy()
    {
        this.authService.destroy();

        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
