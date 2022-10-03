import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, from, Observable, Subject} from 'rxjs';
import {map} from 'rxjs/operators';
import {IIdentity} from './app-auth.service.definitions';
import {AuthConfig, OAuthService} from 'angular-oauth2-oidc';
import {environment} from "../../environments/environment";
import {APP_CONFIG} from "../api/variables";
import {AppConfig} from "../api/models/app-config";

@Injectable({
    providedIn: 'root'
})
export class AppAuthService
{
    tokenReceived$ = new Subject<void>();
    tokenRefreshed$ = new Subject<void>();
    sessionTerminated$ = new Subject<void>();

    /**
     * Identity of the currently authenticated user
     */
    activeUser$ = new BehaviorSubject<IIdentity | undefined>(undefined);

    constructor(
        @Inject(APP_CONFIG) private appConfig: AppConfig,
        public oAuthService: OAuthService
    ) { }

    /**
     * Configure OpenID authentication and try to retrieve a stored auth token
     * @returns Whether we have a valid auth token
     */
    configure(): Observable<boolean>
    {
        const oAuthConfig: AuthConfig = {
            issuer: this.appConfig.openId.authorityUrl,
            clientId: this.appConfig.openId.clientId,
            redirectUri: window.location.origin,
            responseType: 'code',   // Use PKCE
            scope: this.appConfig.openId.scopes.join(' '),
            disableAtHashCheck: true,   // Keycloak does not provide at_hash in JWT
            requireHttps: environment.production ? true : 'remoteOnly',
            showDebugInformation: !environment.production
        };

        this.oAuthService.events.subscribe((event) => {
            if (!environment.production)
                console.log(`Auth event: ${event.type}`);

            switch (event.type)
            {
                case 'token_received':
                    this.tokenReceived$.next();
                    this.activeUser$.next(this.getIdentityFromClaims());
                    break;
                case 'session_terminated':
                    this.sessionTerminated$.next();
                    this.logout();
                    break;
                case 'token_refreshed':
                    this.tokenRefreshed$.next();
                    break;
            }
        });

        this.oAuthService.configure(oAuthConfig);
        this.oAuthService.setupAutomaticSilentRefresh();

        // Attempt login and return whether a valid token is obtained
        return from(this.oAuthService.loadDiscoveryDocumentAndTryLogin()).pipe(map((result) => {
            if (result)
                this.activeUser$.next(this.getIdentityFromClaims());

            return this.oAuthService.hasValidAccessToken();
        }));
    }

    /**
     * Query the user's identity claims from the access token, if it exists and return an
     * `IIdentity` object containing well-known properties
     */
    private getIdentityFromClaims(): IIdentity | undefined
    {
        const claims: any = this.oAuthService.getIdentityClaims();
        if (!claims)
            return undefined;

        return {
            id: claims.sub,
            name: claims.name,
            givenName: claims.given_name,
            familyName: claims.family_name,
            email: claims.email
        };
    }

    login()
    {
        this.oAuthService.initCodeFlow(window.location.href, {
            audience: this.appConfig.openId.audience
        });
    }

    logout()
    {
        this.oAuthService.logOut();
        this.activeUser$.next(undefined);
    }
}
