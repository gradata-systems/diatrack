import {UserPreferences} from "./UserPreferences";
import {DataSource} from "./DataSource";

export interface User {
    id: string;
    name: string;
    emailAddress: string;
    created: Date;
    preferences: UserPreferences;
    dataSources: DataSource[];
}
