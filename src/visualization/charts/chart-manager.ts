import type { ChartDefinition } from './chart-definitions.js'
import { CHART_DEFINITIONS } from './chart-definitions.js'
import { createChart } from './chart-factory.js'

export interface ManagedChart {
  instance: ApexCharts
  definition: ChartDefinition
  data: any
  options?: any
}

export class ChartManager {
  private charts = new Map<string, ManagedChart>()
  private selectedFileType: string | null = null

  register(id: string, instance: ApexCharts, data: any, options?: any): void {
    const definition = CHART_DEFINITIONS[id]
    if (!definition) {
      console.error(`Chart definition not found for ${id}`)
      return
    }
    
    this.charts.set(id, { 
      instance, 
      definition,
      data,
      options
    })
  }

  get(id: string): ManagedChart | undefined {
    return this.charts.get(id)
  }

  getChart(id: string): ApexCharts | undefined {
    return this.charts.get(id)?.instance
  }

  destroy(id: string): void {
    const chart = this.charts.get(id)
    if (chart) {
      chart.instance.destroy()
      this.charts.delete(id)
      
      // Clear the container HTML in case it was replaced with a message
      const container = document.getElementById(chart.definition.elementId)
      if (container) {
        container.innerHTML = ''
      }
    }
  }

  destroyAll(): void {
    this.charts.forEach(({ instance }) => instance.destroy())
    this.charts.clear()
  }

  // Create and register a chart
  create(chartType: string, data: any, options?: any): ApexCharts | null {
    const chart = createChart(chartType, data, options)
    if (chart) {
      this.register(chartType, chart, data, options)
    }
    return chart
  }

  // File type filtering support
  setFileTypeFilter(fileType: string | null): void {
    this.selectedFileType = fileType
    this.updateChartsWithFileTypeFilter()
  }

  getFileTypeFilter(): string | null {
    return this.selectedFileType
  }

  private updateChartsWithFileTypeFilter(): void {
    // This will be implemented as we migrate charts
    // For now, just log the action
    console.log(`File type filter changed to: ${this.selectedFileType}`)
    
    // In the future, this will update relevant charts based on the filter
    // For example: growth, categoryLines, commitActivity charts
  }

  // Recreate a chart (useful for axis toggles)
  recreate(id: string, newOptions?: any): ApexCharts | null {
    const chart = this.charts.get(id)
    if (!chart) {
      // If chart doesn't exist in manager, we might still need to clear the container
      // (e.g., if it was showing a "no data" message)
      const definition = CHART_DEFINITIONS[id]
      if (definition) {
        const container = document.getElementById(definition.elementId)
        if (container) {
          container.innerHTML = ''
        }
      }
      return null
    }
    
    // Destroy old instance
    this.destroy(id)
    
    // Create new instance with merged options
    const mergedOptions = { ...chart.options, ...newOptions }
    return this.create(id, chart.data, mergedOptions)
  }
}