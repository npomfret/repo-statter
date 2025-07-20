import type { ChartRenderers } from './chart-renderers.js'

interface ChartSection {
  id: string
  container: string
  loaded: boolean
  priority: 'high' | 'medium' | 'low'
}

/**
 * Viewport-based chart loader using Intersection Observer
 * Loads charts only when they come into view
 */
export class ViewportChartLoader {
  private observer?: IntersectionObserver
  private chartSections: ChartSection[] = [
    // High priority - load when near viewport
    { id: 'contributors-section', container: 'contributorsChart', loaded: false, priority: 'high' },
    { id: 'file-types-section', container: 'fileTypesChart', loaded: false, priority: 'high' },
    { id: 'growth-section', container: 'growthChart', loaded: false, priority: 'high' },
    
    // Medium priority - load when partially in viewport
    { id: 'commit-activity-section', container: 'commitActivityChart', loaded: false, priority: 'medium' },
    { id: 'category-lines-section', container: 'categoryLinesChart', loaded: false, priority: 'medium' },
    { id: 'time-slider-section', container: 'timeSliderChart', loaded: false, priority: 'medium' },
    
    // Low priority - load when fully in viewport
    { id: 'word-cloud-section', container: 'wordCloudChart', loaded: false, priority: 'low' },
    { id: 'file-heatmap-section', container: 'fileHeatmapChart', loaded: false, priority: 'low' },
    { id: 'top-files-section', container: 'topFilesChart', loaded: false, priority: 'low' }
  ]

  constructor(
    private renderers: ChartRenderers
  ) {}

  /**
   * Initialize viewport-based loading
   */
  public initialize(): void {
    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all charts immediately
      this.loadAllCharts()
      return
    }

    // Configure different thresholds based on priority
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '200px 0px', // Start loading 200px before entering viewport
      threshold: [0, 0.1, 0.5]
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handleIntersection(entry)
        }
      })
    }, observerOptions)

    // Start observing chart sections
    this.chartSections.forEach(section => {
      const element = document.getElementById(section.container)?.closest('.card') || 
                     document.getElementById(section.container)
      if (element) {
        this.observer!.observe(element)
      }
    })

    // Always load high-priority charts immediately
    this.loadHighPriorityCharts()
  }

  /**
   * Handle intersection events
   */
  private handleIntersection(entry: IntersectionObserverEntry): void {
    const section = this.chartSections.find(s => {
      const element = document.getElementById(s.container)?.closest('.card') || 
                     document.getElementById(s.container)
      return element === entry.target
    })

    if (!section || section.loaded) {
      return
    }

    // Load based on priority and intersection ratio
    const shouldLoad = 
      (section.priority === 'high' && entry.intersectionRatio > 0) ||
      (section.priority === 'medium' && entry.intersectionRatio > 0.1) ||
      (section.priority === 'low' && entry.intersectionRatio > 0.5)

    if (shouldLoad) {
      this.loadChart(section)
      // Stop observing this element
      this.observer?.unobserve(entry.target)
    }
  }

  /**
   * Load a specific chart
   */
  private loadChart(section: ChartSection): void {
    if (section.loaded) {
      return
    }

    section.loaded = true

    // Remove placeholder and render chart
    const container = document.getElementById(section.container)
    if (container) {
      // Remove placeholder styling
      container.classList.remove('chart-placeholder')
      container.classList.add('chart-rendered')
      
      // Clear placeholder content
      container.innerHTML = ''

      // Render the appropriate chart
      switch (section.container) {
        case 'contributorsChart':
          this.renderers.renderContributorsChart()
          break
        case 'fileTypesChart':
          this.renderers.renderFileTypesChart()
          break
        case 'growthChart':
          this.renderers.renderGrowthChart()
          break
        case 'commitActivityChart':
          this.renderers.renderCommitActivityChart()
          break
        case 'categoryLinesChart':
          this.renderers.renderCategoryLinesChart()
          break
        case 'timeSliderChart':
          this.renderers.renderTimeSliderChart()
          break
        case 'wordCloudChart':
          this.renderers.renderWordCloud()
          break
        case 'fileHeatmapChart':
          this.renderers.renderFileHeatmap()
          break
        case 'topFilesChart':
          this.renderers.renderTopFilesChart()
          break
      }
    }
  }

  /**
   * Load high priority charts immediately
   */
  private loadHighPriorityCharts(): void {
    this.chartSections
      .filter(section => section.priority === 'high')
      .forEach(section => this.loadChart(section))
  }

  /**
   * Fallback: Load all charts at once
   */
  private loadAllCharts(): void {
    this.renderers.renderAllCharts()
  }

  /**
   * Clean up observer when done
   */
  public destroy(): void {
    this.observer?.disconnect()
  }
}