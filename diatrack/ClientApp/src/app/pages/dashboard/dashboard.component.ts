import {Component, OnInit} from '@angular/core';
import {AppAuthService} from "../../auth/app-auth.service";
import {UserService} from "../../api/user.service";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

    constructor(
        private authService: AppAuthService,
        private userService: UserService
    ) { }

    ngOnInit(): void {

    }
}
