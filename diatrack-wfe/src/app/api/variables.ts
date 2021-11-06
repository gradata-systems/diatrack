import {InjectionToken} from "@angular/core";
import {AppConfig} from "./models/app-config";

export const BASE_PATH = new InjectionToken<string>('basePath');
export const APP_CONFIG = new InjectionToken<AppConfig>('appConfig');
