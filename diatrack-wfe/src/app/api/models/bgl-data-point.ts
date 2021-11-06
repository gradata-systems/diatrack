export interface BglDataPoint {
    timestamp: string;
    stats: {
        count: number;
        average: number;
        min: number;
        max: number;
        sum: number;
    }
}
