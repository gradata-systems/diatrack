import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipModule} from "@angular/material/tooltip";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatLineModule, MatOptionModule} from "@angular/material/core";
import {MatMenuModule} from "@angular/material/menu";
import {MatCardModule} from "@angular/material/card";
import {MatListModule} from "@angular/material/list";
import {MatDialogModule} from "@angular/material/dialog";
import {MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarModule} from "@angular/material/snack-bar";
import {MatRadioModule} from "@angular/material/radio";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {A11yModule} from "@angular/cdk/a11y";

@NgModule({
    imports: [
        CommonModule,
    ],
    exports: [
        MatButtonToggleModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatMenuModule,
        MatCardModule,
        MatLineModule,
        MatListModule,
        MatDialogModule,
        MatSnackBarModule,
        MatRadioModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatOptionModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        A11yModule,
        FormsModule,
        ReactiveFormsModule
    ],
    providers: [
        {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 3000 }},
        {provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: {showDelay: 500}}
    ],
    declarations: [],
})
export class AppCoreModule {
}
