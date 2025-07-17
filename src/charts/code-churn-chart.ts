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

export class CodeChurnChart {
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
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    
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

    const createCommitTooltip = (xAxis: 'date' | 'commit', linearSeries: LinearSeriesPoint[], commits: CommitData[], contentBuilder: (commit: CommitData, point: LinearSeriesPoint) => string) => {
      return function(opts: any) {
        if (xAxis === 'commit') {
          const { dataPointIndex } = opts
          const point = linearSeries[dataPointIndex]
          if (!point || point.sha === 'start') return ''
          
          const commit = commits.find(c => c.sha === point.sha)
          if (!commit) return ''
          
          const content = contentBuilder(commit, point)
          return `<div class="custom-tooltip">
            <div><strong>Commit:</strong> ${commit.sha.substring(0, 7)}</div>
            <div><strong>Date:</strong> ${new Date(commit.date).toLocaleDateString()}</div>
            <div><strong>Author:</strong> ${commit.authorName}</div>
            <div><strong>Message:</strong> ${commit.message}</div>
            ${content}
          </div>`
        }
        return null
      }
    }

    const options = {
      chart: { 
        type: 'line', 
        height: 350, 
        toolbar: { show: false }, 
        background: isDark ? '#161b22' : '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false
        }
      },
      series: [
        { 
          name: 'Lines Added', 
          data: buildTimeSeriesData(
            linearSeries,
            xAxis,
            point => point.linesAdded
          )
        },
        { 
          name: 'Lines Deleted', 
          data: buildTimeSeriesData(
            linearSeries,
            xAxis,
            point => point.linesDeleted
          )
        },
        { 
          name: 'Net Lines', 
          data: buildTimeSeriesData(
            linearSeries,
            xAxis,
            point => point.linesAdded - point.linesDeleted
          )
        }
      ],
      xaxis: { 
        type: xAxis === 'date' ? 'datetime' : 'numeric', 
        title: { 
          text: xAxis === 'date' ? 'Date' : 'Commit Number',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { 
          style: { colors: isDark ? '#f0f6fc' : '#24292f' },
          formatter: xAxis === 'commit' ? function(val: any) { return Math.floor(val).toString() } : undefined
        }
      },
      yaxis: { 
        title: { 
          text: 'Lines Changed',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      colors: isDark ? ['#3fb950', '#f85149', '#58a6ff'] : ['#87bc45', '#ea5545', '#27aeef'],
      grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
      legend: {
        labels: { colors: isDark ? '#f0f6fc' : '#24292f' }
      },
      tooltip: xAxis === 'date' ? {
        theme: isDark ? 'dark' : 'light',
        enabled: true,
        shared: true,
        intersect: false,
        x: {
          format: 'dd MMM yyyy'
        },
        y: {
          formatter: function(val: number) {
            return val.toLocaleString()
          }
        }
      } : {
        theme: isDark ? 'dark' : 'light',
        shared: true,
        custom: createCommitTooltip(xAxis, linearSeries, commits, function(commit, _point) {
          return '<div><strong>Lines Added:</strong> ' + commit.linesAdded.toLocaleString() + '</div>' +
                 '<div><strong>Lines Deleted:</strong> ' + commit.linesDeleted.toLocaleString() + '</div>'
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