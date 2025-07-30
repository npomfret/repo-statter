import type { RepoStatterConfig } from './schema.js'
import type { SimplifiedConfig } from './simplified-schema.js'
import { DEFAULT_CONFIG } from './defaults.js'
import { SIMPLIFIED_DEFAULTS } from './simplified-schema.js'

/**
 * Converts simplified config to full config for backward compatibility
 */
export function expandSimplifiedConfig(simplified: SimplifiedConfig): RepoStatterConfig {
  const config = structuredClone(DEFAULT_CONFIG)
  
  // Core analysis settings
  if (simplified.analysis) {
    if (simplified.analysis.maxCommits !== undefined) {
      config.analysis.maxCommits = simplified.analysis.maxCommits || null
    }
    if (simplified.analysis.bytesPerLineEstimate !== undefined) {
      config.analysis.bytesPerLineEstimate = simplified.analysis.bytesPerLineEstimate
    }
    if (simplified.analysis.timeSeriesGranularity !== undefined) {
      config.analysis.timeSeriesHourlyThresholdHours = 
        simplified.analysis.timeSeriesGranularity === 'hourly' ? 48 : 720 // 2 days vs 30 days
    }
  }
  
  // Exclusions
  if (simplified.exclusions) {
    config.exclusions.patterns = simplified.exclusions
  }
  
  // Performance
  if (simplified.performance) {
    if (simplified.performance.cacheDir !== undefined) {
      config.performance.cacheDirName = simplified.performance.cacheDir
    }
    if (simplified.performance.progressThrottle !== undefined) {
      config.performance.progressThrottleMs = simplified.performance.progressThrottle
    }
  }
  
  // Advanced options
  if (simplified.advanced) {
    // File types
    if (simplified.advanced.fileTypes) {
      if (simplified.advanced.fileTypes.custom) {
        config.fileTypes.mappings = {
          ...config.fileTypes.mappings,
          ...simplified.advanced.fileTypes.custom
        }
      }
      if (simplified.advanced.fileTypes.binary) {
        config.fileTypes.binaryExtensions = [
          ...config.fileTypes.binaryExtensions,
          ...simplified.advanced.fileTypes.binary
        ]
      }
    }
    
    // Text processing
    if (simplified.advanced.textProcessing) {
      if (simplified.advanced.textProcessing.minWordLength !== undefined) {
        config.wordCloud.minWordLength = simplified.advanced.textProcessing.minWordLength
      }
      if (simplified.advanced.textProcessing.stopWords) {
        config.textAnalysis.stopWords = [
          ...config.textAnalysis.stopWords,
          ...simplified.advanced.textProcessing.stopWords
        ]
      }
    }
    
    // Commit filters
    if (simplified.advanced.commitFilters) {
      if (simplified.advanced.commitFilters.excludeMerges === false) {
        config.commitFilters.mergePatterns = []
      }
      if (simplified.advanced.commitFilters.excludeAutomated === false) {
        config.commitFilters.automatedPatterns = []
      }
    }
    
    // File heat
    if (simplified.advanced.fileHeat) {
      if (simplified.advanced.fileHeat.recencyDays !== undefined) {
        config.fileHeat.recencyDecayDays = simplified.advanced.fileHeat.recencyDays
      }
      if (simplified.advanced.fileHeat.weights) {
        const weights = simplified.advanced.fileHeat.weights
        if (weights.frequency !== undefined && weights.recency !== undefined) {
          config.fileHeat.frequencyWeight = weights.frequency
          config.fileHeat.recencyWeight = weights.recency
        }
      }
      if (simplified.advanced.fileHeat.maxFiles !== undefined) {
        config.fileHeat.maxFilesDisplayed = simplified.advanced.fileHeat.maxFiles
      }
    }
  }
  
  return config
}

/**
 * Extracts only the used/modified values from a full config
 * to create a minimal simplified config
 */
