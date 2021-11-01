import {Inject, Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {BglReading} from "./models/bgl-reading";
import {BehaviorSubject, interval, Observable, Subject} from "rxjs";
import {BASE_PATH} from "./variables";
import {BglAccountStats} from "./models/bgl-account-stats";
import {BglUnit} from "./models/user-preferences";
import {DateTime} from "luxon";
import {filter} from "rxjs/operators";
import {AppConfigService} from "./app-config.service";
import {UserService} from "./user.service";
import * as chroma from "chroma-js";
import {DEFAULTS} from "../defaults";

@Injectable({
    providedIn: 'root'
})
export class BglStatsService {

    readonly bglStatus$ = new BehaviorSubject<BglStatus>({});
    readonly refresh$ = new Subject<void>();

    private colourScale: chroma.Scale<chroma.Color> = chroma.scale();

    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient,
        private appConfigService: AppConfigService,
        private userService: UserService
    ) {
        this.userService.activeUser$.subscribe(user => {
            this.refresh$.next();
        });

        this.userService.userPreferences$.subscribe(prefs => {
            const targetBglRange = prefs?.treatment?.targetBglRange || DEFAULTS.userPreferences.treatment!.targetBglRange;
            const bglLowThreshold = prefs?.treatment?.bglLowThreshold || DEFAULTS.userPreferences.treatment!.bglLowThreshold;

            this.colourScale = chroma
                .scale(['red', 'red', 'yellow', 'yellow', 'green', 'green', 'yellow'])
                .domain([0, bglLowThreshold - 0.1, bglLowThreshold, targetBglRange.min - 0.1, targetBglRange.min, targetBglRange.max, targetBglRange.max + 0.1]);
        });

        // Trigger refresh on timer
        interval(this.appConfigService.refreshInterval).pipe(
            filter(x => this.appConfigService.autoRefreshEnabled)
        ).subscribe(x => this.refresh$.next());
    }

    refresh() {
        this.refresh$.next();
    }

    updateBglStatus(size: number) {
        this.httpClient.get<LatestReadings>(`${this.basePath}/bgl`, {
            params: {
                size: size
            }
        }).subscribe(response => {
            const firstAccountId = Object.keys(response)[0];
            const readings = response[firstAccountId];

            if (readings.length > 0) {
                // Find the first reading with a different timestamp to the latest one.
                // Use this to compute the delta.
                const firstReading = readings[0];
                for (let reading of readings) {
                    if (reading.timestamp !== firstReading.timestamp) {
                        this.bglStatus$.next({
                            bgl: firstReading.value,
                            delta: firstReading.value - reading.value,
                            lastReading: DateTime.fromISO(firstReading.timestamp, { zone: 'UTC' }).toLocal()
                        });

                        return;
                    }
                }
            }

            this.bglStatus$.next({});
        }, error => {
            // Refresh the display so the time since last reading is updated
            this.bglStatus$.next(this.bglStatus$.value);
        });
    }

    getAccountStatsHistogram(params: GetLatestReadingsParams): Observable<BglAccountStats> {
        return this.httpClient.post<BglAccountStats>(`${this.basePath}/bgl/accountStatsHistogram`, params);
    }

    scaleBglValue(value: number, bglUnitFrom: BglUnit, bglUnitTo: BglUnit): number {
        if (bglUnitFrom !== bglUnitTo) {
            if (bglUnitFrom === BglUnit.MgDl && bglUnitTo === BglUnit.MmolL) {
                return value / 18;
            } else if (bglUnitFrom === BglUnit.MmolL && bglUnitTo === BglUnit.MgDl) {
                return value * 18;
            } else {
                throw new Error(`Unexpected BGL unit values: ${bglUnitFrom}, ${bglUnitTo}`)
            }
        } else {
            return value;
        }
    }

    /**
     * Scale from the Dexcom default scale of Mg/dL to the target units
     */
    scaleBglValueFromMgDl(value: number, bglUnit: BglUnit): number {
        switch(bglUnit) {
            case BglUnit.MmolL:
                return value / 18;
            default:
                return value;
        }
    }

    /**
     * Get a CSS colour value for displaying a colour-coded BGL value, according to the user's treatment parameters
     * @param scaledBgl - Scaled to the user's BGL units
     */
    getBglColour(scaledBgl: number): string {
        return this.colourScale(scaledBgl).css();
    }

    /**
     * Add a leading `-` or `+` depending on the polarity of a number
     */
    getDeltaDisplayValue(scaledDelta: number): string {
        if (scaledDelta >= 0) {
            return `+${scaledDelta.toFixed(1)}`;
        } else {
            return `-${Math.abs(scaledDelta).toFixed(1)}`;
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
