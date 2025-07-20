import type { FileTypeStats } from '../data/file-calculator.js'
import { assert } from '../utils/errors.js'

export class FileTypesChart {
  private containerId: string
  private chart: any = null
  private onFileTypeClick?: (fileType: string | null) => void

  constructor(containerId: string) {
    this.containerId = containerId
  }

  setClickHandler(handler: (fileType: string | null) => void): void {
    this.onFileTypeClick = handler
  }

  render(fileTypes: FileTypeStats[]): void {
    assert(fileTypes !== undefined, 'File types data is required')
    assert(Array.isArray(fileTypes), 'File types must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    
    const options = {
      chart: { 
        type: 'donut', 
        height: 350,
        background: isDark ? '#161b22' : '#ffffff',
        events: {
          dataPointSelection: (_event: any, _chartContext: any, config: any) => {
            if (this.onFileTypeClick) {
              const selectedType = config.w.config.labels[config.dataPointIndex]
              const isAlreadySelected = config.w.globals.selectedDataPoints?.[0]?.includes(config.dataPointIndex)
              this.onFileTypeClick(isAlreadySelected ? null : selectedType)
            }
          }
        }
      },
      series: fileTypes.slice(0, 8).map(ft => ft.lines),
      labels: fileTypes.slice(0, 8).map(ft => ft.type),
      colors: isDark ? 
        ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#a5a5ff', '#56d4dd', '#db6d28', '#8b949e'] :
        ['#27aeef', '#87bc45', '#ea5545', '#ef9b20', '#b33dc6', '#f46a9b', '#ede15b', '#bdcf32'],
      legend: {
        labels: { colors: isDark ? '#f0f6fc' : '#24292f' }
      },
      tooltip: { theme: isDark ? 'dark' : 'light' },
      states: {
        active: {
          filter: {
            type: 'none'
          }
        }
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true
            }
          },
          expandOnClick: false,
          customScale: 1
        }
      },
      dataLabels: {
        enabled: true
      },
      fill: {
        opacity: 1
      },
      stroke: {
        width: 2,
        colors: [isDark ? '#0d1117' : '#ffffff']
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