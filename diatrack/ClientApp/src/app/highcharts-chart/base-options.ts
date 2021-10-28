import {Options} from 'highcharts';

export const DEFAULT_CHART_ANIMATION_DURATION = 400;

export const HIGHCHARTS_BASE_OPTIONS: Options = {
    chart: {
        animation: true,
        spacingTop: 10,
        spacingRight: 0,
        spacingBottom: 0,
        spacingLeft: 0,
        backgroundColor: 'transparent',
        style: {
            fontFamily: 'Roboto,sans-serif'
        },
    },
    time: {
        useUTC: false
    },
    title: {
        style: {
            color: 'white'
        }
    },
    credits: {
        enabled: false
    },
    tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 5,
        borderWidth: 1,
        style: {
            color: 'white'
        }
    },
    legend: {
        enabled: false,
        align: 'center',
        layout: 'horizontal',
        verticalAlign: 'top'
    },
    xAxis: {
        tickLength: 5,
        labels: {
            style: {
                color: '#ccc',
                fontSize: '1em'
            }
        }
    },
    yAxis: {
        tickLength: 5,
        gridLineColor: 'rgba(255, 255, 255, 0.1)',
        labels: {
            style: {
                color: '#ccc',
                fontSize: '1em'
            }
        }
    }
};
