/**
 * Component Registry - Central registry for all visualization components
 * @module @repo-statter/visualizations/registry
 */

import { ChartComponent } from './base/ChartComponent.js'
import { GrowthChart } from './charts/GrowthChart.js'
import { FileTypesPieChart } from './charts/FileTypesPieChart.js'
import { ContributorBarChart } from './charts/ContributorBarChart.js'
import { FileActivityHeatmap } from './charts/FileActivityHeatmap.js'
import { TimeRangeSlider } from './widgets/TimeRangeSlider.js'
import { MetricCard } from './widgets/MetricCard.js'
import { ChartToggle } from './widgets/ChartToggle.js'
import { TopFilesTable } from './widgets/TopFilesTable.js'

export type ComponentType = 
  | 'growth-chart'
  | 'file-types-pie'
  | 'contributor-bar'
  | 'file-activity-heatmap'
  | 'time-slider'
  | 'metric-card'
  | 'chart-toggle'
  | 'top-files-table'

export type ComponentInstance = 
  | GrowthChart
  | FileTypesPieChart
  | ContributorBarChart
  | FileActivityHeatmap
  | TimeRangeSlider
  | MetricCard
  | ChartToggle
  | TopFilesTable

export type ComponentConstructor<T = any> = new (data: any, options?: any) => T

export interface ComponentInfo {
  name: string
  description: string
  category: 'chart' | 'widget'
  constructor: ComponentConstructor
  dataSchema?: any
  optionsSchema?: any
}

/**
 * Central registry for managing visualization components
 * Provides type-safe component lookup and factory patterns
 */
export class ComponentRegistry {
  private static components = new Map<ComponentType, ComponentInfo>([
    ['growth-chart', {
      name: 'Growth Chart',
      description: 'Line chart showing repository growth over time',
      category: 'chart',
      constructor: GrowthChart
    }],
    ['file-types-pie', {
      name: 'File Types Pie Chart',
      description: 'Pie chart showing lines of code by file type',
      category: 'chart',
      constructor: FileTypesPieChart
    }],
    ['contributor-bar', {
      name: 'Contributor Bar Chart',
      description: 'Horizontal bar chart showing contributor statistics',
      category: 'chart',
      constructor: ContributorBarChart
    }],
    ['file-activity-heatmap', {
      name: 'File Activity Heatmap',
      description: 'Treemap/heatmap showing file activity and sizes',
      category: 'chart',
      constructor: FileActivityHeatmap
    }],
    ['time-slider', {
      name: 'Time Range Slider',
      description: 'Interactive slider for filtering data by time range',
      category: 'widget',
      constructor: TimeRangeSlider
    }],
    ['metric-card', {
      name: 'Metric Card',
      description: 'Display key metrics in card format with icons and trends',
      category: 'widget',
      constructor: MetricCard
    }],
    ['chart-toggle', {
      name: 'Chart Toggle',
      description: 'Toggle between different chart views',
      category: 'widget',
      constructor: ChartToggle
    }],
    ['top-files-table', {
      name: 'Top Files Table',
      description: 'Interactive table showing top files by various metrics',
      category: 'widget',
      constructor: TopFilesTable
    }]
  ])

  /**
   * Get component constructor by type
   */
  static get(type: ComponentType): ComponentConstructor {
    const componentInfo = this.components.get(type)
    if (!componentInfo) {
      throw new Error(`Unknown component type: ${type}. Available types: ${Array.from(this.components.keys()).join(', ')}`)
    }
    return componentInfo.constructor
  }

  /**
   * Get component information by type
   */
  static getInfo(type: ComponentType): ComponentInfo {
    const componentInfo = this.components.get(type)
    if (!componentInfo) {
      throw new Error(`Unknown component type: ${type}`)
    }
    return componentInfo
  }

  /**
   * Register a new component type
   */
  static register(type: ComponentType, info: ComponentInfo): void {
    this.components.set(type, info)
  }

  /**
   * Unregister a component type
   */
  static unregister(type: ComponentType): boolean {
    return this.components.delete(type)
  }

  /**
   * Get all registered component types
   */
  static getAll(): Map<ComponentType, ComponentInfo> {
    return new Map(this.components)
  }

  /**
   * Get components by category
   */
  static getByCategory(category: 'chart' | 'widget'): Map<ComponentType, ComponentInfo> {
    const filtered = new Map<ComponentType, ComponentInfo>()
    for (const [type, info] of this.components.entries()) {
      if (info.category === category) {
        filtered.set(type, info)
      }
    }
    return filtered
  }

  /**
   * Check if a component type is registered
   */
  static has(type: ComponentType): boolean {
    return this.components.has(type)
  }

