import {Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from "../api/user.service";
import {User} from "../api/models/User";
import {AppAuthService} from "../auth/app-auth.service";

@Component({
    selector: 'app-main-header',
    templateUrl: './main-header.component.html',
    styleUrls: ['./main-header.component.scss']
})
export class MainHeaderComponent implements OnInit, OnDestroy {
    user?: User;

    constructor(
        public appAuthService: AppAuthService,
        public userService: UserService
    ) { }

    ngOnInit(): void {
        this.userService.activeUser$.subscribe(user => {
            console.log(`Logged in user: ${user}`);
            this.user = user
        });
    }

    ngOnDestroy() {
        this.userService.activeUser$.complete();
    }
}
