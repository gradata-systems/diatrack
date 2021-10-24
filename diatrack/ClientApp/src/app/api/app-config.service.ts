import {Inject, Injectable} from '@angular/core';
import {BASE_PATH} from "./variables";
import {HttpClient} from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    constructor(
        @Inject(BASE_PATH) private basePath: string,
        private httpClient: HttpClient
    ) { }
}
