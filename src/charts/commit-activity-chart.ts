import type { LinearSeriesPoint } from '../data/linear-transformer.js'
import type { TimeSeriesPoint } from '../data/time-series-transformer.js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

type ChartDataPoint = {
  x: number
  y: number
}

export class CommitActivityChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(
    linearSeries: LinearSeriesPoint[], 
    timeSeries: TimeSeriesPoint[], 
    xAxis: 'date' | 'commit'
  ): void {
    assert(linearSeries !== undefined, 'Linear series data is required')
    assert(timeSeries !== undefined, 'Time series data is required')
    assert(Array.isArray(linearSeries), 'Linear series must be an array')
    assert(Array.isArray(timeSeries), 'Time series must be an array')
    assert(xAxis === 'date' || xAxis === 'commit', 'X-axis must be "date" or "commit"')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Build chart data based on x-axis selection
    const data: ChartDataPoint[] = xAxis === 'date' 
      ? timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.commits
        }))
      : linearSeries.map(point => ({
          x: point.commitIndex,
          y: point.commits
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
        name: 'Commits',
        data: data
      }],
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
          text: 'Commits',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
      },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
      colors: [isDark ? '#58a6ff' : '#27aeef'],
      grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
      tooltip: xAxis === 'date' ? {
        theme: isDark ? 'dark' : 'light',
        enabled: true,
        shared: false,
        intersect: false,
        x: {
          format: 'dd MMM yyyy'
        },
        y: {
          formatter: function(val: number) {
            return val.toLocaleString() + ' commits'
          }
        }
      } : {
        theme: isDark ? 'dark' : 'light'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth'
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