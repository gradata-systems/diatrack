import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DashboardComponent} from "./pages/dashboard/dashboard.component";
import {PreferencesComponent} from "./pages/preferences/preferences.component";
import {FailedLoginComponent} from "./auth/failed-login/failed-login.component";
import {AboutPageComponent} from "./pages/about/about.component";
import {ActivityLogPageComponent} from "./pages/activity-log/activity-log.component";
import {LoggedInGuard} from "./auth/logged-in.guard";
import {LoginComponent} from "./pages/login/login.component";
import {GettingStartedComponent} from "./pages/getting-started/getting-started.component";
import {TermsPageComponent} from "./pages/terms/terms.component";
import {PrivacyPageComponent} from "./pages/privacy/privacy.component";

const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'getting-started',
        component: GettingStartedComponent
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [LoggedInGuard]
    },
    {
        path: 'activity',
        component: ActivityLogPageComponent,
        canActivate: [LoggedInGuard]
    },
    {
        path: 'preferences',
        component: PreferencesComponent,
        canActivate: [LoggedInGuard]
    },
    {
        path: 'about',
        component: AboutPageComponent
    },
    {
        path: 'terms',
        component: TermsPageComponent
    },
    {
        path: 'privacy',
        component: PrivacyPageComponent
    },
    {
        path: 'login-failed',
        component: FailedLoginComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        initialNavigation: 'disabled'
    })],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
