import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Component({
    selector: 'app-profile',
    templateUrl: './preferences.component.html',
    styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit {

    constructor(
        private httpClient: HttpClient,
    ) { }

    ngOnInit() {
    }
}
