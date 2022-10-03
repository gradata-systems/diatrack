import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {map} from "rxjs/operators";
import {AppAuthService} from "./app-auth.service";

@Injectable({
    providedIn: 'root'
})
export class LoggedInGuard implements CanActivate {

    constructor(
        private userService: AppAuthService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.userService.activeUser$.pipe(map(userProfile => {
            if (!userProfile) {
                console.debug('No user');
                return this.router.parseUrl('/login');
            } else {
                return true;
            }
        }));
    }
}
