import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient} from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    readonly autoRefreshEnabled = true;
    readonly refreshInterval = 10000;
    readonly formDebounceInterval = 500;
    readonly queryDebounceInterval = 1000;
    readonly maxNoteLength = 1000;
    readonly initialLogEntryQuerySize = 100;

    /**
     * How often CGM data is generated
     */
    readonly cgmFrequencyMinutes = 5;

    constructor(
        @Inject(BASE_PATH) private basePath: string
    ) { }
}
