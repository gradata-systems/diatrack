// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import {AppConfig} from "../app/api/models/AppConfig";

export const environment = {
    production: false,
    apiBasePath: '/api',
    appConfig: {
        clientId: '397b9d98-83b4-451d-a271-e68f9675e277',
        authority: 'https://diatrack.b2clogin.com/diatrack.onmicrosoft.com/b2c_1_signin_signup',
        knownAuthorities: ['diatrack.b2clogin.com'],
        redirectUri: 'http://localhost:4200/',
        protectedResourceUris: [
            'http://localhost:4200/api/*',
            'https://localhost:5001/*'
        ],
        scopes: ['https://diatrack.onmicrosoft.com/397b9d98-83b4-451d-a271-e68f9675e277/owndata:readwrite']
    } as AppConfig
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
