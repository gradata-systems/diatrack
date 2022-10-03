export interface AppConfig {
    apiBasePath: string;
    openId: {
        authorityUrl: string;
        audience: string;
        clientId: string;
        scopes: string[];
    }
}
