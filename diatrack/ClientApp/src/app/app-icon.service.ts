import {Injectable} from '@angular/core';
import {MatIconRegistry} from "@angular/material/icon";
import {DomSanitizer} from "@angular/platform-browser";
import {BglTrend} from "./api/models/bgl-reading";

@Injectable({
    providedIn: 'root'
})
export class AppIconService {

    private readonly logActivityIcons: ReadonlyMap<LogActivityIcon, string> = new Map<LogActivityIcon, string>([
        [ LogActivityIcon.BglReading, '../assets/icons/bloodtype_white_24dp.svg' ],
        [ LogActivityIcon.BasalRateChange, '../assets/icons/percent_white_24dp.svg' ],
        [ LogActivityIcon.Exercise, '../assets/icons/directions_run_white_24dp.svg' ],
        [ LogActivityIcon.Food, '../assets/icons/dining_white_24dp.svg' ],
        [ LogActivityIcon.Insulin, '../assets/icons/glyphicons-basic-627-syringe-empty.svg' ],
        [ LogActivityIcon.Note, '../assets/icons/assignment_white_24dp.svg' ]
    ]);

    private readonly bglTrendIcons: ReadonlyMap<BglTrend, string> = new Map<BglTrend, string>([
        [ BglTrend.DoubleUp, '../assets/icons/arrows/double-up.svg' ],
        [ BglTrend.SingleUp, '../assets/icons/arrows/single-up.svg' ],
        [ BglTrend.FortyFiveUp, '../assets/icons/arrows/fortyfive-up.svg' ],
        [ BglTrend.Flat, '../assets/icons/arrows/flat.svg' ],
        [ BglTrend.FortyFiveDown, '../assets/icons/arrows/double-up.svg' ],
        [ BglTrend.SingleDown, '../assets/icons/arrows/single-down.svg' ],
        [ BglTrend.DoubleDown, '../assets/icons/arrows/double-down.svg' ]
    ]);

    constructor(
        private matIconRegistry: MatIconRegistry,
        private domSanitizerService: DomSanitizer
    ) { }

    registerIcons() {
        this.logActivityIcons.forEach((url, key) => {
            this.matIconRegistry.addSvgIcon(key, this.domSanitizerService.bypassSecurityTrustResourceUrl(url));
        });

        this.bglTrendIcons.forEach((url, key) => {
            this.matIconRegistry.addSvgIcon(key, this.domSanitizerService.bypassSecurityTrustResourceUrl(url));
        });
    }

    getLogActivityIconUrl(iconId: LogActivityIcon): string | undefined {
        return this.logActivityIcons.get(iconId);
    }

    getBglTrendIconUrl(iconId: BglTrend): string | undefined {
        return this.bglTrendIcons.get(iconId);
    }
}

export enum LogActivityIcon
{
    BglReading = 'bgl_reading',
    Exercise = 'exercise',
    Food = 'food',
    Insulin = 'insulin',
    BasalRateChange = 'percent',
    Note = 'note'
}
