import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThrottledProgressReporter } from './throttled-progress-reporter.js'
import type { ProgressReporter } from './progress-reporter.js'

describe('ThrottledProgressReporter', () => {
  let mockReporter: ProgressReporter
  let reportSpy: any
  
  beforeEach(() => {
    vi.useFakeTimers()
    mockReporter = {
      report: vi.fn()
    }
    reportSpy = mockReporter.report
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('should report first update immediately', () => {
    const throttled = new ThrottledProgressReporter(mockReporter, 100)
    
    throttled.report('Step 1')
    
    expect(reportSpy).toHaveBeenCalledTimes(1)
    expect(reportSpy).toHaveBeenCalledWith('Step 1', undefined, undefined)
  })
  
  it('should throttle rapid updates', () => {
    const throttled = new ThrottledProgressReporter(mockReporter, 100)
    
    throttled.report('Step 1')
    throttled.report('Step 2')
    throttled.report('Step 3')
    
    expect(reportSpy).toHaveBeenCalledTimes(1)
    expect(reportSpy).toHaveBeenCalledWith('Step 1', undefined, undefined)
  })
  
  it('should report after throttle period', () => {
    const throttled = new ThrottledProgressReporter(mockReporter, 100)
    
    throttled.report('Step 1')
    vi.advanceTimersByTime(50)
    throttled.report('Step 2')
    
    expect(reportSpy).toHaveBeenCalledTimes(1)
    
    vi.advanceTimersByTime(50)
    throttled.report('Step 3')
    
    expect(reportSpy).toHaveBeenCalledTimes(2)
    expect(reportSpy).toHaveBeenNthCalledWith(2, 'Step 3', undefined, undefined)
  })
  
  it('should always report final progress', () => {
    const throttled = new ThrottledProgressReporter(mockReporter, 100)
    
    throttled.report('Processing', 1, 100)
    throttled.report('Processing', 50, 100)
    throttled.report('Processing', 100, 100)
    
    expect(reportSpy).toHaveBeenCalledTimes(2)
    expect(reportSpy).toHaveBeenNthCalledWith(1, 'Processing', 1, 100)
    expect(reportSpy).toHaveBeenNthCalledWith(2, 'Processing', 100, 100)
  })
  
  it('should flush pending reports', () => {
    const throttled = new ThrottledProgressReporter(mockReporter, 100)
    
    throttled.report('Step 1')
    throttled.report('Step 2')
    
    expect(reportSpy).toHaveBeenCalledTimes(1)
    
    throttled.flush()
    
    expect(reportSpy).toHaveBeenCalledTimes(2)
    expect(reportSpy).toHaveBeenNthCalledWith(2, 'Step 2', undefined, undefined)
  })
  
  it('should handle mixed progress types', () => {
    const throttled = new ThrottledProgressReporter(mockReporter, 100)
    
    throttled.report('Starting')
    vi.advanceTimersByTime(101)
    throttled.report('Processing', 1, 10)
    vi.advanceTimersByTime(101)
    throttled.report('Processing', 5, 10)
    throttled.report('Processing', 10, 10) // Final should report immediately
    
    expect(reportSpy).toHaveBeenCalledTimes(4)
    expect(reportSpy).toHaveBeenNthCalledWith(1, 'Starting', undefined, undefined)
    expect(reportSpy).toHaveBeenNthCalledWith(2, 'Processing', 1, 10)
    expect(reportSpy).toHaveBeenNthCalledWith(3, 'Processing', 5, 10)
    expect(reportSpy).toHaveBeenNthCalledWith(4, 'Processing', 10, 10)
  })
})