export function simplifyConfig(full: RepoStatterConfig): SimplifiedConfig {
  const simplified: SimplifiedConfig = {}
  
  // Only include analysis if values differ from defaults
  if (full.analysis.maxCommits !== DEFAULT_CONFIG.analysis.maxCommits ||
      full.analysis.bytesPerLineEstimate !== DEFAULT_CONFIG.analysis.bytesPerLineEstimate ||
      full.analysis.timeSeriesHourlyThresholdHours !== DEFAULT_CONFIG.analysis.timeSeriesHourlyThresholdHours) {
    simplified.analysis = {}
    
    if (full.analysis.maxCommits !== DEFAULT_CONFIG.analysis.maxCommits && full.analysis.maxCommits !== null) {
      simplified.analysis.maxCommits = full.analysis.maxCommits
    }
    if (full.analysis.bytesPerLineEstimate !== DEFAULT_CONFIG.analysis.bytesPerLineEstimate) {
      simplified.analysis.bytesPerLineEstimate = full.analysis.bytesPerLineEstimate
    }
    if (full.analysis.timeSeriesHourlyThresholdHours !== DEFAULT_CONFIG.analysis.timeSeriesHourlyThresholdHours) {
      simplified.analysis.timeSeriesGranularity = full.analysis.timeSeriesHourlyThresholdHours < 100 ? 'hourly' : 'daily'
    }
  }
  
  // Only include exclusions if they differ from defaults
  const defaultExclusions = SIMPLIFIED_DEFAULTS.exclusions || []
  if (!arraysEqual(full.exclusions.patterns, DEFAULT_CONFIG.exclusions.patterns) &&
      !arraysEqual(full.exclusions.patterns, defaultExclusions)) {
    simplified.exclusions = full.exclusions.patterns
  }
  
  // Check for performance differences
  if (full.performance.cacheDirName !== DEFAULT_CONFIG.performance.cacheDirName ||
      full.performance.progressThrottleMs !== DEFAULT_CONFIG.performance.progressThrottleMs) {
    simplified.performance = {}
    
    if (full.performance.cacheDirName !== DEFAULT_CONFIG.performance.cacheDirName) {
      simplified.performance.cacheDir = full.performance.cacheDirName
    }
    if (full.performance.progressThrottleMs !== DEFAULT_CONFIG.performance.progressThrottleMs) {
      simplified.performance.progressThrottle = full.performance.progressThrottleMs
    }
  }
  
  // Advanced options - only include if modified
  const advanced: SimplifiedConfig['advanced'] = {}
  let hasAdvanced = false
  
  // File types
  if (hasCustomFileTypes(full.fileTypes, DEFAULT_CONFIG.fileTypes)) {
    advanced.fileTypes = extractCustomFileTypes(full.fileTypes, DEFAULT_CONFIG.fileTypes)
    hasAdvanced = true
  }
  
  // Text processing
  if (full.wordCloud.minWordLength !== DEFAULT_CONFIG.wordCloud.minWordLength ||
      !arraysEqual(full.textAnalysis.stopWords, DEFAULT_CONFIG.textAnalysis.stopWords)) {
    advanced.textProcessing = {}
    
    if (full.wordCloud.minWordLength !== DEFAULT_CONFIG.wordCloud.minWordLength) {
      advanced.textProcessing.minWordLength = full.wordCloud.minWordLength
    }
    if (!arraysEqual(full.textAnalysis.stopWords, DEFAULT_CONFIG.textAnalysis.stopWords)) {
      // Only include additional stop words
      const additionalStopWords = full.textAnalysis.stopWords.filter(
        word => !DEFAULT_CONFIG.textAnalysis.stopWords.includes(word)
      )
      if (additionalStopWords.length > 0) {
        advanced.textProcessing.stopWords = additionalStopWords
      }
    }
    hasAdvanced = true
  }
  
  // Commit filters
  if (full.commitFilters.mergePatterns.length === 0 || 
      full.commitFilters.automatedPatterns.length === 0) {
    advanced.commitFilters = {}
    
    if (full.commitFilters.mergePatterns.length === 0) {
      advanced.commitFilters.excludeMerges = false
    }
    if (full.commitFilters.automatedPatterns.length === 0) {
      advanced.commitFilters.excludeAutomated = false
    }
    hasAdvanced = true
  }
  
  // File heat
  if (full.fileHeat.recencyDecayDays !== DEFAULT_CONFIG.fileHeat.recencyDecayDays ||
      full.fileHeat.frequencyWeight !== DEFAULT_CONFIG.fileHeat.frequencyWeight ||
      full.fileHeat.recencyWeight !== DEFAULT_CONFIG.fileHeat.recencyWeight ||
      full.fileHeat.maxFilesDisplayed !== DEFAULT_CONFIG.fileHeat.maxFilesDisplayed) {
    advanced.fileHeat = {}
    
    if (full.fileHeat.recencyDecayDays !== DEFAULT_CONFIG.fileHeat.recencyDecayDays) {
      advanced.fileHeat.recencyDays = full.fileHeat.recencyDecayDays
    }
    if (full.fileHeat.frequencyWeight !== DEFAULT_CONFIG.fileHeat.frequencyWeight ||
        full.fileHeat.recencyWeight !== DEFAULT_CONFIG.fileHeat.recencyWeight) {
      advanced.fileHeat.weights = {
        frequency: full.fileHeat.frequencyWeight,
        recency: full.fileHeat.recencyWeight
      }
    }
    if (full.fileHeat.maxFilesDisplayed !== DEFAULT_CONFIG.fileHeat.maxFilesDisplayed) {
      advanced.fileHeat.maxFiles = full.fileHeat.maxFilesDisplayed
    }
    hasAdvanced = true
  }
  
  if (hasAdvanced) {
    simplified.advanced = advanced
  }
  
  return simplified
}

// Helper functions
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  const setB = new Set(b)
  if (setA.size !== setB.size) return false
  for (const item of setA) {
    if (!setB.has(item)) return false
  }
  return true
}

function hasCustomFileTypes(current: any, defaults: any): boolean {
  // Check for custom mappings
  for (const ext in current.mappings) {
    if (current.mappings[ext] !== defaults.mappings[ext]) {
      return true
    }
  }
  
  // Check for custom binary extensions
  for (const ext of current.binaryExtensions) {
    if (!defaults.binaryExtensions.includes(ext)) {
      return true
    }
  }
  
  return false
}

function extractCustomFileTypes(current: any, defaults: any): any {
  const custom: any = {}
  
  // Extract custom mappings
  const customMappings: Record<string, string> = {}
  for (const ext in current.mappings) {
    if (current.mappings[ext] !== defaults.mappings[ext]) {
      customMappings[ext] = current.mappings[ext]
    }
  }
  if (Object.keys(customMappings).length > 0) {
    custom.custom = customMappings
  }
  
  // Extract custom binary extensions
  const customBinary = current.binaryExtensions.filter(
    (ext: string) => !defaults.binaryExtensions.includes(ext)
  )
  if (customBinary.length > 0) {
    custom.binary = customBinary
  }
  
  return custom
}