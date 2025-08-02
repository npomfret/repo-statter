import type { ChartDefinition } from './chart-definitions.js'
import { CHART_DEFINITIONS } from './chart-definitions.js'
import { createChart } from './chart-factory.js'

export interface ManagedChart {
  instance: ApexCharts
  definition: ChartDefinition
  data: any
  options?: any
  chartType: string
}

export class ChartManager {
  private charts = new Map<string, ManagedChart>()
  private originalChartData = new Map<string, any>() // Store original data for filter restoration
  private selectedFileType: string | null = null
  private fileTypeMap = new Map<string, string>()

  // Get all chart IDs
  getAllChartIds(): string[] {
    return Array.from(this.charts.keys())
  }

  register(id: string, instance: ApexCharts, data: any, options?: any, chartType?: string): void {
    // Use chartType if provided, otherwise fall back to id
    const definitionKey = chartType || id
    const definition = CHART_DEFINITIONS[definitionKey]
    if (!definition) {
      console.error(`Chart definition not found for ${definitionKey}`)
      return
    }
    
    this.charts.set(id, { 
      instance, 
      definition,
      data,
      options,
      chartType: definitionKey
    })
    
    // Store original data for filter restoration if not already stored
    if (!this.originalChartData.has(id)) {
      this.originalChartData.set(id, data)
    }
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
      // For dynamic charts, use the provided elementId or chartId as the key
      const registryId = options?.elementId || options?.chartId || chartType
      this.register(registryId, chart, data, options, chartType)
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

  // Build file type map from commits data
  buildFileTypeMap(commits: any[]): void {
    this.fileTypeMap.clear()
    if (!commits) return
    
    for (const commit of commits) {
      if (commit.filesChanged) {
        for (const fileChange of commit.filesChanged) {
          if (fileChange.fileName && fileChange.fileType) {
            this.fileTypeMap.set(fileChange.fileName, fileChange.fileType)
          }
        }
      }
    }
  }

  private updateChartsWithFileTypeFilter(): void {
    console.log(`File type filter changed to: ${this.selectedFileType}`)
    
    // Handle file heatmap
    const fileHeatmap = this.charts.get('fileHeatmap')
    if (fileHeatmap && fileHeatmap.data) {
      if (this.selectedFileType) {
        // Filter the data
        const filteredData = fileHeatmap.data.filter(
          (file: any) => file.fileType === this.selectedFileType
        )
        
        // Recreate chart with filtered data
        this.destroy('fileHeatmap')
        this.create('fileHeatmap', filteredData, fileHeatmap.options)
      } else {
        // Restore original data
        const originalData = this.originalChartData.get('fileHeatmap')
        if (originalData) {
          this.destroy('fileHeatmap')
          this.create('fileHeatmap', originalData, fileHeatmap.options)
        }
      }
    }
    
    // Handle top files charts
    const topFilesCharts = ['topFilesSize', 'topFilesChurn', 'topFilesComplex']
    topFilesCharts.forEach(chartId => {
      const chart = this.charts.get(chartId)
      if (chart && chart.data) {
        if (this.selectedFileType) {
          // Filter the top files data using the file type map
          const filteredData = {
            largest: chart.data.largest?.filter((f: any) => 
              this.fileTypeMap.get(f.fileName) === this.selectedFileType
            ) || [],
            mostChurn: chart.data.mostChurn?.filter((f: any) => 
              this.fileTypeMap.get(f.fileName) === this.selectedFileType
            ) || [],
            mostComplex: chart.data.mostComplex?.filter((f: any) => 
              this.fileTypeMap.get(f.fileName) === this.selectedFileType
            ) || []
          }
          
          // Recreate chart with filtered data
          this.destroy(chartId)
          this.create(chartId, filteredData, chart.options)
        } else {
          // Restore original chart with original data
          const originalData = this.originalChartData.get(chartId)
          if (originalData) {
            this.destroy(chartId)
            this.create(chartId, originalData, chart.options)
          }
        }
      }
    })
    
    // Show message for time-based charts (these cannot be filtered)
    const timeBasedCharts = ['growth', 'categoryLines', 'commitActivity']
    timeBasedCharts.forEach(chartId => {
      const chart = this.charts.get(chartId)
      if (chart) {
        const definition = CHART_DEFINITIONS[chartId]
        if (definition) {
          const container = document.getElementById(definition.elementId)
          if (container) {
            if (this.selectedFileType) {
              container.innerHTML = `
                <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: 350px;">
                  <div class="text-center">
                    <i class="bi bi-funnel fs-1 mb-3"></i>
                    <p class="mb-0">File type filter active: ${this.selectedFileType}</p>
                    <p class="small">Time-based charts show cumulative data and cannot be filtered by file type</p>
                  </div>
                </div>
              `
              this.destroy(chartId)
            } else {
              // Restore original chart
              const originalData = this.originalChartData.get(chartId)
              if (originalData && chart.options) {
                container.innerHTML = '' // Clear the filter message
                this.create(chartId, originalData, chart.options)
              }
            }
          }
        }
      }
    })
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
    // Use the stored chartType, not the id
    return this.create(chart.chartType, chart.data, mergedOptions)
  }
}