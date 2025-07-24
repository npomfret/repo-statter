import type { FileHeatData } from '../data/file-calculator.js'
import { assert } from '../utils/errors.js'

export class FileHeatmapChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(fileHeatData: FileHeatData[], height: number = 400, maxFiles: number = 100): void {
    assert(fileHeatData !== undefined, 'File heat data is required')
    assert(Array.isArray(fileHeatData), 'File heat data must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    
    // Transform data for ApexCharts treemap
    const data = fileHeatData.slice(0, maxFiles).map(file => ({
      x: file.fileName.split('/').pop() || file.fileName,
      y: file.totalLines
    }))
    
    // Color scale based on heat score
    const maxHeatScore = Math.max(...fileHeatData.slice(0, maxFiles).map(f => f.heatScore))
    const colors = fileHeatData.slice(0, maxFiles).map(file => {
      const intensity = file.heatScore / maxHeatScore
      // Light theme - from light blue to deep red
      const r = Math.floor(100 + intensity * 155)
      const g = Math.floor(150 - intensity * 100)
      const b = Math.floor(255 - intensity * 155)
      return `rgb(${r}, ${g}, ${b})`
    })
    
    const options = {
      series: [{
        data: data
      }],
      chart: {
        type: 'treemap',
        height: height,
        toolbar: { show: false },
        background: '#ffffff'
      },
      colors: colors,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          colors: ['#24292f']
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
        theme: 'light',
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