import {BrowserCacheLocation, InteractionType, IPublicClientApplication, LogLevel, PublicClientApplication} from "@azure/msal-browser";
import {MsalGuardConfiguration, MsalInterceptorConfiguration} from "@azure/msal-angular";
import {AppConfig} from "../../api/models/AppConfig";
import {environment} from "../../../environments/environment";

export function loggerCallback(logLevel: LogLevel, message: string) {
    if (!environment.production) {
        console.debug(message);
    }
}

export function MSALInstanceFactory(appConfig: AppConfig): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: appConfig.clientId,
            authority: appConfig.authority,
            knownAuthorities: appConfig.knownAuthorities,
            redirectUri: '/',
            postLogoutRedirectUri: '/',
            navigateToLoginRequestUrl: true
        },
        cache: {
            cacheLocation: BrowserCacheLocation.LocalStorage
        },
        system: {
            loggerOptions: {
                loggerCallback,
                logLevel: LogLevel.Info,
                piiLoggingEnabled: false
            }
        }
    });
}

export function MSALInterceptorConfigFactory(appConfig: AppConfig): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();

    appConfig.protectedResourceUris.forEach(uri => {
        protectedResourceMap.set(uri, appConfig.scopes);
    });

    return {
        interactionType: InteractionType.Redirect,
        protectedResourceMap
    };
}

export function MSALGuardConfigFactory(appConfig: AppConfig): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Redirect,
        authRequest: {
            scopes: appConfig.scopes
        },
        loginFailedRoute: '/login-failed'
    };
}
