import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ViewportObserver, createChartViewportObserver, observeElements } from './viewport-observer.js'

// Mock IntersectionObserver
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback
  private elements: Set<Element> = new Set()
  
  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    this.callback = callback
  }
  
  observe(element: Element): void {
    this.elements.add(element)
  }
  
  unobserve(element: Element): void {
    this.elements.delete(element)
  }
  
  disconnect(): void {
    this.elements.clear()
  }
  
  // Helper method to trigger intersection
  triggerIntersection(element: Element, isIntersecting: boolean): void {
    const entry = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now()
    }
    this.callback([entry as IntersectionObserverEntry], this as any)
  }
}

describe('ViewportObserver', () => {
  let originalIntersectionObserver: typeof IntersectionObserver
  
  beforeEach(() => {
    originalIntersectionObserver = global.IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver as any
  })
  
  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
  })
  
  it('should create an observer with default options', () => {
    const observer = new ViewportObserver()
    expect(observer).toBeDefined()
    expect(observer.observedCount).toBe(0)
  })
  
  it('should observe elements and call callback when intersecting', async () => {
    const observer = new ViewportObserver()
    const element = { tagName: 'DIV' } as Element
    const callback = vi.fn()
    
    observer.observe(element, callback)
    expect(observer.observedCount).toBe(1)
    expect(observer.isObserving(element)).toBe(true)
    
    // Trigger intersection
    const mockObserver = (observer as any).observer as MockIntersectionObserver
    mockObserver.triggerIntersection(element, true)
    
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(callback).toHaveBeenCalledWith(element)
    expect(observer.observedCount).toBe(0)
    expect(observer.isObserving(element)).toBe(false)
  })
  
  it('should not call callback when element is not intersecting', async () => {
    const observer = new ViewportObserver()
    const element = { tagName: 'DIV' } as Element
    const callback = vi.fn()
    
    observer.observe(element, callback)
    
    const mockObserver = (observer as any).observer as MockIntersectionObserver
    mockObserver.triggerIntersection(element, false)
    
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(callback).not.toHaveBeenCalled()
    expect(observer.isObserving(element)).toBe(true)
  })
  
  it('should not observe the same element twice', () => {
    const observer = new ViewportObserver()
    const element = { tagName: 'DIV' } as Element
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    
    observer.observe(element, callback1)
    observer.observe(element, callback2)
    
    expect(observer.observedCount).toBe(1)
  })
  
  it('should unobserve elements correctly', () => {
    const observer = new ViewportObserver()
    const element = { tagName: 'DIV' } as Element
    const callback = vi.fn()
    
    observer.observe(element, callback)
    expect(observer.isObserving(element)).toBe(true)
    
    observer.unobserve(element)
    expect(observer.isObserving(element)).toBe(false)
    expect(observer.observedCount).toBe(0)
  })
  
  it('should handle errors in callbacks gracefully', async () => {
    const observer = new ViewportObserver()
    const element = { tagName: 'DIV' } as Element
    const errorCallback = vi.fn().mockRejectedValue(new Error('Test error'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    observer.observe(element, errorCallback)
    
    const mockObserver = (observer as any).observer as MockIntersectionObserver
    mockObserver.triggerIntersection(element, true)
    
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(errorCallback).toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('Error in viewport observer callback:', expect.any(Error))
    
    consoleError.mockRestore()
  })
  
  it('should disconnect all observers', () => {
    const observer = new ViewportObserver()
    const elements = [
      { tagName: 'DIV' } as Element,
      { tagName: 'DIV' } as Element,
      { tagName: 'DIV' } as Element
    ]
    
    elements.forEach(el => observer.observe(el, vi.fn()))
    expect(observer.observedCount).toBe(3)
    
    observer.disconnect()
    expect(observer.observedCount).toBe(0)
  })
})

describe('createChartViewportObserver', () => {
  let originalIntersectionObserver: typeof IntersectionObserver
  
  beforeEach(() => {
    originalIntersectionObserver = global.IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver as any
  })
  
  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
  })
  
  it('should create observer with chart-specific defaults', () => {
    const observer = createChartViewportObserver()
    
    expect(observer).toBeDefined()
    expect(observer.observedCount).toBe(0)
  })
})

describe('observeElements', () => {
  let originalIntersectionObserver: typeof IntersectionObserver
  
  beforeEach(() => {
    originalIntersectionObserver = global.IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver as any
  })
  
  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
  })
  
  it('should observe multiple elements at once', () => {
    const elements = [
      { tagName: 'DIV' } as Element,
      { tagName: 'DIV' } as Element,
      { tagName: 'DIV' } as Element
    ]
    const callback = vi.fn()
    
    const observer = observeElements(elements, callback)
    
    expect(observer.observedCount).toBe(3)
    elements.forEach(el => {
      expect(observer.isObserving(el)).toBe(true)
    })
  })
})