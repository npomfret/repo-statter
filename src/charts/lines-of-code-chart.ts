import type { LinearSeriesPoint } from '../data/linear-transformer.js'
import type { TimeSeriesPoint } from '../data/time-series-transformer.js'
import type { CommitData } from '../git/parser.js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

type ChartDataPoint = {
  x: number
  y: number
}

export class LinesOfCodeChart {
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
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Build chart data based on x-axis selection
    const data: ChartDataPoint[] = xAxis === 'date' 
      ? timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.cumulativeLines
        }))
      : linearSeries.map(point => ({
          x: point.commitIndex,
          y: point.cumulativeLines
        }))
    
    const options = {
      chart: { 
        type: 'area', 
        height: 350, 
        toolbar: { show: false },
        background: isDark ? '#161b22' : '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false
        }
      },
      series: [{
        name: 'Lines of Code',
        data: data
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
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
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
          style: { colors: isDark ? '#f0f6fc' : '#24292f' },
          formatter: xAxis === 'commit' ? 
            function(val: any) { return Math.floor(val).toString() } : 
            undefined
        },
        tooltip: {
          x: {
            formatter: xAxis === 'date' ? 
              function(val: any) {
                return new Date(val).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              } : 
              function(val: any) { return 'Commit #' + Math.floor(val) }
          }
        }
      },
      yaxis: { 
        title: { 
          text: 'Lines of Code',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        min: 0,
        labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
      },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
      colors: [isDark ? '#f85149' : '#ea5545'],
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        x: {
          format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
        },
        custom: this.createCommitTooltip(xAxis, linearSeries, commits)
      },
      grid: {
        borderColor: isDark ? '#30363d' : '#e1e4e8'
      }
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
            
            let content = '<div class="custom-tooltip">' +
              '<div class="tooltip-title">Commit #' + point.commitIndex + '</div>' +
              '<div class="tooltip-content">' +
              '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
              '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
              '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
              '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>' +
              '<div><strong>Lines:</strong> ' + linesDisplay + netDisplay + '</div>' +
              '<div><strong>Total Lines:</strong> ' + point.cumulativeLines.toLocaleString() + '</div>' +
              '</div></div>'
            
            return content
          }
        }
      }
      return null
    }
  }
}