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