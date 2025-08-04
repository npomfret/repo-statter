import type { ApexOptions } from 'apexcharts'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../../../data/types.js'
import type { CommitData } from '../../../git/parser.js'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLOR_PALETTES } from '../shared/colors.js'
import { createBaseChartOptions, createDateTimeAxisOptions, createNumericAxisOptions, createLegendOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateTimeSeriesPoint, validateLinearSeriesPoint } from '../shared/validators.js'
import { formatBytes } from '../chart-utils.js'

export const growthChart: ChartDefinition = {
  type: 'area',
  hasAxisToggle: true,
  defaultAxis: 'commit',
  height: 350,
  elementId: 'growthChart',
  dataFormatter: (data: { linearSeries: LinearSeriesPoint[], timeSeries: TimeSeriesPoint[], commits: CommitData[] }, options?: { axisMode?: 'date' | 'commit' }) => {
    const mode = options?.axisMode || 'commit'
    
    if (!data.linearSeries || !Array.isArray(data.linearSeries)) {
      throw new Error('growth: linearSeries must be an array')
    }
    if (!data.timeSeries || !Array.isArray(data.timeSeries)) {
      throw new Error('growth: timeSeries must be an array')
    }
    if (!data.commits || !Array.isArray(data.commits)) {
      throw new Error('growth: commits must be an array')
    }
    
    if (mode === 'date') {
      data.timeSeries.forEach((point, index) => {
        validateTimeSeriesPoint(point, index, 'growth')
        if (!point.cumulativeLines || typeof point.cumulativeLines.total !== 'number') {
          throw new Error(`growth: TimeSeriesPoint at ${point.date} has invalid cumulativeLines`)
        }
        if (!point.cumulativeBytes || typeof point.cumulativeBytes.total !== 'number') {
          throw new Error(`growth: TimeSeriesPoint at ${point.date} has invalid cumulativeBytes`)
        }
      })
      
      return {
        series: [
          {
            name: 'Lines of Code',
            data: data.timeSeries.map(point => ({
              x: new Date(point.date).getTime(),
              y: point.cumulativeLines.total
            })),
            yAxisIndex: 0
          },
          {
            name: 'Repository Size',
            data: data.timeSeries.map(point => ({
              x: new Date(point.date).getTime(),
              y: point.cumulativeBytes.total
            })),
            yAxisIndex: 1
          }
        ],
        mode,
        linearSeries: data.linearSeries,
        commits: data.commits
      }
    } else {
      data.linearSeries.forEach((point, index) => {
        validateLinearSeriesPoint(point, index, 'growth')
        if (typeof point.cumulativeLines !== 'number' || point.cumulativeLines < 0) {
          throw new Error(`growth: LinearSeriesPoint at index ${index} has invalid cumulativeLines: ${point.cumulativeLines}`)
        }
        if (typeof point.cumulativeBytes !== 'number' || point.cumulativeBytes < 0) {
          throw new Error(`growth: LinearSeriesPoint at index ${index} has invalid cumulativeBytes: ${point.cumulativeBytes}`)
        }
      })
      
      return {
        series: [
          {
            name: 'Lines of Code',
            data: data.linearSeries.map(point => ({
              x: point.commitIndex + 1,
              y: point.cumulativeLines
            })),
            yAxisIndex: 0
          },
          {
            name: 'Repository Size',
            data: data.linearSeries.map(point => ({
              x: point.commitIndex + 1,
              y: point.cumulativeBytes
            })),
            yAxisIndex: 1
          }
        ],
        mode,
        linearSeries: data.linearSeries,
        commits: data.commits
      }
    }
  },
  optionsBuilder: (data): ApexOptions => {
    const baseOptions = {
      ...createBaseChartOptions('area', 350),
      chart: {
        ...createBaseChartOptions('area', 350).chart,
        id: 'growth-chart',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false
        }
      },
      series: data.series,
      colors: [
        CHART_COLOR_PALETTES.pastel[0],  // Pastel pink for Lines of Code
        CHART_COLOR_PALETTES.pastel[3]   // Pastel lavender for Repository Size
      ],
      stroke: { curve: 'straight' as const, width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.6,
          opacityTo: 0.1
        }
      },
      legend: {
        ...createLegendOptions('top'),
        horizontalAlign: 'left' as const
      },
      dataLabels: { enabled: false },
      tooltip: createTooltipOptions()
    }
    
    if (data.mode === 'date') {
      return {
        ...baseOptions,
        xaxis: createDateTimeAxisOptions('Date'),
        yaxis: [
          {
            title: {
              text: 'Lines of Code',
              style: { color: '#24292f' }
            },
            min: 0,
            labels: {
              style: { colors: '#24292f' },
              formatter: function(val: number) {
                return val.toLocaleString()
              }
            }
          },
          {
            opposite: true,
            title: {
              text: 'Repository Size',
              style: { color: '#24292f' }
            },
            min: 0,
            labels: {
              formatter: formatBytes,
              style: { colors: '#24292f' }
            }
          }
        ],
        tooltip: {
          ...createTooltipOptions(),
          x: { format: 'dd MMM yyyy' }
        }
      }
    } else {
      return {
        ...baseOptions,
        xaxis: {
          ...createNumericAxisOptions('Commit Number'),
          labels: {
            style: { colors: '#24292f' },
            formatter: function(val: string) {
              return Math.round(Number(val)).toString()
            }
          },
          min: 1,
          max: data.linearSeries.length
        },
        yaxis: [
          {
            title: {
              text: 'Lines of Code',
              style: { color: '#24292f' }
            },
            min: 0,
            labels: {
              style: { colors: '#24292f' },
              formatter: function(val: number) {
                return val.toLocaleString()
              }
            }
          },
          {
            opposite: true,
            title: {
              text: 'Repository Size',
              style: { color: '#24292f' }
            },
            min: 0,
            labels: {
              formatter: formatBytes,
              style: { colors: '#24292f' }
            }
          }
        ],
        tooltip: {
          ...createTooltipOptions(),
          custom: function({dataPointIndex}: any) {
            const point = data.linearSeries[dataPointIndex]
            if (!point || point.sha === 'start') return ''

            const commit = data.commits.find((c: CommitData) => c.sha === point.sha)
            if (!commit) return ''

            const truncateMessage = (msg: string, maxLength: number) => {
              if (msg.length <= maxLength) return msg
              return msg.substring(0, maxLength) + '...'
            }

            let linesDisplay = ''
            const added = commit.linesAdded
            const deleted = commit.linesDeleted
            const net = point.netLines

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

            const bytesAdded = commit.bytesAdded || 0
            const bytesDeleted = commit.bytesDeleted || 0
            let bytesDisplay = ''
            if (bytesAdded > 0) {
              bytesDisplay += '+' + formatBytes(bytesAdded)
            }
            if (bytesDeleted > 0) {
              if (bytesDisplay !== '') {
                bytesDisplay += ' / '
              }
              bytesDisplay += '-' + formatBytes(bytesDeleted)
            }
            if (bytesAdded === 0 && bytesDeleted === 0) {
              bytesDisplay = '0 bytes'
            }

            return '<div class="custom-tooltip">' +
                '<div class="tooltip-title">Commit #' + (point.commitIndex + 1) + '</div>' +
                '<div class="tooltip-content">' +
                '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
                '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
                '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
                '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>' +
                '<div><strong>Lines:</strong> ' + linesDisplay + netDisplay + '</div>' +
                '<div><strong>Total Lines:</strong> ' + point.cumulativeLines.toLocaleString() + '</div>' +
                '<div><strong>Bytes:</strong> ' + bytesDisplay + '</div>' +
                '<div><strong>Total Size:</strong> ' + formatBytes(point.cumulativeBytes) + '</div>' +
                '</div></div>'
          }
        }
      }
    }
  }
}