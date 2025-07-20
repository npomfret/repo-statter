import type { ChartRenderers } from './chart-renderers.js'
import { performanceMonitor } from '../utils/performance-monitor.js'

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
    // High priority - time slider should load immediately as it controls other charts
    { id: 'time-slider-section', container: 'timeSliderChart', loaded: false, priority: 'high' },
    
    // Medium priority - load when near viewport
    { id: 'growth-section', container: 'growthChart', loaded: false, priority: 'medium' },
    { id: 'category-lines-section', container: 'categoryLinesChart', loaded: false, priority: 'medium' },
    { id: 'commit-activity-section', container: 'commitActivityChart', loaded: false, priority: 'medium' },
    { id: 'contributors-section', container: 'contributorsChart', loaded: false, priority: 'medium' },
    { id: 'file-types-section', container: 'fileTypesChart', loaded: false, priority: 'medium' },
    
    // Low priority - load when in viewport
    { id: 'top-files-section', container: 'topFilesChart', loaded: false, priority: 'low' },
    { id: 'file-heatmap-section', container: 'fileHeatmapChart', loaded: false, priority: 'low' },
    { id: 'word-cloud-section', container: 'wordCloudChart', loaded: false, priority: 'low' }
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
    
    // Set up accordion event listeners
    this.setupAccordionListeners()
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
    performanceMonitor.mark(`chart_${section.container}_start`)

    // Remove placeholder and render chart
    const container = document.getElementById(section.container)
    if (container) {
      // Remove placeholder styling
      container.classList.remove('chart-placeholder', 'skeleton-loader')
      container.classList.add('chart-rendered')
      
      // Clear placeholder content including loading text
      const loadingText = container.querySelector('.chart-loading-text')
      if (loadingText) {
        loadingText.remove()
      }

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
      
      performanceMonitor.mark(`chart_${section.container}_end`)
      performanceMonitor.measure(
        `chart_${section.container}_load`,
        `chart_${section.container}_start`,
        `chart_${section.container}_end`
      )
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
   * Set up listeners for accordion expand events
   */
  private setupAccordionListeners(): void {
    const accordions = document.querySelectorAll('.accordion-collapse')
    
    accordions.forEach(accordion => {
      accordion.addEventListener('shown.bs.collapse', () => {
        // Check for unloaded charts in the expanded accordion
        const charts = accordion.querySelectorAll('.chart-placeholder')
        
        charts.forEach(chartElement => {
          const section = this.chartSections.find(s => s.container === chartElement.id)
          
          if (section && !section.loaded) {
            // Check if the chart is now visible
            const rect = chartElement.getBoundingClientRect()
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0
            
            if (isVisible) {
              // Load immediately if visible
              this.loadChart(section)
            } else if (this.observer) {
              // Otherwise, observe it for when it scrolls into view
              const element = chartElement.closest('.card') || chartElement
              this.observer.observe(element)
            }
          }
        })
      })
    })
  }

  /**
   * Clean up observer when done
   */
  public destroy(): void {
    this.observer?.disconnect()
  }
}