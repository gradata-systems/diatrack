import {InjectionToken} from "@angular/core";
import {AppConfig} from "./models/AppConfig";

export const BASE_PATH = new InjectionToken<string>('basePath');
export const APP_CONFIG = new InjectionToken<AppConfig>('appConfig');
