import type { TimeSeriesPoint } from '../data/time-series-transformer.js'
import { assert } from '../utils/errors.js'

type ChartDataPoint = {
  x: number
  y: number
}

export class CategoryLinesChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(timeSeries: TimeSeriesPoint[]): void {
    // Add visible indicator that render was called
    const debugDiv = document.createElement('div')
    debugDiv.textContent = '[DEBUG] CategoryLinesChart.render() called'
    debugDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: yellow; padding: 10px; z-index: 9999;'
    document.body.appendChild(debugDiv)
    setTimeout(() => debugDiv.remove(), 3000)
    
    assert(timeSeries !== undefined, 'Time series data is required')
    assert(Array.isArray(timeSeries), 'Time series must be an array')
    
    // Debug: Check if we have category data
    if (timeSeries.length > 0 && !timeSeries[0]!.cumulativeLines) {
      const errorDiv = document.createElement('div')
      errorDiv.textContent = '[ERROR] No cumulativeLines data in timeSeries!'
      errorDiv.style.cssText = 'position: fixed; top: 60px; right: 10px; background: red; color: white; padding: 10px; z-index: 9999;'
      document.body.appendChild(errorDiv)
      setTimeout(() => errorDiv.remove(), 5000)
      return
    }
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Create separate series for each category
    const categories = ['application', 'test', 'build', 'documentation', 'other'] as const
    const categoryNames = {
      application: 'Application',
      test: 'Test',
      build: 'Build',
      documentation: 'Documentation',
      other: 'Other'
    }
    const categoryColors = {
      application: isDark ? '#f85149' : '#ea5545',
      test: isDark ? '#a5a5ff' : '#b33dc6',
      build: isDark ? '#f0883e' : '#f27036',
      documentation: isDark ? '#7ce38b' : '#27ae60',
      other: isDark ? '#c69026' : '#f39c12'
    }
    
    const series: any[] = []
    
    for (const category of categories) {
      const data: ChartDataPoint[] = timeSeries.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.cumulativeLines[category]
      }))
      
      series.push({
        name: categoryNames[category],
        data,
        color: categoryColors[category]
      })
    }
    
    const options = {
      chart: { 
        id: 'category-lines-chart',
        type: 'line', 
        height: 350, 
        toolbar: { show: false },
        background: isDark ? '#161b22' : '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false,
          type: 'x'
        }
      },
      series,
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      xaxis: { 
        type: 'datetime',
        title: { 
          text: 'Date',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: {
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM yyyy',
            day: 'dd MMM',
            hour: 'HH:mm'
          },
          datetimeUTC: false,
          style: { colors: isDark ? '#f0f6fc' : '#24292f' }
        }
      },
      yaxis: {
        title: { 
          text: 'Lines of Code',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        min: 0,
        labels: { 
          style: { colors: isDark ? '#f0f6fc' : '#24292f' },
          formatter: function(val: number) {
            return val.toLocaleString()
          }
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: {
          colors: isDark ? '#f0f6fc' : '#24292f'
        }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        enabled: true,
        shared: true,
        intersect: false,
        x: {
          format: 'dd MMM yyyy'
        },
        y: {
          formatter: function(val: number) {
            return val.toLocaleString() + ' lines'
          }
        }
      },
      grid: {
        borderColor: isDark ? '#30363d' : '#e1e4e8'
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
    
    // Verify it's registered
    setTimeout(() => {
      (window as any).ApexCharts.getChartByID('category-lines-chart')
    }, 100)
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }
}