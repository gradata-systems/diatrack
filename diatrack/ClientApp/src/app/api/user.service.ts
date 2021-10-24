import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {User} from "./models/User";
import {Observable, of} from "rxjs";
import {AppAuthService} from "../auth/app-auth.service";
import {map, mergeMap} from "rxjs/operators";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    activeUser$: Observable<User | undefined>;

    private _loggedIn = false;
    get loggedIn(): boolean { return this._loggedIn; }

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private authService: AppAuthService
    ) {
        this.activeUser$ = this.authService.activeAccount$.pipe(mergeMap(account => {
            if (account) {
                return this.getUser().pipe(map(response => {
                    if (response.ok && response.body) {
                        this._loggedIn = true;
                        return response.body;
                    } else {
                        this._loggedIn = false;
                        return undefined;
                    }
                }));
            } else {
                this._loggedIn = false;
                return of(undefined);
            }
        }));
    }

    getUser(): Observable<HttpResponse<User>> {
        return this.httpClient.get<User>(`${this.basePath}/User`, {
            observe: 'response'
        });
    }
}
