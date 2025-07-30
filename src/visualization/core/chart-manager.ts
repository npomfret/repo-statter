import type { ChartData } from '../charts.js'

/**
 * Simple chart manager that coordinates with the existing consolidated charts system
 * This provides a clean interface to the monolithic charts.ts file
 */
export class ChartManager {
  private isInitialized = false

  /**
   * Initialize all charts with the provided data
   * Delegates to the existing consolidated renderAllCharts function
   */
  public renderAllCharts(data: ChartData): void {
    if (typeof window === 'undefined') {
      throw new Error('ChartManager can only be used in browser environment')
    }

    // The actual chart rendering is handled by the bundled charts script
    // This manager just provides a clean interface
    const renderFunction = (window as any).renderAllCharts
    if (typeof renderFunction !== 'function') {
      throw new Error('Charts bundle not loaded. Ensure the charts script is loaded before calling renderAllCharts.')
    }

    try {
      renderFunction(data)
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to render charts:', error)
      throw error
    }
  }

  /**
   * Update category chart axis mode
   */
  public updateCategoryChartAxis(mode: 'date' | 'commit'): void {
    const updateFunction = (window as any).updateCategoryChartAxis  
    if (typeof updateFunction === 'function') {
      updateFunction(mode)
    }
  }

  /**
   * Check if charts have been initialized
   */
  public get initialized(): boolean {
    return this.isInitialized
  }
}