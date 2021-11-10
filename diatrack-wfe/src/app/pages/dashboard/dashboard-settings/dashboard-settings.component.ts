import {Component} from '@angular/core';
import {DashboardSettingsService} from "./dashboard-settings.service";
import {PlotColour} from "../../../api/models/user-preferences";
import {MovingAverageModelType} from "../../../api/models/moving-average-params";
import {HISTOGRAM_PROFILES} from "./histogram-profiles";

@Component({
    selector: 'app-dashboard-settings',
    templateUrl: './dashboard-settings.component.html',
    styleUrls: ['./dashboard-settings.component.scss']
})
export class DashboardSettingsComponent {

    // Enum constants
    readonly plotColour = PlotColour;
    readonly movingAverageModelType = MovingAverageModelType;
    readonly histogramProfiles = Array.from(HISTOGRAM_PROFILES.keys());

    constructor(
        public dashboardSettingsService: DashboardSettingsService
    ) { }
}
