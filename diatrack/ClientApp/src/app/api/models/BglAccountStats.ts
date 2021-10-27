import {BglDataPoint} from "./BglDataPoint";

export interface BglAccountStats
{
    [key: string]: {
        interval: 'Second|Minute|Hour|Day|Week|Month|Year';
        stats: BglDataPoint[];
    }
}
