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
  private originalChartData = new Map<string, any>()
  private selectedFileType: string | null = null
  private fileTypeMap = new Map<string, string>()

  // Get all chart IDs
  getAllChartIds(): string[] {
    return Array.from(this.charts.keys())
  }

  register(id: string, instance: ApexCharts, data: any, options?: any, chartType?: string): void {
    console.log(`📋 Registering chart ${id} with data:`, data);
    console.log(`📋 Data length/size for ${id}:`, Array.isArray(data) ? data.length : typeof data === 'object' ? Object.keys(data).length : 'not array/object');
    if (typeof data === 'object' && data !== null) {
      console.log(`📋 Data keys for ${id}:`, Object.keys(data));
      if (data.largest) console.log(`📋 ${id} largest length:`, data.largest.length);
      if (data.mostChurn) console.log(`📋 ${id} mostChurn length:`, data.mostChurn.length);
      if (data.mostComplex) console.log(`📋 ${id} mostComplex length:`, data.mostComplex.length);
    }
    
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
      console.log(`💾 Storing original data for ${id}`);
      this.originalChartData.set(id, data)
    } else {
      console.log(`⚠️ Original data for ${id} already exists, not overwriting`);
    }
  }

  get(id: string): ManagedChart | undefined {
    return this.charts.get(id)
  }

  getChart(id: string): ApexCharts | undefined {
    return this.charts.get(id)?.instance
  }

  destroy(id: string, preserveOriginalData: boolean = false): void {
    const chart = this.charts.get(id)
    if (chart) {
      console.log(`🗑️ Destroying chart ${id}, preserveOriginalData:`, preserveOriginalData);
      chart.instance.destroy()
      this.charts.delete(id)
      
      // Only delete original data if not preserving (e.g., during filtering)
      if (!preserveOriginalData) {
        this.originalChartData.delete(id)
        console.log(`🗑️ Original data for ${id} deleted`);
      } else {
        console.log(`💾 Original data for ${id} preserved`);
      }
      
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
    this.originalChartData.clear()
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
    console.log('🎯 ChartManager.setFileTypeFilter() called with fileType:', fileType);
    console.log('🎯 Previous selectedFileType:', this.selectedFileType);
    this.selectedFileType = fileType
    console.log('🎯 New selectedFileType:', this.selectedFileType);
    console.log('🎯 About to call updateChartsWithFileTypeFilter()');
    this.updateChartsWithFileTypeFilter()
  }

  getFileTypeFilter(): string | null {
    return this.selectedFileType
  }

  // Build file type map from commits data
  buildFileTypeMap(commits: any[]): void {
    console.log('📊 Building file type map from', commits?.length || 0, 'commits');
    this.fileTypeMap.clear()
    if (!commits) return
    
    let fileCount = 0;
    for (const commit of commits) {
      if (commit.filesChanged) {
        for (const fileChange of commit.filesChanged) {
          if (fileChange.fileName && fileChange.fileType) {
            this.fileTypeMap.set(fileChange.fileName, fileChange.fileType)
            fileCount++;
          }
        }
      }
    }
    console.log('📊 Built file type map with', this.fileTypeMap.size, 'unique files from', fileCount, 'file changes');
    console.log('📊 Sample file type mappings:', Array.from(this.fileTypeMap.entries()).slice(0, 10));
  }

  private updateChartsWithFileTypeFilter(): void {
    console.log('📊 ChartManager.updateChartsWithFileTypeFilter() called');
    console.log('📊 Current selectedFileType:', this.selectedFileType);
    console.log('📊 Registered charts:', Array.from(this.charts.keys()));
    
    // Handle file heatmap
    const fileHeatmap = this.charts.get('fileHeatmap')
    console.log('📊 Processing fileHeatmap:', !!fileHeatmap, 'has data:', !!fileHeatmap?.data);
    if (fileHeatmap && fileHeatmap.data) {
      console.log('📊 Original fileHeatmap data length:', fileHeatmap.data.length);
      console.log('📊 Sample fileHeatmap data:', fileHeatmap.data.slice(0, 3));
      if (this.selectedFileType) {
        // Filter the data
        const filteredData = fileHeatmap.data.filter(
          (file: any) => {
            console.log('📊 Checking file:', file.fileName, 'fileType:', file.fileType, 'vs selectedFileType:', this.selectedFileType);
            return file.fileType === this.selectedFileType;
          }
        )
        console.log('📊 Filtered fileHeatmap data length:', filteredData.length);
        console.log('📊 Filtered fileHeatmap data:', filteredData.slice(0, 3));
        
        // Recreate chart with filtered data (preserve original data)
        this.destroy('fileHeatmap', true)
        this.create('fileHeatmap', filteredData, fileHeatmap.options)
      } else {
        // Restore original data
        const originalData = this.originalChartData.get('fileHeatmap')
        if (originalData) {
          console.log('📊 Restoring original fileHeatmap data length:', originalData.length);
          this.destroy('fileHeatmap', true)
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
          console.log(`📊 Processing ${chartId} with selectedFileType:`, this.selectedFileType);
          console.log(`📊 Original ${chartId} data:`, {
            largest: chart.data.largest?.length || 0,
            mostChurn: chart.data.mostChurn?.length || 0,
            mostComplex: chart.data.mostComplex?.length || 0
          });
          console.log(`📊 FileTypeMap size:`, this.fileTypeMap.size);
          console.log(`📊 Sample fileTypeMap entries:`, Array.from(this.fileTypeMap.entries()).slice(0, 5));
          
          // Filter the top files data using the file type map
          const filteredData = {
            largest: chart.data.largest?.filter((f: any) => {
              const fileType = this.fileTypeMap.get(f.fileName);
              console.log(`📊 Checking ${f.fileName}: mapped type=${fileType}, selected=${this.selectedFileType}`);
              return fileType === this.selectedFileType;
            }) || [],
            mostChurn: chart.data.mostChurn?.filter((f: any) => 
              this.fileTypeMap.get(f.fileName) === this.selectedFileType
            ) || [],
            mostComplex: chart.data.mostComplex?.filter((f: any) => 
              this.fileTypeMap.get(f.fileName) === this.selectedFileType
            ) || []
          }
          
          console.log(`📊 Filtered ${chartId} data:`, {
            largest: filteredData.largest.length,
            mostChurn: filteredData.mostChurn.length,
            mostComplex: filteredData.mostComplex.length
          });
          
          // Recreate chart with filtered data (preserve original data)
          this.destroy(chartId, true)
          this.create(chartId, filteredData, chart.options)
        } else {
          // Restore original chart with original data
          const originalData = this.originalChartData.get(chartId)
          if (originalData) {
            this.destroy(chartId, true)
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
              this.destroy(chartId, true)
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
    
    // Destroy old instance (preserve original data)
    this.destroy(id, true)
    
    // Create new instance with merged options
    const mergedOptions = { ...chart.options, ...newOptions }
    // Use the stored chartType, not the id
    return this.create(chart.chartType, chart.data, mergedOptions)
  }
}