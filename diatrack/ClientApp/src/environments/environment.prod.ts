import {AppConfig} from "../app/api/models/app-config";

export const environment = {
    production: true,
    appConfig: (window as any)['env'] as AppConfig
};
