export interface DataSource {
    id?: string;
    type: DataSourceType;
    regionId: string;
    loginId: string;
    password?: string;
    name: string;
}

export enum DataSourceType {
    Dexcom = 'Dexcom'
}
