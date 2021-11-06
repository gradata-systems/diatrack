import {Component, OnDestroy, OnInit} from '@angular/core';
import {MainNavService} from "./main-nav.service";
import {UserService} from "../api/user.service";
import {AppAuthService} from "../auth/app-auth.service";
import {NavigationEnd, Router} from "@angular/router";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";

@Component({
    selector: 'app-main-nav',
    templateUrl: './main-nav.component.html',
    styleUrls: ['./main-nav.component.scss']
})
export class MainNavComponent implements OnInit, OnDestroy {

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        public mainNavService: MainNavService,
        public userService: UserService,
        public authService: AppAuthService,
        private router: Router
    ) { }

    public ngOnInit() {
        this.router.events.pipe(
            takeUntil(this.destroying$)
        ).subscribe(event => {
            // Close the nav panel if a route is activated
            if (event instanceof NavigationEnd) {
                this.mainNavService.expanded = false;
            }
        });
    }

    public ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
