import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient} from "@angular/common/http";
import {User} from "./models/User";
import {BehaviorSubject, Observable, of, ReplaySubject} from "rxjs";
import {AppAuthService} from "../auth/app-auth.service";
import {catchError, map, mergeMap} from "rxjs/operators";
import {UserPreferences} from "./models/UserPreferences";
import {environment} from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    // Fires when the logged-on user changes
    readonly activeUser$: Observable<User | undefined>;

    // Fires when the user profile changes (like when a data source is added)
    readonly userProfileLoading$ = new BehaviorSubject<boolean>(false);

    readonly userProfile$ = new ReplaySubject<User>(1);
    readonly userPreferences$ = new ReplaySubject<UserPreferences | undefined>(1);

    private _loggedIn = false;
    get loggedIn(): boolean { return this._loggedIn; }

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private authService: AppAuthService
    ) {
        this.activeUser$ = this.authService.activeAccount$.pipe(mergeMap(account => {
            if (account) {
                this.userProfileLoading$.next(true);
                return this.getUser().pipe(
                    map(response => {
                        this._loggedIn = true;
                        this.userProfileLoading$.next(false);
                        this.userProfile$.next(response);
                        this.userPreferences$.next(response.preferences);
                        return response;
                    }),
                    catchError(error => {
                        this._loggedIn = false;
                        return of(undefined);
                    })
                );
            } else {
                this._loggedIn = false;
                return of(undefined);
            }
        }));
    }

    /**
     * Retrieve the user profile
     */
    private getUser(): Observable<User> {
        return this.httpClient.get<User>(`${this.basePath}/user`);
    }

    /**
     * Reload the user profile from the server
     */
    reloadUser() {
        this.getUser().subscribe(response => {
            this.userProfile$.next(response);
            this.userPreferences$.next(response.preferences);
        }, error => {
            console.error(error);
        });
    }

    /**
     * Store the user preferences and trigger subscribers to update
     */
    savePreferences(preferences: UserPreferences): Observable<UserPreferences> {
        return this.httpClient.post<UserPreferences>(`${this.basePath}/user/preferences`, preferences).pipe(map(response => {
            if (response) {
                this.userPreferences$.next(response);
            }

            return response;
        }));
    }
}
