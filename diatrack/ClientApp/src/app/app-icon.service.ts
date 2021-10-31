import {Injectable} from '@angular/core';
import {MatIconRegistry} from "@angular/material/icon";
import {DomSanitizer} from "@angular/platform-browser";

@Injectable({
    providedIn: 'root'
})
export class AppIconService {

    readonly icons: ReadonlyMap<string, string> = new Map<AppIcon, string>([
        [ AppIcon.BglReading, '../assets/icons/bloodtype_black_24dp.svg' ],
        [ AppIcon.Exercise, '../assets/icons/directions_run_black_24dp.svg' ],
        [ AppIcon.Food, '../assets/icons/glyphicons-basic-278-cutlery.svg' ],
        [ AppIcon.Insulin, '../assets/icons/glyphicons-basic-627-syringe-empty.svg' ],
        [ AppIcon.Note, '../assets/icons/text_snippet_black_24dp.svg' ]
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
}

export enum AppIcon
{
    BglReading = 'bgl_reading',
    Exercise = 'exercise',
    Food = 'food',
    Insulin = 'insulin',
    Note = 'note'
}
