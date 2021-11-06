import {Component, OnInit} from '@angular/core';
import {ActivityLogService} from "../../activity-log/activity-log.service";

@Component({
    selector: 'app-activity-log',
    templateUrl: './activity-log.component.html',
    styleUrls: ['./activity-log.component.scss']
})
export class ActivityLogPageComponent implements OnInit {

    constructor(
        public activityLogService: ActivityLogService
    ) { }

    ngOnInit(): void {
    }

}
