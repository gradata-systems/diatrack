import {TimeUnit} from "../../api/models/bgl-account-stats";
import {DurationLike} from "luxon";

export interface HistogramProfile
{
    /**
     * Period of time to query
     */
    queryPeriod: DurationLike;

    /**
     * Initially display this amount of data in the view
     */
    displayPeriod: DurationLike;

    /**
     * Calendar unit (see Elasticsearch.Net `Nest.DateInterval`)
     */
    bucketTimeUnit: TimeUnit;

    /**
     * Divide date range into buckets of this number of calendar units
     */
    bucketTimeFactor: number;

    /**
     * Calculate the moving averate using this periodicity (where it is relevant for the model type, like Holt-Winters)
     */
    movingAveragePeriod: number;
}

export enum HistogramIntervalType
{

}
