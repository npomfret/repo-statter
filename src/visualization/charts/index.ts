/**
 * Charts module index - maintains backward compatibility
 * Re-exports all chart functions from both extracted modules and original charts.ts
 */

// Export extracted chart functions
export { renderContributorsChart } from './contributors-chart.js'
export { renderFileTypesChart } from './file-types-chart.js'

// Export remaining functions from the original charts.ts (for now)
export { 
  renderAllCharts,
  updateGrowthChartAxis,
  updateCategoryChartAxis,
  type ChartData
} from '../charts.js'