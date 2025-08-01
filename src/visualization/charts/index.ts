/**
 * Charts module index - new chart system exports
 */

// Export new chart system components
export { ChartManager } from './chart-manager.js'
export { CHART_DEFINITIONS } from './chart-definitions.js'
export { createChart } from './chart-factory.js'
export { setupAllChartToggles } from './chart-toggles.js'

// Export remaining functions from the original charts.ts
export { 
  renderAllCharts,
  type ChartData
} from '../charts.js'

// Temporary exports for backward compatibility - will be removed in final cleanup
export { updateGrowthChartAxis, updateCategoryChartAxis } from '../charts.js'