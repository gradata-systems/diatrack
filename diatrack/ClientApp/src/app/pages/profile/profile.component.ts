import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {ProfileType} from "../../api/models/ProfileType";

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    profile!: ProfileType;

    constructor(
        private httpClient: HttpClient,
    ) { }

    ngOnInit(): void {
        this.getProfile();
    }

    private getProfile() {
        // this.httpClient.get('https://graph.microsoft.com/v1.0/me')
        //     .subscribe(profile => this.profile = profile);
    }
}
