import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient} from "@angular/common/http";
import {UserProfile} from "./models/user";
import {BehaviorSubject, Observable, of, ReplaySubject} from "rxjs";
import {AppAuthService} from "../auth/app-auth.service";
import {catchError, distinct, map, mergeMap} from "rxjs/operators";
import {BglUnit, getBglUnitDisplayValue, UserPreferences} from "./models/user-preferences";
import {DEFAULTS} from "../defaults";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    // Fires when the logged-on user changes
    readonly activeUser$: Observable<UserProfile | undefined>;

    // Fires when the user profile changes (like when a data source is added)
    readonly userProfileLoading$ = new BehaviorSubject<boolean>(false);

    readonly userProfile$ = new ReplaySubject<UserProfile>(1);
    readonly userPreferences$ = new ReplaySubject<UserPreferences | undefined>(1);

    private _loggedIn = false;
    get loggedIn(): boolean { return this._loggedIn; }

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private authService: AppAuthService
    ) {
        this.activeUser$ = this.authService.activeAccount$.pipe(
            distinct(),
            mergeMap(account => {
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
    private getUser(): Observable<UserProfile> {
        return this.httpClient.get<UserProfile>(`${this.basePath}/user`);
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

    getBglUnits(): Observable<BglUnit> {
        return this.userPreferences$.pipe(map(prefs => {
            return prefs?.treatment?.bglUnit ?? DEFAULTS.userPreferences.treatment!.bglUnit;
        }));
    }

    getUserBglUnitDisplayValue(): Observable<string> {
        return this.getBglUnits().pipe(map(bglUnit => {
            return getBglUnitDisplayValue(bglUnit);
        }));
    }

    getBglUnitDisplayValue(bglUnit: BglUnit): string {
        return getBglUnitDisplayValue(bglUnit);
    }
}
