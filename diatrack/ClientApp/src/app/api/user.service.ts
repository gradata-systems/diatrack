import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {User} from "./models/User";
import {BehaviorSubject, Observable, of, Subject} from "rxjs";
import {AppAuthService} from "../auth/app-auth.service";
import {catchError, map, mergeMap} from "rxjs/operators";
import {UserPreferences} from "./models/UserPreferences";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    // Fires when the logged-on user changes
    readonly activeUser$: Observable<User | undefined>;

    // Fires when the user profile changes (like when a data source is added)
    readonly userProfileLoading$ = new BehaviorSubject<boolean>(false);
    readonly userProfile$ = new BehaviorSubject<User | undefined>(undefined);

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
                        this.userProfileLoading$.next(false);
                        if (response.ok && response.body) {
                            this._loggedIn = true;
                            this.userProfile$.next(response.body);
                            return response.body;
                        } else {
                            this._loggedIn = false;
                            return undefined;
                        }
                    }),
                    catchError(error => of(undefined)));
            } else {
                this._loggedIn = false;
                return of(undefined);
            }
        }));
    }

    private getUser(): Observable<HttpResponse<User>> {
        return this.httpClient.get<User>(`${this.basePath}/user`, {
            observe: 'response'
        });
    }

    /**
     * Update the user preferences and trigger a user profile update
     */
    updatePreferences(preferences: UserPreferences): Observable<void> {
        return this.httpClient.post<UserPreferences>(`${this.basePath}/user/preferences`, preferences, {
            observe: 'response'
        }).pipe(map(response => {
            this.refreshUserProfile();
        }));
    }

    /**
     * Trigger a refresh of the user profile
     */
    refreshUserProfile() {
        this.getUser().subscribe(response => {
            if (response.ok && response.body) {
                this.userProfile$.next(response.body);
            }
        }, error => {
            console.error(error);
        });
    }
}
