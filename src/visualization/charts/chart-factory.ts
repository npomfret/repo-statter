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