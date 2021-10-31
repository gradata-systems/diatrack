import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from "rxjs";
import {DataSource} from "./models/data-source";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {UserService} from "./user.service";
import {map} from "rxjs/operators";
import {BASE_PATH} from "./variables";

@Injectable({
    providedIn: 'root'
})
export class DataSourceService {

    readonly dataSources$ = new BehaviorSubject<DataSource[]>([]);

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private userService: UserService
    ) {
        // Reload data sources when user data changes
        userService.userProfile$.subscribe(user => {
            if (user?.dataSources) {
                this.dataSources$.next(user.dataSources);
            } else {
                this.dataSources$.next([]);
            }
        });
    }

    addDataSource(dataSource: DataSource): Observable<HttpResponse<any>> {
        return this.httpClient.put(`${this.basePath}/user/dataSource`, dataSource, {
            observe: 'response'
        }).pipe(map(response => {
            this.userService.reloadUser();
            return response;
        }));
    }

    removeDataSource(dataSource: DataSource): Observable<HttpResponse<any>> {
        return this.httpClient.delete(`${this.basePath}/user/dataSource`, {
            observe: 'response',
            body: dataSource
        }).pipe(map(response => {
            this.userService.reloadUser();
            return response;
        }));
    }
}
