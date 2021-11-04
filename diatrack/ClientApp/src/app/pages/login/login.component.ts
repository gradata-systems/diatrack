import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {UserService} from "../../api/user.service";
import {takeUntil} from "rxjs/operators";
import {Subject} from "rxjs";
import {AppAuthService} from "../../auth/app-auth.service";

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

    private readonly destroying$ = new Subject<boolean>();

    constructor(
        private router: Router,
        private userService: UserService,
        public authService: AppAuthService
    ) {
    }

    ngOnInit(): void {
        // If the user arrived here and is logged in, redirect to the default route
        this.userService.activeUser$.pipe(
            takeUntil(this.destroying$)
        ).subscribe(activeUser => {
            if (activeUser) {
                this.router.navigate(['dashboard']);
            }
        });
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
