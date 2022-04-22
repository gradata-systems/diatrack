import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs";

@Injectable()
export class PageService {

    readonly loading$ = new BehaviorSubject<boolean>(false);

    constructor() { }

    isLoading(loading: boolean) {
        if (loading !== this.loading$.value) {
            this.loading$.next(loading);
        }
    }
}
