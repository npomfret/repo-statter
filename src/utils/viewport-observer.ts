/**
 * Viewport observer utility for lazy loading chart elements
 * Uses Intersection Observer API to detect when elements enter the viewport
 */

export interface ViewportObserverOptions {
  /**
   * Root margin for the observer (default: '50px')
   * Positive values will trigger loading before the element is visible
   */
  rootMargin?: string
  
  /**
   * Threshold for intersection (default: 0)
   * 0 means as soon as one pixel is visible
   */
  threshold?: number | number[]
  
  /**
   * Root element for the observer (default: null - viewport)
   */
  root?: Element | null
}

export type ViewportCallback = (element: Element) => void | Promise<void>

export class ViewportObserver {
  private observer: IntersectionObserver
  private callbacks: Map<Element, ViewportCallback>
  private observedElements: Set<Element>
  
  constructor(options: ViewportObserverOptions = {}) {
    const {
      rootMargin = '50px',
      threshold = 0,
      root = null
    } = options
    
    this.callbacks = new Map()
    this.observedElements = new Set()
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handleIntersection(entry.target)
        }
      })
    }, {
      root,
      rootMargin,
      threshold
    })
  }
  
  /**
   * Observe an element and call the callback when it enters the viewport
   */
  public observe(element: Element, callback: ViewportCallback): void {
    if (this.observedElements.has(element)) {
      return
    }
    
    this.callbacks.set(element, callback)
    this.observedElements.add(element)
    this.observer.observe(element)
  }
  
  /**
   * Stop observing an element
   */
  public unobserve(element: Element): void {
    if (!this.observedElements.has(element)) {
      return
    }
    
    this.observer.unobserve(element)
    this.callbacks.delete(element)
    this.observedElements.delete(element)
  }
  
  /**
   * Stop observing all elements and disconnect the observer
   */
  public disconnect(): void {
    this.observer.disconnect()
    this.callbacks.clear()
    this.observedElements.clear()
  }
  
  /**
   * Check if an element is being observed
   */
  public isObserving(element: Element): boolean {
    return this.observedElements.has(element)
  }
  
  /**
   * Get the number of elements being observed
   */
  public get observedCount(): number {
    return this.observedElements.size
  }
  
  private async handleIntersection(element: Element): Promise<void> {
    const callback = this.callbacks.get(element)
    if (!callback) {
      return
    }
    
    // Unobserve the element immediately to prevent multiple calls
    this.unobserve(element)
    
    try {
      await callback(element)
    } catch (error) {
      console.error('Error in viewport observer callback:', error)
    }
  }
}

/**
 * Factory function to create a viewport observer for chart lazy loading
 */
export function createChartViewportObserver(
  options?: ViewportObserverOptions
): ViewportObserver {
  return new ViewportObserver({
    rootMargin: '100px', // Start loading 100px before visible
    threshold: 0.01, // 1% of the element must be visible
    ...options
  })
}

/**
 * Utility to observe multiple elements at once
 */
export function observeElements(
  elements: Element[],
  callback: ViewportCallback,
  options?: ViewportObserverOptions
): ViewportObserver {
  const observer = new ViewportObserver(options)
  
  elements.forEach(element => {
    observer.observe(element, callback)
  })
  
  return observer
}