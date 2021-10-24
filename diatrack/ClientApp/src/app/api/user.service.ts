import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {User} from "./models/User";
import {BehaviorSubject, Observable} from "rxjs";
import {AppAuthService} from "../auth/app-auth.service";

@Injectable({
    providedIn: 'root'
})
export class UserService {
    activeUser$ = new BehaviorSubject<User | undefined>(undefined);

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private authService: AppAuthService
    ) {
        this.authService.activeAccount$.subscribe(account => {
            if (account) {
                this.getUser().subscribe(response => {
                    if (response.ok && response.body) {
                        this.activeUser$.next(response.body);
                    } else {
                        // TODO: Output an error message
                        this.activeUser$.next(undefined);
                    }
                })
            } else {
                this.activeUser$.next(undefined);
            }
        });
    }

    getUser(): Observable<HttpResponse<User>> {
        return this.httpClient.get<User>(`${this.basePath}/User`, {
            observe: 'response'
        });
    }
}
