export interface DataSource {
    id?: string;
    type: DataSourceType;
    name: string;
    loginId: string;
    regionId: string;
    password?: string;
}

export enum DataSourceType {
    Dexcom = 'Dexcom'
}
