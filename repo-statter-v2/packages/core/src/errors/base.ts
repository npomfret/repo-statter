/**
 * Base error classes for repo-statter
 */

export abstract class RepoStatterError extends Error {
  /** Unique error code for identification */
  abstract readonly code: string
  /** User-friendly error message */
  abstract readonly userMessage: string
  /** Original error if this wraps another error */
  public readonly originalError?: Error
  /** Additional context data */
  public readonly context?: Record<string, unknown>
  
  constructor(
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.originalError = originalError
    this.context = context
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
  
  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      stack: this.stack,
      context: this.context,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    }
  }
  
  /**
   * Check if an error is a RepoStatterError
   */
  static isRepoStatterError(error: unknown): error is RepoStatterError {
    return error instanceof RepoStatterError
  }
}

export class GitOperationError extends RepoStatterError {
  readonly code = 'GIT_OPERATION_ERROR'
  
  get userMessage(): string {
    if (this.message.includes('not a git repository')) {
      return 'This directory is not a git repository. Please run from within a git repository.'
    }
    if (this.message.includes('does not exist')) {
      return 'The specified path does not exist. Please check the path and try again.'
    }
    if (this.message.includes('permission denied')) {
      return 'Permission denied. Please check file permissions and try again.'
    }
    return `Git operation failed: ${this.message}`
  }
}

export class ConfigurationError extends RepoStatterError {
  readonly code = 'CONFIGURATION_ERROR'
  
  get userMessage(): string {
    return `Configuration error: ${this.message}. Please check your configuration file.`
  }
}

export class ValidationError extends RepoStatterError {
  readonly code = 'VALIDATION_ERROR'
  
  get userMessage(): string {
    return `Invalid input: ${this.message}`
  }
}

export class FileSystemError extends RepoStatterError {
  readonly code = 'FILESYSTEM_ERROR'
  
  get userMessage(): string {
    if (this.message.includes('ENOENT')) {
      return 'File or directory not found. Please check the path exists.'
    }
    if (this.message.includes('EACCES')) {
      return 'Permission denied. Please check you have the necessary permissions.'
    }
    if (this.message.includes('ENOSPC')) {
      return 'No space left on device. Please free up some disk space.'
    }
    return `File system error: ${this.message}`
  }
}

export class ParseError extends RepoStatterError {
  readonly code = 'PARSE_ERROR'
  
  get userMessage(): string {
    return `Failed to parse data: ${this.message}. The data may be corrupted or in an unexpected format.`
  }
}

export class CacheError extends RepoStatterError {
  readonly code = 'CACHE_ERROR'
  
  get userMessage(): string {
    if (this.message.includes('corrupted')) {
      return 'Cache appears to be corrupted. Try clearing the cache with --no-cache.'
    }
    if (this.message.includes('version mismatch')) {
      return 'Cache version mismatch. The cache will be regenerated automatically.'
    }
    return `Cache error: ${this.message}`
  }
}

export class NetworkError extends RepoStatterError {
  readonly code = 'NETWORK_ERROR'
  
  get userMessage(): string {
    if (this.message.includes('ENOTFOUND')) {
      return 'Network error: Could not resolve hostname. Please check your internet connection.'
    }
    if (this.message.includes('ETIMEDOUT')) {
      return 'Network error: Connection timed out. Please try again.'
    }
    return `Network error: ${this.message}`
  }
}

export class AnalysisError extends RepoStatterError {
  readonly code = 'ANALYSIS_ERROR'
  
  get userMessage(): string {
    return `Analysis failed: ${this.message}. This may be due to corrupted git data or an unexpected repository structure.`
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Wrap an error in the appropriate RepoStatterError subclass
   */
  static wrap(error: unknown, context?: Record<string, unknown>): RepoStatterError {
    // Already a RepoStatterError
    if (RepoStatterError.isRepoStatterError(error)) {
      return error
    }
    
    // Convert to Error object
    const err = error instanceof Error ? error : new Error(String(error))
    const message = err.message.toLowerCase()
    
    // Determine appropriate error type based on message
    if (message.includes('git') || message.includes('repository')) {
      return new GitOperationError(err.message, err, context)
    }
    if (message.includes('config') || message.includes('option')) {
      return new ConfigurationError(err.message, err, context)
    }
    if (message.includes('enoent') || message.includes('eacces') || message.includes('file')) {
      return new FileSystemError(err.message, err, context)
    }
    if (message.includes('parse') || message.includes('syntax') || message.includes('json')) {
      return new ParseError(err.message, err, context)
    }
    if (message.includes('cache')) {
      return new CacheError(err.message, err, context)
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('enotfound')) {
      return new NetworkError(err.message, err, context)
    }
    
    // Default to AnalysisError
    return new AnalysisError(err.message, err, context)
  }
  
  /**
   * Format error for display to user
   */
  static format(error: RepoStatterError): string {
    const lines: string[] = []
    
    lines.push(`❌ ${error.userMessage}`)
    
    if (error.context) {
      lines.push('\nContext:')
      for (const [key, value] of Object.entries(error.context)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`)
      }
    }
    
    if (process.env.DEBUG === 'true') {
      lines.push('\nDebug Information:')
      lines.push(`  Error Code: ${error.code}`)
      lines.push(`  Error Type: ${error.name}`)
      if (error.stack) {
        lines.push('\nStack Trace:')
        lines.push(error.stack)
      }
    }
    
    return lines.join('\n')
  }
}