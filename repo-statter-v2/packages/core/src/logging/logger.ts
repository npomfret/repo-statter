/**
 * Structured logging system for repo-statter
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogContext {
  /** Log timestamp */
  timestamp: Date
  /** Log level */
  level: LogLevel
  /** Logger name/namespace */
  logger: string
  /** Log message */
  message: string
  /** Additional structured data */
  data?: Record<string, unknown>
  /** Associated error */
  error?: Error
  /** Performance metrics */
  performance?: {
    duration?: number
    memory?: number
  }
}

export interface LogWriter {
  write(context: LogContext): void
}

/**
 * Console log writer - outputs to console
 */
export class ConsoleWriter implements LogWriter {
  private colors = {
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.INFO]: '\x1b[36m',  // Cyan
    [LogLevel.DEBUG]: '\x1b[90m', // Gray
    [LogLevel.TRACE]: '\x1b[37m'  // White
  }
  
  private reset = '\x1b[0m'
  
  constructor(private useColors = true) {}
  
  write(context: LogContext): void {
    const levelName = LogLevel[context.level]
    const color = this.useColors ? this.colors[context.level] : ''
    const reset = this.useColors ? this.reset : ''
    
    const timestamp = context.timestamp.toISOString()
    const prefix = `${color}[${timestamp}] [${levelName}] [${context.logger}]${reset}`
    
    // Build message parts
    const parts: string[] = [prefix, context.message]
    
    // Add structured data if present
    if (context.data && Object.keys(context.data).length > 0) {
      parts.push(JSON.stringify(context.data, null, 2))
    }
    
    // Add performance metrics if present
    if (context.performance) {
      const perf: string[] = []
      if (context.performance.duration !== undefined) {
        perf.push(`duration=${context.performance.duration}ms`)
      }
      if (context.performance.memory !== undefined) {
        perf.push(`memory=${(context.performance.memory / 1024 / 1024).toFixed(2)}MB`)
      }
      if (perf.length > 0) {
        parts.push(`[${perf.join(' ')}]`)
      }
    }
    
    // Output based on level
    if (context.level === LogLevel.ERROR) {
      console.error(parts.join(' '))
      if (context.error) {
        console.error(context.error)
      }
    } else if (context.level === LogLevel.WARN) {
      console.warn(parts.join(' '))
    } else {
      console.log(parts.join(' '))
    }
  }
}

/**
 * JSON log writer - outputs structured JSON
 */
export class JSONWriter implements LogWriter {
  write(context: LogContext): void {
    const output = {
      ...context,
      timestamp: context.timestamp.toISOString(),
      level: LogLevel[context.level],
      error: context.error ? {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack
      } : undefined
    }
    
    console.log(JSON.stringify(output))
  }
}

/**
 * File log writer - writes to file
 */
export class FileWriter implements LogWriter {
  constructor(private filePath: string) {}
  
  write(context: LogContext): void {
    // In a real implementation, this would write to a file
    // For now, we'll just use console as a placeholder
    const line = JSON.stringify({
      ...context,
      timestamp: context.timestamp.toISOString(),
      level: LogLevel[context.level]
    }) + '\n'
    
    // TODO: Implement actual file writing with proper async handling
    console.log(`[FileWriter would write to ${this.filePath}]:`, line)
  }
}

/**
 * Logger instance for a specific namespace
 */
export class Logger {
  private static globalLevel: LogLevel = LogLevel.INFO
  private static writers: LogWriter[] = [new ConsoleWriter()]
  
  constructor(
    private name: string,
    private level: LogLevel = Logger.globalLevel
  ) {}
  
  /**
   * Set global log level
   */
  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level
  }
  
  /**
   * Add a log writer
   */
  static addWriter(writer: LogWriter): void {
    Logger.writers.push(writer)
  }
  
  /**
   * Clear all writers
   */
  static clearWriters(): void {
    Logger.writers = []
  }
  
  /**
   * Create a child logger with a sub-namespace
   */
  child(name: string): Logger {
    return new Logger(`${this.name}:${name}`, this.level)
  }
  
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error)
  }
  
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data)
  }
  
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data)
  }
  
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data)
  }
  
  trace(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, data)
  }
  
  /**
   * Log with performance timing
   */
  async time<T>(
    message: string,
    fn: () => Promise<T>,
    data?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now()
    const initialMemory = process.memoryUsage().heapUsed
    
    try {
      const result = await fn()
      
      const duration = performance.now() - start
      const memoryDelta = process.memoryUsage().heapUsed - initialMemory
      
      this.log(LogLevel.INFO, `${message} completed`, data, undefined, {
        duration,
        memory: memoryDelta
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      this.log(
        LogLevel.ERROR,
        `${message} failed`,
        data,
        error instanceof Error ? error : new Error(String(error)),
        { duration }
      )
      
      throw error
    }
  }
  
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error,
    performance?: { duration?: number; memory?: number }
  ): void {
    // Check if we should log this level
    if (level > this.level) return
    
    const context: LogContext = {
      timestamp: new Date(),
      level,
      logger: this.name,
      message,
      data,
      error,
      performance
    }
    
    // Write to all configured writers
    for (const writer of Logger.writers) {
      try {
        writer.write(context)
      } catch (err) {
        // If a writer fails, log to console as fallback
        console.error('Log writer failed:', err)
      }
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(name: string, level?: LogLevel): Logger {
  return new Logger(name, level)
}

/**
 * Configure logging from environment variables
 */
export function configureLogging(): void {
  // Set log level from environment
  const envLevel = process.env.LOG_LEVEL?.toUpperCase()
  if (envLevel && envLevel in LogLevel) {
    Logger.setGlobalLevel(LogLevel[envLevel as keyof typeof LogLevel])
  }
  
  // Configure output format
  const format = process.env.LOG_FORMAT?.toLowerCase()
  if (format === 'json') {
    Logger.clearWriters()
    Logger.addWriter(new JSONWriter())
  }
  
  // Configure file output
  const logFile = process.env.LOG_FILE
  if (logFile) {
    Logger.addWriter(new FileWriter(logFile))
  }
}