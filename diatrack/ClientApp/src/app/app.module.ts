import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MainNavComponent} from './main-nav/main-nav.component';
import {environment} from "../environments/environment";
import {APP_CONFIG, BASE_PATH} from "./api/variables";
import {ApiModule} from "./api/api.module";
import {MainHeaderModule} from "./main-header/main-header.module";
import {AppAuthModule} from "./auth/app-auth.module";
import {AboutComponent} from './pages/about/about.component';
import {DashboardModule} from "./pages/dashboard/dashboard.module";
import {AppCoreModule} from "./app-core.module";
import {PreferencesModule} from "./pages/preferences/preferences.module";
import {CommonDialogModule} from "./common-dialog/common-dialog.module";

@NgModule({
    imports: [
        BrowserModule,
        AppRoutingModule,
        AppCoreModule,
        BrowserAnimationsModule,
        ApiModule,
        AppAuthModule,
        MainHeaderModule,
        DashboardModule,
        PreferencesModule,
        CommonDialogModule
    ],
    providers: [
        {provide: BASE_PATH, useValue: environment.apiBasePath},
        {provide: APP_CONFIG, useValue: environment.appConfig}
    ],
    declarations: [
        AppComponent,
        MainNavComponent,
        AboutComponent
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
