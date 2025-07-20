import type { TopFilesData, TopFileStats } from '../data/top-files-calculator.js'
import { assert } from '../utils/errors.js'

export class TopFilesChart {
  private containerId: string
  private chart: any = null
  private currentData: TopFilesData | null = null
  private isLizardInstalled: boolean = true

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(topFilesData: TopFilesData, activeTab: 'largest' | 'churn' | 'complex' = 'largest', isLizardInstalled: boolean = true): void {
    this.isLizardInstalled = isLizardInstalled
    assert(topFilesData !== undefined, 'Top files data is required')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    this.currentData = topFilesData
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    
    // Get data based on active tab
    let data: TopFileStats[] = []
    let xAxisTitle = ''
    let color = ''
    
    switch (activeTab) {
      case 'largest':
        data = topFilesData.largest
        xAxisTitle = 'Lines of Code'
        color = isDark ? '#58a6ff' : '#27aeef' // Primary color
        break
      case 'churn':
        data = topFilesData.mostChurn
        xAxisTitle = 'Total Lines Changed'
        color = isDark ? '#3fb950' : '#87bc45' // Success color
        break
      case 'complex':
        data = topFilesData.mostComplex
        xAxisTitle = 'Complexity Score'
        color = isDark ? '#a5a5ff' : '#b33dc6' // Info color
        break
    }
    
    // If no data, show empty state or installation message
    if (data.length === 0) {
      if (activeTab === 'complex' && !this.isLizardInstalled) {
        container.innerHTML = `
          <div class="alert alert-info m-4" role="alert">
            <h5 class="alert-heading">Code Complexity Analysis Not Available</h5>
            <p>To enable code complexity analysis, please install Lizard:</p>
            <pre class="mb-3"><code>pip install lizard</code></pre>
            <hr>
            <p class="mb-0">
              <small>
                Lizard is a code complexity analyzer that supports multiple programming languages.
                Once installed, re-run the analysis to see complexity metrics for your codebase.
              </small>
            </p>
          </div>
        `
      } else if (activeTab === 'complex') {
        container.innerHTML = '<div class="text-muted text-center p-4">No complex files found</div>'
      } else {
        container.innerHTML = '<div class="text-muted text-center p-4">No data available</div>'
      }
      return
    }
    
    // Truncate file names intelligently
    const truncateFileName = (fileName: string, maxLength: number = 40): string => {
      if (fileName.length <= maxLength) return fileName
      
      const parts = fileName.split('/')
      if (parts.length === 1) {
        // No path, just truncate the file name
        return '...' + fileName.slice(-(maxLength - 3))
      }
      
      // Try to keep the file name and truncate the path
      const file = parts[parts.length - 1]
      if (!file) {
        return '...' + fileName.slice(-(maxLength - 3))
      }
      if (file.length >= maxLength - 3) {
        return '...' + file.slice(-(maxLength - 3))
      }
      
      // Keep file name and as much of the path as possible
      let result = file
      for (let i = parts.length - 2; i >= 0; i--) {
        const part = parts[i]
        if (!part) continue
        const newResult = part + '/' + result
        if (newResult.length + 3 > maxLength) {
          return '...' + result
        }
        result = newResult
      }
      
      return result
    }
    
    const options = {
      chart: { 
        type: 'bar', 
        height: 400,
        toolbar: { show: false },
        background: isDark ? '#161b22' : '#ffffff'
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          distributed: false,
          dataLabels: {
            position: 'top'
          }
        }
      },
      series: [{
        name: xAxisTitle,
        data: data.map(f => f.value)
      }],
      xaxis: {
        title: { 
          text: xAxisTitle,
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { 
          style: { colors: isDark ? '#f0f6fc' : '#24292f' },
          formatter: (value: number) => {
            return value.toLocaleString()
          }
        }
      },
      yaxis: {
        labels: { 
          show: false
        }
      },
      colors: [color],
      grid: { 
        borderColor: isDark ? '#30363d' : '#e1e4e8',
        xaxis: {
          lines: { show: true }
        },
        yaxis: {
          lines: { show: false }
        },
        padding: {
          left: 20,
          right: 20
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: {
          fontSize: '13px',
          fontWeight: 600,
          colors: [isDark ? '#f0f6fc' : '#24292f']
        },
        offsetX: 10,
        formatter: (_val: number, opts: any) => {
          const fileData = data[opts.dataPointIndex]
          if (!fileData) return ''
          return truncateFileName(fileData.fileName, 45)
        },
        dropShadow: {
          enabled: true,
          color: isDark ? '#0d1117' : '#ffffff',
          blur: 3,
          opacity: 0.8
        }
      },
      tooltip: { 
        theme: isDark ? 'dark' : 'light',
        y: {
          formatter: (value: number) => {
            return value.toLocaleString()
          }
        },
        custom: ({ dataPointIndex }: any) => {
          const file = data[dataPointIndex]
          if (!file) return '<div class="p-2">No data</div>'
          
          let content = `
            <div class="p-2">
              <div class="fw-bold">${file.fileName}</div>
              <div>${xAxisTitle}: ${file.value.toLocaleString()}`
          
          if (activeTab === 'largest') {
            content += ' loc</div>'
          } else {
            content += `</div>
              <div>Percentage: ${file.percentage.toFixed(1)}%</div>`
          }
          
          content += '</div>'
          return content
        }
      }
    }
    
    // ApexCharts will be available globally in the browser
    this.chart = new (window as any).ApexCharts(container, options)
    this.chart.render()
  }

  updateTab(activeTab: 'largest' | 'churn' | 'complex'): void {
    if (this.currentData) {
      this.render(this.currentData, activeTab, this.isLizardInstalled)
    }
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    this.currentData = null
  }
}