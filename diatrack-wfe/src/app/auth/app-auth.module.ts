import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {MSAL_GUARD_CONFIG, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalBroadcastService, MsalGuard, MsalInterceptor, MsalModule, MsalService} from "@azure/msal-angular";
import {MSALGuardConfigFactory, MSALInstanceFactory, MSALInterceptorConfigFactory} from "./msal/msal-factories";
import {FailedLoginComponent} from './failed-login/failed-login.component';
import {APP_CONFIG} from "../api/variables";

@NgModule({
    imports: [
        CommonModule,
        HttpClientModule,
        MsalModule
    ],
    providers: [
        {provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true},
        {provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory, deps: [APP_CONFIG]},
        {provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory, deps: [APP_CONFIG]},
        {provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory, deps: [APP_CONFIG]},
        MsalService,
        MsalGuard,
        MsalBroadcastService
    ],
    declarations: [
        FailedLoginComponent
    ]
})
export class AppAuthModule {
}
