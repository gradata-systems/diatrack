import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MsalGuard} from "@azure/msal-angular";
import {DashboardComponent} from "./pages/dashboard/dashboard.component";
import {PreferencesComponent} from "./pages/preferences/preferences.component";
import {FailedLoginComponent} from "./auth/failed-login/failed-login.component";
import {AboutComponent} from "./pages/about/about.component";

const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [MsalGuard]
    },
    {
        path: 'preferences',
        component: PreferencesComponent,
        canActivate: [MsalGuard]
    },
    {
        path: 'about',
        component: AboutComponent
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
