import {Inject, Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {BglReading} from "./models/BglReading";
import {interval, Observable, Subject, timer} from "rxjs";
import {BASE_PATH} from "./variables";
import {BglAccountStats} from "./models/BglAccountStats";
import {BglUnit} from "./models/UserPreferences";
import {DateTime} from "luxon";
import {filter, map, repeatWhen} from "rxjs/operators";
import {AppConfigService} from "./app-config.service";
import {UserService} from "./user.service";

@Injectable({
    providedIn: 'root'
})
export class BglStatsService {

    readonly refresh$ = new Subject<void>();

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private appConfigService: AppConfigService,
        private userService: UserService
    ) {
        this.userService.activeUser$.subscribe(user => {
            this.refresh$.next();
        });

        // Trigger refresh on timer
        interval(this.appConfigService.refreshInterval).pipe(
            filter(x => this.appConfigService.autoRefreshEnabled)
        ).subscribe(x => this.refresh$.next());
    }

    refresh() {
        this.refresh$.next();
    }

    getBglStatus(size: number): Observable<BglStatus> {
        return this.httpClient.get<LatestReadings>(`${this.basePath}/bgl`, {
            params: {
                'size': size
            }
        }).pipe(map(response => {
            const firstAccountId = Object.keys(response)[0];
            const readings = response[firstAccountId];

            if (readings.length > 0) {
                // Find the first reading with a different timestamp to the latest one.
                // Use this to compute the delta.
                const firstReading = readings[0];
                for (let reading of readings) {
                    if (reading.timestamp !== firstReading.timestamp) {
                        return {
                            bgl: firstReading.value,
                            delta: firstReading.value - reading.value,
                            lastReading: DateTime.fromISO(firstReading.timestamp, { zone: 'UTC' }).toLocal()
                        } as BglStatus;
                    }
                }
            }

            return {};
        }));
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

export interface BglStatus {
    bgl?: number;
    delta?: number;
    lastReading?: DateTime;
}
