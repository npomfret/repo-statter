import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProgressTracker } from '../progress/ProgressTracker.js'

describe('ProgressTracker', () => {
  let consoleSpy: any
  let processStdoutSpy: any
  
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processStdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    consoleSpy.mockRestore()
    processStdoutSpy.mockRestore()
    vi.useRealTimers()
  })
  
  it('should start with a message', () => {
    const tracker = new ProgressTracker()
    tracker.start('Starting task')
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('●'),
      'Starting task'
    )
  })
  
  it('should update with spinner animation', () => {
    const tracker = new ProgressTracker()
    tracker.start('Starting task')
    
    // Clear initial console.log call
    consoleSpy.mockClear()
    processStdoutSpy.mockClear()
    
    tracker.update('Processing...')
    
    expect(processStdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('⠋')
    )
  })
  
  it('should complete successfully', () => {
    const tracker = new ProgressTracker()
    tracker.start('Starting task')
    
    // Simulate some time passing
    vi.advanceTimersByTime(1000)
    
    tracker.complete('Task completed')
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('✓'),
      'Task completed',
      expect.stringContaining('(1.0s)')
    )
  })
  
  it('should handle errors', () => {
    const tracker = new ProgressTracker()
    tracker.start('Starting task')
    
    tracker.error('Task failed')
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('✗'),
      'Task failed'
    )
  })
  
  it('should format duration correctly', () => {
    const tracker = new ProgressTracker()
    tracker.start('Starting task')
    
    // Test different duration formats
    vi.advanceTimersByTime(500)
    tracker.complete('Short task')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.stringContaining('(0.5s)')
    )
    
    consoleSpy.mockClear()
    const tracker2 = new ProgressTracker()
    tracker2.start('Long task')
    vi.advanceTimersByTime(65000) // 1m 5s
    tracker2.complete('Long task')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.stringContaining('1m 5s')
    )
  })
  
  it('should throttle updates', () => {
    const tracker = new ProgressTracker({ updateInterval: 100 })
    tracker.start('Starting task')
    
    processStdoutSpy.mockClear()
    
    // Rapid updates should be throttled
    tracker.update('Update 1')
    vi.advanceTimersByTime(50)
    tracker.update('Update 2')
    vi.advanceTimersByTime(50)
    tracker.update('Update 3')
    
    // Only the first update should have been processed
    expect(processStdoutSpy).toHaveBeenCalledTimes(2)  // First and third calls should pass
  })
  
  it('should handle progress with percentage', () => {
    const tracker = new ProgressTracker()
    tracker.start('Starting task')
    
    processStdoutSpy.mockClear()
    
    tracker.update('Processing...', {
      current: 50,
      total: 100,
      percentage: 50
    })
    
    // Should start a progress bar instead of spinner
    expect(processStdoutSpy).toHaveBeenCalled()
  })
})