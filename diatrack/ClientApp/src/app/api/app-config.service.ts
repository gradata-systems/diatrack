import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient} from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    readonly autoRefreshEnabled = false;
    readonly refreshInterval = 5000;

    constructor(
        @Inject(BASE_PATH) private basePath: string
    ) { }
}
