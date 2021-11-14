import {HistogramProfile} from "../histogram-profile";
import {Duration} from "luxon";
import {TimeUnit} from "../../../api/models/bgl-account-stats";

const cgmFrequencyMinutes = 5;

export type HistogramProfileType = '3 hours'|'6 hours'|'12 hours'|'1 day'|'1 week'|'1 month';
export const HISTOGRAM_PROFILES: ReadonlyMap<HistogramProfileType, HistogramProfile> = new Map([
    ['3 hours', {
        queryPeriod: Duration.fromISO('P1D'),
        displayPeriod: Duration.fromISO('PT3H'),
        bucketTimeUnit: TimeUnit.Minute,
        bucketTimeFactor: cgmFrequencyMinutes,
        movingAveragePeriod: 1
    }],
    ['6 hours', {
        queryPeriod: Duration.fromISO('P1D'),
        displayPeriod: Duration.fromISO('PT6H'),
        bucketTimeUnit: TimeUnit.Minute,
        bucketTimeFactor: cgmFrequencyMinutes,
        movingAveragePeriod: 1
    }],
    ['12 hours', {
        name: '12 hours',
        queryPeriod: Duration.fromISO('P1D'),
        displayPeriod: Duration.fromISO('PT12H'),
        bucketTimeUnit: TimeUnit.Minute,
        bucketTimeFactor: cgmFrequencyMinutes,
        movingAveragePeriod: 1
    }],
    ['1 day', {
        queryPeriod: Duration.fromISO('P1D'),
        displayPeriod: Duration.fromISO('P1D'),
        bucketTimeUnit: TimeUnit.Minute,
        bucketTimeFactor: cgmFrequencyMinutes,
        movingAveragePeriod: 1
    }],
    ['1 week', {
        name: '1 week',
        queryPeriod: Duration.fromISO('P1M'),
        displayPeriod: Duration.fromISO('P1W'),
        bucketTimeUnit: TimeUnit.Hour,
        bucketTimeFactor: 1,
        movingAveragePeriod: 24 // Periodicity of one day
    }],
    ['1 month', {
        queryPeriod: Duration.fromISO('P1M'),
        displayPeriod: Duration.fromISO('P1M'),
        bucketTimeUnit: TimeUnit.Hour,
        bucketTimeFactor: 1,
        movingAveragePeriod: 24
    }]
]);
