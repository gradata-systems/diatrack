export interface AppConfig {
    apiBasePath: string;
    clientId: string;
    authority: string;
    knownAuthorities: string[];
    redirectUri: string;
    protectedResourceUris: string[];
    scopes: string[];
}
