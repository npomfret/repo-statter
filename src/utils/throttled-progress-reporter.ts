import type { ProgressReporter } from './progress-reporter.js'

export class ThrottledProgressReporter implements ProgressReporter {
  private lastReportTime = 0
  private throttleMs: number
  private delegate: ProgressReporter
  private pendingReport: { step: string; current?: number | undefined; total?: number | undefined } | null = null
  
  constructor(delegate: ProgressReporter, throttleMs = 100) {
    this.delegate = delegate
    this.throttleMs = throttleMs
  }
  
  report(step: string, current?: number, total?: number): void {
    const now = Date.now()
    const timeSinceLastReport = now - this.lastReportTime
    
    // Always report if it's been longer than the throttle period
    if (timeSinceLastReport >= this.throttleMs) {
      this.delegate.report(step, current, total)
      this.lastReportTime = now
      this.pendingReport = null
    } else {
      // Store the report to potentially emit later
      this.pendingReport = { step, current, total }
      
      // For progress with totals, always report the final item
      if (current !== undefined && total !== undefined && current === total) {
        this.delegate.report(step, current, total)
        this.lastReportTime = now
        this.pendingReport = null
      }
    }
  }
  
  // Ensure any pending report is flushed
  flush(): void {
    if (this.pendingReport) {
      this.delegate.report(
        this.pendingReport.step, 
        this.pendingReport.current, 
        this.pendingReport.total
      )
      this.pendingReport = null
      this.lastReportTime = Date.now()
    }
  }
}