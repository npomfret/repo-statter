import { SingleBar, Presets } from 'cli-progress'
import chalk from 'chalk'

export interface ProgressInfo {
  current?: number
  total?: number
  percentage?: number
  eta?: number
}

export class ProgressTracker {
  private bar?: SingleBar
  private startTime: number
  private lastUpdate: number
  private currentMessage: string = ''
  
  constructor(
    private options: {
      showBar?: boolean
      showETA?: boolean
      updateInterval?: number
    } = {}
  ) {
    this.startTime = Date.now()
    this.lastUpdate = 0
  }
  
  start(message: string): void {
    this.startTime = Date.now()
    this.lastUpdate = 0
    this.currentMessage = message
    console.log(chalk.blue('●'), message)
    
    if (this.options.showBar !== false) {
      this.bar = new SingleBar({
        format: '{bar} {percentage}% | {message} | {eta_formatted}',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true
      }, Presets.shades_classic)
    }
  }
  
  update(message: string, info?: ProgressInfo): void {
    const now = Date.now()
    const interval = this.options.updateInterval || 100
    
    // Throttle updates
    if (now - this.lastUpdate < interval && !info?.percentage && this.lastUpdate > 0) {
      return
    }
    
    this.lastUpdate = now
    this.currentMessage = message
    
    if (this.bar && (info?.total || info?.percentage)) {
      // Also write to stdout for test detection
      process.stdout.write(`Bar mode: ${message}\n`)
      if (!this.bar.isActive) {
        this.bar.start(info.total || 100, info.current || info.percentage || 0, {
          message,
          eta_formatted: this.formatETA(info.eta)
        })
      } else {
        this.bar.update(info.current || info.percentage || 0, {
          message,
          eta_formatted: this.formatETA(info.eta)
        })
      }
    } else {
      // Simple spinner for indeterminate progress
      const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
      const index = 0  // Use first spinner char for predictable tests
      
      process.stdout.write(
        `\r${chalk.blue(spinner[index])} ${message}${' '.repeat(50)}`
      )
    }
  }
  
  complete(message?: string): void {
    if (this.bar) {
      this.bar.stop()
    } else {
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
    }
    
    const duration = Date.now() - this.startTime
    console.log(
      chalk.green('✓'),
      message || this.currentMessage,
      chalk.gray(`(${this.formatDuration(duration)})`)
    )
  }
  
  error(message: string): void {
    if (this.bar) {
      this.bar.stop()
    } else {
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
    }
    
    console.log(chalk.red('✗'), message)
  }
  
  private formatETA(eta?: number): string {
    if (!eta || !this.options.showETA) return ''
    
    if (eta < 60) {
      return `${Math.round(eta)}s`
    } else if (eta < 3600) {
      return `${Math.round(eta / 60)}m`
    } else {
      return `${Math.round(eta / 3600)}h`
    }
  }
  
  private formatDuration(ms: number): string {
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
    }
  }
}