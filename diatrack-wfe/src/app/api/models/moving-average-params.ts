export interface MovingAverageParams
{
    enabled?: boolean;
    modelType?: MovingAverageModelType;
    window?: number;
    minimize?: boolean;
    alpha?: number;
    beta?: number;
    period?: number;
    predictionCount?: number;
}

export enum MovingAverageModelType
{
    Simple = 'Simple',
    Linear = 'Linear',
    Ewma = 'Ewma',
    HoltLinear = 'HoltLinear',
    HoltWinters = 'HoltWinters'
}
