export interface BglDataPoint {
    timestamp: string;
    average?: {
        value?: number
    },
    movingAverage?: {
        value: number;
    }
}
