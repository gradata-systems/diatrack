import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MsalGuard} from "@azure/msal-angular";
import {DashboardComponent} from "./pages/dashboard/dashboard.component";
import {PreferencesComponent} from "./pages/preferences/preferences.component";
import {FailedLoginComponent} from "./auth/failed-login/failed-login.component";
import {AboutPageComponent} from "./pages/about/about.component";
import {ActivityLogPageComponent} from "./pages/activity-log/activity-log.component";

const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: DashboardComponent
    },
    {
        path: 'activity',
        component: ActivityLogPageComponent,
        canActivate: [MsalGuard]
    },
    {
        path: 'preferences',
        component: PreferencesComponent,
        canActivate: [MsalGuard]
    },
    {
        path: 'about',
        component: AboutPageComponent
    },
    {
        path: 'login-failed',
        component: FailedLoginComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
