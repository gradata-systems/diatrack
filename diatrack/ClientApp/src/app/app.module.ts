import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatButtonModule} from "@angular/material/button";
import {MainNavComponent} from './main-nav/main-nav.component';
import {MatIconModule} from "@angular/material/icon";
import {FormsModule} from "@angular/forms";
import {MatTooltipModule} from "@angular/material/tooltip";
import {environment} from "../environments/environment";
import {APP_CONFIG, BASE_PATH} from "./api/variables";
import {ApiModule} from "./api/api.module";
import {MainHeaderModule} from "./main-header/main-header.module";
import {AppAuthModule} from "./auth/app-auth.module";
import {PreferencesComponent} from './pages/preferences/preferences.component';
import {AboutComponent} from './pages/about/about.component';

@NgModule({
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatButtonToggleModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        FormsModule,
        ApiModule,
        AppAuthModule,
        MainHeaderModule,
    ],
    providers: [
        {provide: BASE_PATH, useValue: environment.apiBasePath},
        {provide: APP_CONFIG, useValue: environment.appConfig}
    ],
    declarations: [
        AppComponent,
        MainNavComponent,
        PreferencesComponent,
        AboutComponent
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
