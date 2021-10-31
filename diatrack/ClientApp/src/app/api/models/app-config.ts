export interface AppConfig {
    clientId: string;
    authority: string;
    knownAuthorities: string[];
    redirectUri: string;
    protectedResourceUris: string[];
    scopes: string[];
}
