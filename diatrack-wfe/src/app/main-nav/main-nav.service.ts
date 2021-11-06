import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MainNavService {
    expanded = false;

    constructor() { }

    toggleNavExpanded() {
        this.expanded = !this.expanded;
    }
}
