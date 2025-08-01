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
    
    // Validate series data before passing to ApexCharts
    if (!series) {
      console.error(`${chartType}: series is undefined or null`)
      return null
    }
    
    // Different validation for different chart types
    if (chartType === 'fileTypes') {
      // File types returns {series, labels, data}
      if (!series.series || !Array.isArray(series.series)) {
        console.error(`${chartType}: series.series is missing or not an array`)
        return null
      }
      if (!series.labels || !Array.isArray(series.labels)) {
        console.error(`${chartType}: series.labels is missing or not an array`)
        return null
      }
    } else if (chartType === 'commitActivity') {
      // Commit activity returns {series, bucketType, bucketCount}
      if (!series.series || !Array.isArray(series.series)) {
        console.error(`${chartType}: series.series is missing or not an array`)
        return null
      }
    } else if (Array.isArray(series)) {
      // For array series, check each item
      for (let i = 0; i < series.length; i++) {
        if (!series[i]) {
          console.error(`${chartType}: series[${i}] is undefined or null`)
          return null
        }
        if (series[i].data === undefined) {
          console.error(`${chartType}: series[${i}].data is undefined`)
          return null
        }
        // Extra validation for treemap data
        if (chartType === 'fileHeatmap' || chartType === 'wordCloud') {
          if (!Array.isArray(series[i].data)) {
            console.error(`${chartType}: series[${i}].data is not an array`)
            return null
          }
          // Check each data point
          for (let j = 0; j < series[i].data.length; j++) {
            const point = series[i].data[j]
            if (!point || typeof point !== 'object') {
              console.error(`${chartType}: series[${i}].data[${j}] is invalid`)
              return null
            }
            if (point.x === undefined || point.y === undefined) {
              console.error(`${chartType}: series[${i}].data[${j}] missing x or y`, point)
              return null
            }
          }
        }
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