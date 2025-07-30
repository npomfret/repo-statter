/**
 * Simplified configuration schema focusing only on essential options
 * Reduces from 70+ options to ~15 essential ones
 */

export interface SimplifiedConfig {
  // Core analysis settings
  analysis?: {
    maxCommits?: number // null means no limit
    bytesPerLineEstimate?: number // Default: 50
    timeSeriesGranularity?: 'hourly' | 'daily' // Replaces timeSeriesHourlyThresholdHours
  }
  
  // File filtering (essential for correctness)
  exclusions?: string[] // Simplified from nested object
  
  // Performance
  performance?: {
    cacheDir?: string // Replaces cacheDirName
    progressThrottle?: number // Replaces progressThrottleMs
  }
  
  // Advanced options (only when needed)
  advanced?: {
    // File type detection
    fileTypes?: {
      custom?: Record<string, string> // Additional mappings beyond defaults
      binary?: string[] // Additional binary extensions
    }
    
    // Text processing
    textProcessing?: {
      minWordLength?: number
      stopWords?: string[] // Additional stop words beyond defaults
    }
    
    // Commit filtering
    commitFilters?: {
      excludeMerges?: boolean // Replaces merge patterns
      excludeAutomated?: boolean // Replaces automated patterns
    }
    
    // File heat map tuning
    fileHeat?: {
      recencyDays?: number // Default: 30
      weights?: { // Ensures they sum to 1.0
        frequency?: number // Default: 0.4
        recency?: number // Default: 0.6
      }
      maxFiles?: number // Default: 100
    }
  }
}

/**
 * Minimal default configuration
 * Most users won't need to override anything
 */
export const SIMPLIFIED_DEFAULTS: SimplifiedConfig = {
  analysis: {
    bytesPerLineEstimate: 50,
    timeSeriesGranularity: 'daily'
  },
  exclusions: [
    // Only the most common exclusions
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.min.js',
    '**/*.min.css',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml'
  ]
}

