import {Inject, Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {BglReading} from "./models/BglReading";
import {Observable} from "rxjs";
import {BASE_PATH} from "./variables";
import {BglAccountStats} from "./models/BglAccountStats";
import {UserService} from "./user.service";
import {BglUnit} from "./models/UserPreferences";

@Injectable({
    providedIn: 'root'
})
export class BglStatsService {

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private userService: UserService
    ) { }

    getLatestReadings(size: number): Observable<LatestReadings> {
        return this.httpClient.get<LatestReadings>(`${this.basePath}/bgl`, {
            params: {
                'size': size
            }
        });
    }

    getAccountStatsHistogram(params: GetLatestReadingsParams): Observable<BglAccountStats> {
        return this.httpClient.post<BglAccountStats>(`${this.basePath}/bgl/accountStatsHistogram`, params);
    }

    scaleBglValue(value: number, bglUnit: BglUnit): number {
        switch(bglUnit) {
            case BglUnit.MmolL:
                return value / 18;
            default:
                return value;
        }
    }
}

type LatestReadings = {
    [accountId: string]: BglReading[];
}

interface GetLatestReadingsParams {
    start: string;
    end: string;
    buckets: number;
}
