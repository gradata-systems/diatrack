import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppAuthService} from "../../auth/app-auth.service";
import {UserService} from "../../api/user.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {User} from "../../api/models/User";
import {PlotColour} from "../../api/models/UserPreferences";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

    settingsForm: FormGroup;

    // Enum constants
    readonly plotColour = PlotColour;

    private destroying$ = new Subject<boolean>();

    constructor(
        private authService: AppAuthService,
        private userService: UserService,
        fb: FormBuilder
    ) {
        this.settingsForm = fb.group({
            plotColour: fb.control('', Validators.required)
        });
    }

    ngOnInit() {
        this.userService.userProfile$.pipe(takeUntil(this.destroying$)).subscribe(user => {
            if (user) {
                this.updateSettingsForm(user);
            }
        });
    }

    private updateSettingsForm(user: User) {
        if (user.preferences?.dashboard) {
            this.settingsForm.setValue(user.preferences.dashboard);
        }
    }

    ngOnDestroy() {
        this.destroying$.next(true);
        this.destroying$.complete();
    }
}
