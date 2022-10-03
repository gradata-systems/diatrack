import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {FailedLoginComponent} from './failed-login/failed-login.component';
import {OAuthModule} from "angular-oauth2-oidc";
import {AppAuthInterceptor} from "./app-auth-interceptor.service";

@NgModule({
    imports: [
        CommonModule,
        HttpClientModule,
        OAuthModule.forRoot()
    ],
    providers: [
        {provide: HTTP_INTERCEPTORS, useClass: AppAuthInterceptor, multi: true}
    ],
    declarations: [
        FailedLoginComponent
    ]
})
export class AppAuthModule {
}
