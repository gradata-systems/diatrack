import {UserPreferences} from "./user-preferences";
import {DataSource} from "./data-source";

export interface User {
    id: string;
    name: string;
    emailAddress: string;
}

export interface UserProfile extends User
{
    created: Date;
    isNew: boolean;
    preferences: UserPreferences;
    dataSources: DataSource[];
}
