import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConsoleProgressReporter, SilentProgressReporter } from './progress-reporter.js'

describe('ProgressReporter', () => {
  describe('ConsoleProgressReporter', () => {
    let consoleLogSpy: any
    
    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })
    
    afterEach(() => {
      consoleLogSpy.mockRestore()
    })
    
    it('should log progress without numbers', () => {
      const reporter = new ConsoleProgressReporter()
      reporter.report('Parsing commits')
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[Progress] Parsing commits')
    })
    
    it('should log progress with current and total', () => {
      const reporter = new ConsoleProgressReporter()
      reporter.report('Processing commit', 50, 100)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[50/100] Processing commit')
    })
    
    it('should handle zero values', () => {
      const reporter = new ConsoleProgressReporter()
      reporter.report('Starting', 0, 100)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[0/100] Starting')
    })
  })
  
  describe('SilentProgressReporter', () => {
    it('should not log anything', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const reporter = new SilentProgressReporter()
      
      reporter.report('Test step')
      reporter.report('Test step with numbers', 1, 10)
      
      expect(consoleLogSpy).not.toHaveBeenCalled()
      
      consoleLogSpy.mockRestore()
    })
  })
})