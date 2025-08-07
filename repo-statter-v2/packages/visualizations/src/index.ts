// Main exports for @repo-statter/visualizations package

// Base components
export { ChartComponent } from './base/ChartComponent.js'
export type { 
  ChartData, 
  ChartOptions, 
  ChartAccessibilityOptions,
  RenderOptions 
} from './base/ChartComponent.js'

// Charts
export * from './charts/index.js'
export { GrowthChart } from './charts/GrowthChart.js'
export type { GrowthChartData } from './charts/GrowthChart.js'
export { FileTypesPieChart } from './charts/FileTypesPieChart.js'
export type { FileTypeData } from './charts/FileTypesPieChart.js'
export { ContributorBarChart } from './charts/ContributorBarChart.js'
export type { ContributorBarData, ContributorData, ContributorBarOptions } from './charts/ContributorBarChart.js'
export { FileActivityHeatmap } from './charts/FileActivityHeatmap.js'
export type { FileActivityHeatmapData, FileActivityData, FileActivityHeatmapOptions } from './charts/FileActivityHeatmap.js'

// Widgets
export * from './widgets/index.js'

// Components
export * from './components/index.js'

// Registry
export { ComponentRegistry } from './registry.js'
export type { 
  ComponentType, 
  ComponentInstance, 
  ComponentConstructor, 
  ComponentInfo 
} from './registry.js'
export {
  getComponent,
  getComponentInfo,
  registerComponent,
  unregisterComponent,
  getAllComponents,
  getComponentsByCategory,
  hasComponent,
  renderComponent,
  createComponent,
  renderComponents,
  getAvailableTypes,
  validateComponent,
  getRegistryMetadata,
  resetRegistry
} from './registry.js'

// Types and utilities
export * from './types/index.js'
export * from './utils/index.js'

// Data transformers for Phase 3 integration
export {
  transformToGrowthChart,
  transformToCustomGrowthChart,
  transformToFileTypesPie,
  transformToContributorBarChart,
  transformToFileActivityHeatmap,
  transformToTopFilesTable,
  transformToMetricCards,
  transformToTimeRange,
  transformToLanguageTimeSeries,
  filterAnalysisByDateRange,
  calculatePercentageChange,
  formatTrendData,
  transformAllVisualizationData
} from './utils/dataTransformers.js'