  /**
   * Create and render a component instance
   * Returns both the HTML and the component instance for further manipulation
   */
  static renderComponent(
    type: ComponentType,
    data: any,
    options?: any
  ): { html: string; component: ComponentInstance } {
    const ComponentClass = this.get(type)
    const instance = new ComponentClass(data, options) as ComponentInstance
    
    let html: string
    
    // Handle different render patterns
    if ('renderStatic' in instance && typeof instance.renderStatic === 'function') {
      // Chart components with renderStatic method
      html = instance.renderStatic()
    } else if ('render' in instance && typeof instance.render === 'function') {
      // Other components with render method
      html = (instance as any).render()
    } else {
      throw new Error(`Component ${type} does not have a render method`)
    }

    return {
      html,
      component: instance
    }
  }

  /**
   * Create a component instance without rendering
   */
  static createComponent(
    type: ComponentType,
    data: any,
    options?: any
  ): ComponentInstance {
    const ComponentClass = this.get(type)
    return new ComponentClass(data, options) as ComponentInstance
  }

  /**
   * Batch render multiple components
   */
  static renderComponents(
    components: Array<{
      type: ComponentType
      data: any
      options?: any
      id?: string
    }>
  ): Array<{
    id?: string
    type: ComponentType
    html: string
    component: ComponentInstance
  }> {
    return components.map((config, index) => {
      const { html, component } = this.renderComponent(
        config.type,
        config.data,
        config.options
      )
      
      return {
        id: config.id || `component-${index}`,
        type: config.type,
        html,
        component
      }
    })
  }

  /**
   * Get available component types
   */
  static getAvailableTypes(): ComponentType[] {
    return Array.from(this.components.keys())
  }

  /**
   * Validate component data and options (basic validation)
   */
  static validateComponent(
    type: ComponentType,
    data: any,
    options?: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.has(type)) {
      errors.push(`Unknown component type: ${type}`)
      return { valid: false, errors }
    }

    if (data === undefined || data === null) {
      errors.push('Component data is required')
    }

    // Basic validation - could be extended with JSON schema validation
    try {
      const ComponentClass = this.get(type)
      new ComponentClass(data, options)
    } catch (error) {
      errors.push(`Component validation failed: ${(error as Error).message}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get component metadata for introspection
   */
  static getMetadata(): {
    totalComponents: number
    chartComponents: number
    widgetComponents: number
    availableTypes: ComponentType[]
  } {
    const all = this.getAll()
    const charts = this.getByCategory('chart')
    const widgets = this.getByCategory('widget')

    return {
      totalComponents: all.size,
      chartComponents: charts.size,
      widgetComponents: widgets.size,
      availableTypes: this.getAvailableTypes()
    }
  }

  /**
   * Reset registry to default components (useful for testing)
   */
  static reset(): void {
    this.components.clear()
    
    // Re-register default components
    const defaultComponents: Array<[ComponentType, ComponentInfo]> = [
      ['growth-chart', {
        name: 'Growth Chart',
        description: 'Line chart showing repository growth over time',
        category: 'chart',
        constructor: GrowthChart
      }],
      ['file-types-pie', {
        name: 'File Types Pie Chart',
        description: 'Pie chart showing lines of code by file type',
        category: 'chart',
        constructor: FileTypesPieChart
      }],
      ['contributor-bar', {
        name: 'Contributor Bar Chart',
        description: 'Horizontal bar chart showing contributor statistics',
        category: 'chart',
        constructor: ContributorBarChart
      }],
      ['file-activity-heatmap', {
        name: 'File Activity Heatmap',
        description: 'Treemap/heatmap showing file activity and sizes',
        category: 'chart',
        constructor: FileActivityHeatmap
      }],
      ['time-slider', {
        name: 'Time Range Slider',
        description: 'Interactive slider for filtering data by time range',
        category: 'widget',
        constructor: TimeRangeSlider
      }],
      ['metric-card', {
        name: 'Metric Card',
        description: 'Display key metrics in card format with icons and trends',
        category: 'widget',
        constructor: MetricCard
      }],
      ['chart-toggle', {
        name: 'Chart Toggle',
        description: 'Toggle between different chart views',
        category: 'widget',
        constructor: ChartToggle
      }],
      ['top-files-table', {
        name: 'Top Files Table',
        description: 'Interactive table showing top files by various metrics',
        category: 'widget',
        constructor: TopFilesTable
      }]
    ]

    defaultComponents.forEach(([type, info]) => {
      this.components.set(type, info)
    })
  }
}

// Export convenience functions
export const {
  get: getComponent,
  getInfo: getComponentInfo,
  register: registerComponent,
  unregister: unregisterComponent,
  getAll: getAllComponents,
  getByCategory: getComponentsByCategory,
  has: hasComponent,
  renderComponent,
  createComponent,
  renderComponents,
  getAvailableTypes,
  validateComponent,
  getMetadata: getRegistryMetadata,
  reset: resetRegistry
} = ComponentRegistry