import {UserPreferences} from "./UserPreferences";
import {DexcomAccount} from "./DexcomAccount";

export interface User
{
  id: string;
  name: string;
  emailAddress: string;
  created: Date;
  preferences: UserPreferences;
  dexcomAccounts: DexcomAccount[];
}
