import {Injectable} from '@angular/core';
import {MatIconRegistry} from "@angular/material/icon";
import {DomSanitizer} from "@angular/platform-browser";

@Injectable({
    providedIn: 'root'
})
export class AppIconService {

    private readonly icons: ReadonlyMap<string, string> = new Map<AppIcon, string>([
        [ AppIcon.BglReading, '../assets/icons/bloodtype_white_24dp.svg' ],
        [ AppIcon.BasalRateChange, '../assets/icons/percent_white_24dp.svg' ],
        [ AppIcon.Exercise, '../assets/icons/directions_run_white_24dp.svg' ],
        [ AppIcon.Food, '../assets/icons/dining_white_24dp.svg' ],
        [ AppIcon.Insulin, '../assets/icons/glyphicons-basic-627-syringe-empty.svg' ],
        [ AppIcon.Note, '../assets/icons/assignment_white_24dp.svg' ]
    ]);

    constructor(
        private matIconRegistry: MatIconRegistry,
        private domSanitizerService: DomSanitizer
    ) { }

    registerIcons() {
        this.icons.forEach((url, key) => {
            this.matIconRegistry.addSvgIcon(key, this.domSanitizerService.bypassSecurityTrustResourceUrl(url));
        });
    }

    getIconUrl(iconId: AppIcon): string | undefined {
        return this.icons.get(iconId);
    }
}

export enum AppIcon
{
    BglReading = 'bgl_reading',
    Exercise = 'exercise',
    Food = 'food',
    Insulin = 'insulin',
    BasalRateChange = 'percent',
    Note = 'note'
}
