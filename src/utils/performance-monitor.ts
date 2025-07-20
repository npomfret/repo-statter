/**
 * Performance monitoring utility for tracking page load metrics
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number> = new Map()

  /**
   * Mark a performance timestamp
   */
  public mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * Measure time between two marks
   */
  public measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`Performance mark '${startMark}' not found`)
      return 0
    }

    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (!end) {
      console.warn(`Performance mark '${endMark}' not found`)
      return 0
    }

    const duration = end - start
    this.measures.set(name, duration)
    return duration
  }

  /**
   * Get Web Vitals metrics
   */
  public getWebVitals(): { [key: string]: number } {
    const vitals: { [key: string]: number } = {}

    // Get navigation timing metrics
    if (performance.timing) {
      const timing = performance.timing
      vitals['domContentLoaded'] = timing.domContentLoadedEventEnd - timing.navigationStart
      vitals['loadComplete'] = timing.loadEventEnd - timing.navigationStart
      vitals['firstPaint'] = this.getFirstPaint()
      vitals['firstContentfulPaint'] = this.getFirstContentfulPaint()
    }

    // Add custom measures
    this.measures.forEach((value, key) => {
      vitals[key] = value
    })

    return vitals
  }

  /**
   * Get first paint timing
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
    return firstPaint ? firstPaint.startTime : 0
  }

  /**
   * Get first contentful paint timing
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    return fcp ? fcp.startTime : 0
  }

  /**
   * Log performance report to console
   */
  public logReport(): void {
    const vitals = this.getWebVitals()
    
    console.group('📊 Performance Report')
    console.log('Web Vitals:')
    console.log(`  First Paint: ${Math.round(vitals['firstPaint'] || 0)}ms`)
    console.log(`  First Contentful Paint: ${Math.round(vitals['firstContentfulPaint'] || 0)}ms`)
    console.log(`  DOM Content Loaded: ${Math.round(vitals['domContentLoaded'] || 0)}ms`)
    console.log(`  Page Load Complete: ${Math.round(vitals['loadComplete'] || 0)}ms`)
    
    if (this.measures.size > 0) {
      console.log('\nCustom Metrics:')
      this.measures.forEach((duration, name) => {
        console.log(`  ${name}: ${Math.round(duration)}ms`)
      })
    }
    
    console.groupEnd()
  }

  /**
   * Send performance data to analytics (placeholder)
   */
  public sendAnalytics(): void {
    const vitals = this.getWebVitals()
    
    // This is a placeholder for sending analytics
    // In a real implementation, you might send this to Google Analytics, etc.
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_performance', {
        event_category: 'Performance',
        event_label: 'Web Vitals',
        value: Math.round(vitals['firstContentfulPaint'] || 0),
        first_paint: Math.round(vitals['firstPaint'] || 0),
        first_contentful_paint: Math.round(vitals['firstContentfulPaint'] || 0),
        dom_content_loaded: Math.round(vitals['domContentLoaded'] || 0),
        load_complete: Math.round(vitals['loadComplete'] || 0)
      })
    }
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()