import ApexCharts from 'apexcharts'
import { BaseChart } from './base-chart.js'
import type { LinearSeriesPoint, TimeSeriesPoint } from '../chart/data-transformer.js'
import type { CommitData } from '../git/parser.js'
import type { ChartOptions } from '../types/index.js'
import { buildTimeSeriesData } from '../utils/chart-builders.js'
import { createCommitTooltip } from '../utils/tooltip-builders.js'

interface LinesOfCodeData {
  linearSeries: LinearSeriesPoint[]
  timeSeries: TimeSeriesPoint[]
  commits: CommitData[]
}

export class LinesOfCodeChart extends BaseChart {
  public render(data: LinesOfCodeData, options: ChartOptions = { isDark: false, xAxis: 'date' }): void {
    try {
      this.destroy()
      
      const xAxis = options.xAxis || 'date'
      
      const chartOptions: ApexCharts.ApexOptions = {
        ...this.getBaseOptions(),
        chart: {
          ...this.getBaseOptions().chart,
          type: 'area',
          height: 350
        },
        series: [{
          name: 'Lines of Code',
          data: buildTimeSeriesData(
            data.linearSeries,
            xAxis,
            point => point.cumulativeLines,
            data.timeSeries
          )
        }],
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth'
        },
        xaxis: {
          type: xAxis === 'date' ? 'datetime' : 'numeric',
          title: {
            text: xAxis === 'date' ? 'Date' : 'Commit Number',
            ...this.getTitleStyle()
          },
          labels: {
            ...this.getAxisLabelStyle(),
            ...(xAxis === 'date' ? {
              datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM yyyy',
                day: 'dd MMM',
                hour: 'HH:mm',
                minute: 'HH:mm',
                second: 'HH:mm:ss'
              },
              datetimeUTC: false
            } : {
              formatter: function(val: string) { return Math.floor(val as unknown as number).toString() }
            })
          }
        },
        yaxis: {
          title: {
            text: 'Lines of Code',
            ...this.getTitleStyle()
          },
          min: 0,
          labels: this.getAxisLabelStyle() as any
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9
          }
        },
        colors: [this.isDark ? '#f85149' : '#ea5545'],
        tooltip: {
          ...this.getBaseOptions().tooltip,
          x: {
            format: xAxis === 'date' ? 'dd MMM yyyy' : ''
          },
          custom: createCommitTooltip(xAxis, data.linearSeries, data.commits, function(commit, point) {
            let linesDisplay = ''
            const added = commit.linesAdded
            const deleted = commit.linesDeleted
            const net = added - deleted

            if (added > 0) {
                linesDisplay += '+' + added
            }
            if (deleted > 0) {
                if (linesDisplay !== '') {
                    linesDisplay += ' / '
                }
                linesDisplay += '-' + deleted
            }

            let netDisplay = ''
            if (added > 0 && deleted > 0) {
                netDisplay = ' (Net: ' + (net > 0 ? '+' : '') + net + ')'
            } else if (added === 0 && deleted === 0) {
                linesDisplay = '0'
            }

            return '<div><strong>Lines:</strong> ' + linesDisplay + netDisplay + '</div>' +
                   '<div><strong>Total Lines:</strong> ' + point.cumulativeLines.toLocaleString() + '</div>'
          })
        }
      }
      
      this.chart = new ApexCharts(this.container, chartOptions)
      this.chart.render()
    } catch (error) {
      this.handleError(error as Error)
    }
  }
}