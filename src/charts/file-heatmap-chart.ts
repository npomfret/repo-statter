import type { FileHeatData } from '../data/file-calculator.js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export class FileHeatmapChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(fileHeatData: FileHeatData[]): void {
    assert(fileHeatData !== undefined, 'File heat data is required')
    assert(Array.isArray(fileHeatData), 'File heat data must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Transform data for ApexCharts treemap
    const data = fileHeatData.slice(0, 100).map(file => ({
      x: file.fileName.split('/').pop() || file.fileName,
      y: file.totalLines
    }))
    
    // Color scale based on heat score
    const maxHeatScore = Math.max(...fileHeatData.slice(0, 100).map(f => f.heatScore))
    const colors = fileHeatData.slice(0, 100).map(file => {
      const intensity = file.heatScore / maxHeatScore
      if (isDark) {
        // Dark theme - from dark blue to bright red
        const r = Math.floor(70 + intensity * 185)
        const g = Math.floor(70 - intensity * 50)
        const b = Math.floor(150 - intensity * 100)
        return `rgb(${r}, ${g}, ${b})`
      } else {
        // Light theme - from light blue to deep red
        const r = Math.floor(100 + intensity * 155)
        const g = Math.floor(150 - intensity * 100)
        const b = Math.floor(255 - intensity * 155)
        return `rgb(${r}, ${g}, ${b})`
      }
    })
    
    const options = {
      series: [{
        data: data
      }],
      chart: {
        type: 'treemap',
        height: 400,
        toolbar: { show: false },
        background: isDark ? '#161b22' : '#ffffff'
      },
      colors: colors,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          colors: [isDark ? '#f0f6fc' : '#24292f']
        },
        formatter: function(text: string, op: any) {
          const index = op.dataPointIndex
          const file = fileHeatData[index]
          if (file && op.value > 100) {
            return [text, `${op.value} lines`]
          }
          return text
        }
      },
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false
        }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        custom: ({ dataPointIndex }: any) => {
          const file = fileHeatData[dataPointIndex]
          if (file) {
            const lastModified = new Date(file.lastModified).toLocaleDateString()
            return `<div class="custom-tooltip">
              <div><strong>File:</strong> ${file.fileName}</div>
              <div><strong>Lines:</strong> ${file.totalLines.toLocaleString()}</div>
              <div><strong>Commits:</strong> ${file.commitCount}</div>
              <div><strong>Last Modified:</strong> ${lastModified}</div>
              <div><strong>Type:</strong> ${file.fileType}</div>
              <div><strong>Heat Score:</strong> ${file.heatScore.toFixed(2)}</div>
            </div>`
          }
          return ''
        }
      },
      legend: { show: false }
    }
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
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