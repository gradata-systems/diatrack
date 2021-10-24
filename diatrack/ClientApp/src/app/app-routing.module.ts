import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MsalGuard} from "@azure/msal-angular";
import {DashboardComponent} from "./pages/dashboard/dashboard.component";
import {ProfileComponent} from "./pages/profile/profile.component";
import {FailedLoginComponent} from "./auth/failed-login/failed-login.component";

const routes: Routes = [
    {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [MsalGuard]
    },
    {
        path: '',
        component: DashboardComponent
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
