import type { LinearSeriesPoint } from '../data/linear-transformer.js'
import type { TimeSeriesPoint } from '../data/time-series-transformer.js'
import type { CommitData } from '../git/parser.js'
import { assert } from '../utils/errors.js'

type ChartDataPoint = {
  x: number
  y: number
}

function formatBytes(bytes: number): string {
  if (bytes >= 1000000000) {
    return (bytes / 1000000000).toFixed(2) + ' GB'
  } else if (bytes >= 1000000) {
    return (bytes / 1000000).toFixed(2) + ' MB'
  } else if (bytes >= 1000) {
    return (bytes / 1000).toFixed(2) + ' KB'
  } else {
    return bytes.toFixed(0) + ' bytes'
  }
}

export class GrowthChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(
    linearSeries: LinearSeriesPoint[], 
    timeSeries: TimeSeriesPoint[], 
    xAxis: 'date' | 'commit',
    commits: CommitData[]
  ): void {
    assert(linearSeries !== undefined, 'Linear series data is required')
    assert(timeSeries !== undefined, 'Time series data is required')
    assert(Array.isArray(linearSeries), 'Linear series must be an array')
    assert(Array.isArray(timeSeries), 'Time series must be an array')
    assert(xAxis === 'date' || xAxis === 'commit', 'X-axis must be "date" or "commit"')
    assert(commits !== undefined, 'Commits data is required')
    assert(Array.isArray(commits), 'Commits must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    
    // Build chart data based on x-axis selection
    const linesData: ChartDataPoint[] = xAxis === 'date' 
      ? timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: typeof point.cumulativeLines === 'object' ? point.cumulativeLines.total : point.cumulativeLines
        }))
      : linearSeries.map(point => ({
          x: point.commitIndex + 1,
          y: point.cumulativeLines
        }))
    
    const bytesData: ChartDataPoint[] = xAxis === 'date' 
      ? timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: typeof point.cumulativeBytes === 'object' ? point.cumulativeBytes.total : point.cumulativeBytes
        }))
      : linearSeries.map(point => ({
          x: point.commitIndex + 1,
          y: point.cumulativeBytes
        }))
    
    const options = {
      chart: { 
        id: 'growth-chart',
        type: 'area', 
        height: 350, 
        toolbar: { show: false },
        background: '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false,
          type: 'x'  // Restrict zoom to x-axis only
        }
      },
      series: [
        {
          name: 'Lines of Code',
          data: linesData,
          yAxisIndex: 0
        },
        {
          name: 'Repository Size',
          data: bytesData,
          yAxisIndex: 1
        }
      ],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      xaxis: { 
        type: xAxis === 'date' ? 'datetime' : 'numeric', 
        title: { 
          text: xAxis === 'date' ? 'Date' : 'Commit Number',
          style: { color: '#24292f' }
        },
        labels: {
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM yyyy',
            day: 'dd MMM',
            hour: 'HH:mm',
            minute: 'HH:mm',
            second: 'HH:mm:ss'
          },
          datetimeUTC: false,
          style: { colors: '#24292f' },
          formatter: xAxis === 'commit' ? 
            function(val: any) { return Math.floor(val).toString() } : 
            undefined
        }
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
      fill: { 
        type: 'gradient', 
        gradient: { 
          shadeIntensity: 1, 
          opacityFrom: 0.5, 
          opacityTo: 0.7 
        } 
      },
      colors: [
        '#ea5545',  // Lines of Code color
        '#b33dc6'   // Repository Size color
      ],
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: {
          colors: '#24292f'
        }
      },
      tooltip: xAxis === 'date' ? {
        theme: 'light',
        enabled: true,
        shared: true,
        intersect: false,
        x: {
          format: 'dd MMM yyyy'
        },
        y: [
          {
            formatter: function(val: number) {
              return val.toLocaleString() + ' lines'
            }
          },
          {
            formatter: formatBytes
          }
        ]
      } : {
        theme: 'light',
        custom: this.createCommitTooltip(xAxis, linearSeries, commits)
      },
      grid: {
        borderColor: '#e1e4e8'
      }
    }
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    
    // ApexCharts will be available globally in the browser
    this.chart = new (window as any).ApexCharts(container, options)
    this.chart.render()
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }

  private createCommitTooltip(
    xAxis: 'date' | 'commit', 
    linearSeries: LinearSeriesPoint[], 
    commits: CommitData[]
  ) {
    return ({ dataPointIndex }: any) => {
      if (xAxis === 'commit') {
        const point = linearSeries[dataPointIndex]
        if (point && point.sha !== 'start') {
          const commit = commits.find(c => c.sha === point.sha)
          if (commit) {
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
            
            let content = '<div class="custom-tooltip">' +
              '<div class="tooltip-title">Commit #' + point.commitIndex + '</div>' +
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
            
            return content
          }
        }
      }
      return null
    }
  }
}