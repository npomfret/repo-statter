import type { TimeSeriesPoint } from '../data/time-series-transformer.js'
import { assert } from '../utils/errors.js'

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
    timeSeries: TimeSeriesPoint[]
  ): void {
    assert(timeSeries !== undefined, 'Time series data is required')
    assert(Array.isArray(timeSeries), 'Time series must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    
    // Always use date-based data for commit activity over time
    const data: ChartDataPoint[] = timeSeries.map(point => ({
      x: new Date(point.date).getTime(),
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
        type: 'datetime', 
        title: { 
          text: 'Date',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { 
          style: { colors: isDark ? '#f0f6fc' : '#24292f' }
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
      tooltip: {
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