import type { PageScriptData } from './page-script.js'
import { performanceMonitor } from '../utils/performance-monitor.js'

/**
 * Lazy loader for chart functionality
 * This module dynamically imports chart modules only when needed
 */
export class ChartLoader {
  private chartModulesLoaded = false
  private chartModulesPromise?: Promise<void>

  constructor(private data: PageScriptData) {}

  /**
   * Load chart modules and initialize charts
   * This method ensures chart modules are only loaded once
   */
  public async loadAndInitializeCharts(): Promise<void> {
    if (this.chartModulesLoaded) {
      return
    }

    if (this.chartModulesPromise) {
      return this.chartModulesPromise
    }

    this.chartModulesPromise = this.loadChartModules()
    await this.chartModulesPromise
    this.chartModulesLoaded = true
  }

  private async loadChartModules(): Promise<void> {
    try {
      performanceMonitor.mark('chartLoadStart')
      
      // Dynamic imports for code splitting
      const [
        { ChartRenderers },
        { EventHandlers },
        { ChartInitializer }
      ] = await Promise.all([
        import('./chart-renderers.js'),
        import('./event-handlers.js'),
        import('./chart-initializer.js')
      ])

      performanceMonitor.mark('chartModulesLoaded')
      performanceMonitor.measure('chartModuleLoading', 'chartLoadStart', 'chartModulesLoaded')

      // Initialize chart components
      const renderers = new ChartRenderers(this.data)
      const eventHandlers = new EventHandlers(this.data, renderers)
      const chartInitializer = new ChartInitializer(this.data, renderers, eventHandlers)

      // Initialize charts
      chartInitializer.initialize()
      
      performanceMonitor.mark('chartsInitialized')
      performanceMonitor.measure('chartInitialization', 'chartModulesLoaded', 'chartsInitialized')
      performanceMonitor.measure('totalChartLoadTime', 'chartLoadStart', 'chartsInitialized')
    } catch (error) {
      console.error('Failed to load chart modules:', error)
      this.showChartLoadError()
    }
  }

  private showChartLoadError(): void {
    // Show error message in all chart containers
    const chartContainers = [
      'contributorsChart', 'fileTypesChart', 'growthChart',
      'categoryLinesChart', 'commitActivityChart', 'wordCloudChart',
      'fileHeatmapChart', 'topFilesChart', 'timeSliderChart'
    ]
    
    chartContainers.forEach(containerId => {
      const container = document.getElementById(containerId)
      if (container) {
        container.innerHTML = `
          <div class="d-flex align-items-center justify-content-center h-100 text-muted">
            <div class="text-center">
              <i class="bi bi-exclamation-triangle fs-3 mb-2"></i>
              <p class="mb-0">Failed to load chart modules</p>
              <small>Please refresh the page to try again</small>
            </div>
          </div>
        `
      }
    })
  }
}