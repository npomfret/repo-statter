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

export class RepositorySizeChart {
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
    const buildTimeSeriesData = (data: LinearSeriesPoint[], xAxis: 'date' | 'commit', yValueExtractor: (point: any) => number): ChartDataPoint[] => {
      if (xAxis === 'date') {
        return timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: yValueExtractor(point)
        }))
      } else {
        return data.map(point => ({
          x: point.commitIndex,
          y: yValueExtractor(point)
        }))
      }
    }

    const createCommitTooltip = (xAxis: 'date' | 'commit', filteredLinearSeries: LinearSeriesPoint[], commits: CommitData[], customContent: (commit: CommitData, point: LinearSeriesPoint) => string) => {
      return function({ dataPointIndex }: any) {
        if (xAxis === 'commit') {
          const point = filteredLinearSeries[dataPointIndex]
          if (point && point.sha !== 'start') {
            const commit = commits.find(c => c.sha === point.sha)
            if (commit) {
              const content = customContent(commit, point)
              return `<div class="custom-tooltip">
                <div><strong>Commit:</strong> ${commit.sha.substring(0, 7)}</div>
                <div><strong>Date:</strong> ${new Date(commit.date).toLocaleDateString()}</div>
                <div><strong>Author:</strong> ${commit.authorName}</div>
                <div><strong>Message:</strong> ${commit.message}</div>
                ${content}
              </div>`
            }
          }
        }
        return null
      }
    }

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
        name: 'Repository Size',
        data: buildTimeSeriesData(
          linearSeries,
          xAxis,
          point => point.cumulativeBytes
        )
      }],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' },
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
            hour: 'HH:mm'
          },
          style: { colors: isDark ? '#f0f6fc' : '#24292f' },
          formatter: xAxis === 'commit' ? function(val: any) { return Math.floor(val).toString() } : undefined
        }
      },
      yaxis: { 
        title: { 
          text: 'Repository Size',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        min: 0,
        labels: {
          formatter: formatBytes,
          style: { colors: isDark ? '#f0f6fc' : '#24292f' }
        }
      },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
      colors: [isDark ? '#a5a5ff' : '#b33dc6'],
      grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        x: {
          format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
        },
        y: {
          formatter: formatBytes
        },
        custom: createCommitTooltip(xAxis, linearSeries, commits, function(commit, point) {
          return '<div><strong>Bytes Added:</strong> ' + formatBytes(commit.bytesAdded || 0) + '</div>' +
                 '<div><strong>Bytes Deleted:</strong> ' + formatBytes(commit.bytesDeleted || 0) + '</div>' +
                 '<div><strong>Total Size:</strong> ' + formatBytes(point.cumulativeBytes) + '</div>'
        })
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
}