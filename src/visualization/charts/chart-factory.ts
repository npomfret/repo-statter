import { CHART_DEFINITIONS, type ChartDefinition } from './chart-definitions.js'

export interface ChartInstance {
  chart: ApexCharts
  definition: ChartDefinition
  data: any
  options?: any
}

export function createChart(
  chartType: string,
  data: any,
  options?: any
): ApexCharts | null {
  const definition = CHART_DEFINITIONS[chartType]
  if (!definition) {
    console.error(`Chart type "${chartType}" not found in definitions`)
    return null
  }
  
  const container = document.getElementById(definition.elementId)
  if (!container) {
    console.error(`Container element "${definition.elementId}" not found`)
    return null
  }
  
  try {
    const series = definition.dataFormatter(data, options)
    
    // Special handling for charts with empty data
    if (chartType === 'fileHeatmap' && series[0]?.data?.length === 0) {
      const currentFileType = options?.manager?.getFileTypeFilter?.()
      if (currentFileType) {
        container.innerHTML = `
          <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: ${options?.height ?? 400}px;">
            <div class="text-center">
              <i class="bi bi-funnel fs-1 mb-3"></i>
              <p class="mb-0">No files with type "${currentFileType}" found</p>
            </div>
          </div>
        `
        return null
      }
    }
    
    // Pass manager if provided in options for charts that need it (e.g., fileTypes)
    const chartOptions = definition.optionsBuilder(series, options?.manager || options)
    
    const chart = new (window as any).ApexCharts(container, chartOptions)
    chart.render()
    
    return chart
  } catch (error) {
    console.error(`Failed to create ${chartType} chart:`, error)
    return null
  }
}