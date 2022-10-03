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
import {AboutPageComponent} from './pages/about/about.component';
import {DashboardModule} from "./pages/dashboard/dashboard.module";
import {AppCoreModule} from "./app-core.module";
import {PreferencesModule} from "./pages/preferences/preferences.module";
import {CommonDialogModule} from "./common-dialog/common-dialog.module";
import {RouterModule} from "@angular/router";
import {ActivityLogModule} from "./activity-log/activity-log.module";
import {ActivityLogPageComponent} from './pages/activity-log/activity-log.component';
import {ServiceWorkerModule} from '@angular/service-worker';
import {LoginComponent} from "./pages/login/login.component";
import {GettingStartedComponent} from "./pages/getting-started/getting-started.component";
import {TermsPageComponent} from "./pages/terms/terms.component";
import {PrivacyPageComponent} from "./pages/privacy/privacy.component";

@NgModule({
    imports: [
        BrowserModule,
        RouterModule,
        AppRoutingModule,
        AppCoreModule,
        BrowserAnimationsModule,
        ApiModule,
        AppAuthModule,
        MainHeaderModule,
        DashboardModule,
        PreferencesModule,
        ActivityLogModule,
        CommonDialogModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
            // Register the ServiceWorker as soon as the app is stable
            // or after 30 seconds (whichever comes first).
            registrationStrategy: 'registerWhenStable:30000'
        })
    ],
    providers: [
        {provide: BASE_PATH, useValue: environment.appConfig.apiBasePath},
        {provide: APP_CONFIG, useValue: environment.appConfig}
    ],
    declarations: [
        AppComponent,
        MainNavComponent,
        LoginComponent,
        GettingStartedComponent,
        AboutPageComponent,
        TermsPageComponent,
        PrivacyPageComponent,
        ActivityLogPageComponent
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
