export interface BglReading {
    accountId: string;
    timestamp: Date;
    received: Date;
    trend: BglTrend;
    trendId: number;
    value: number;
}

export enum BglTrend {
    None = "None",
    DoubleUp = "DoubleUp",
    SingleUp = "SingleUp",
    FortyFiveUp = "FortyFiveUp",
    Flat = "Flat",
    FortyFiveDown = "FortyFiveDown",
    SingleDown = "SingleDown",
    DoubleDown = "DoubleDown",
    NotComputable = "NotComputable",
    RateOutOfRange = "RateOutOfRange"
}
