import { readFileSync, existsSync } from 'fs'
import { writeFile, mkdir } from 'fs/promises'
import { resolve, dirname, extname } from 'path'
import type { SimplifiedConfig } from './simplified-schema.js'
import { DEFAULT_CONFIG } from './defaults.js'
import { SIMPLIFIED_DEFAULTS } from './simplified-schema.js'

export interface ConfigOverrides {
  maxCommits?: number | null
  output?: string
  outputFile?: string
  noCache?: boolean
  clearCache?: boolean
  configPath?: string
}

/**
 * Loads configuration from file - now only supports simplified schema
 */
export function loadConfigFile(configPath: string): SimplifiedConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`)
  }
  
  let rawConfig: any
  try {
    const fileContent = readFileSync(configPath, 'utf-8')
    rawConfig = JSON.parse(fileContent)
  } catch (error: any) {
    throw new Error(`Failed to load configuration from ${configPath}: ${error.message}`)
  }
  
  // Validate it's an object
  if (typeof rawConfig !== 'object' || rawConfig === null || Array.isArray(rawConfig)) {
    throw new Error('Configuration file must contain a JSON object')
  }
  
  console.log('Loading configuration...')
  return deepMerge(DEFAULT_CONFIG, rawConfig) as SimplifiedConfig
}

/**
 * Exports configuration in simplified format
 */
export async function exportConfiguration(
  filePath: string, 
  force: boolean = false
): Promise<void> {
  // Add .json extension if not provided
  const finalPath = extname(filePath) ? filePath : `${filePath}.json`
  
  // Check if file already exists
  if (existsSync(finalPath) && !force) {
    throw new Error(`Configuration file already exists: ${finalPath}. Use --force to overwrite.`)
  }
  
  // Create directory if it doesn't exist
  const dir = dirname(finalPath)
  await mkdir(dir, { recursive: true }).catch(() => {})
  
  // Export simplified configuration
  const configJson = JSON.stringify(SIMPLIFIED_DEFAULTS, null, 2)
  await writeFile(finalPath, configJson, 'utf-8')
}

/**
 * Find config files in standard locations
 */
function findConfigFiles(repoPath?: string): string[] {
  const configPaths: string[] = []
  
  // Current working directory
  const cwdConfig = resolve(process.cwd(), 'repo-statter.config.json')
  if (existsSync(cwdConfig)) {
    configPaths.push(cwdConfig)
  }
  
  // Repository root if provided
  if (repoPath) {
    const repoConfig = resolve(repoPath, 'repo-statter.config.json')
    if (existsSync(repoConfig) && repoConfig !== cwdConfig) {
      configPaths.push(repoConfig)
    }
  }
  
  return configPaths
}

/**
 * Main configuration loader with override support
 */
export function loadConfiguration(overrides: ConfigOverrides = {}, repoPath?: string): SimplifiedConfig {
  let config: SimplifiedConfig = structuredClone(DEFAULT_CONFIG)
  
  // If custom config path is specified, use only that
  if (overrides.configPath) {
    const fileConfig = loadConfigFile(overrides.configPath)
    config = deepMerge(config, fileConfig)
  } else {
    // Apply config files in order (cwd takes precedence over repo root)
    const configFiles = findConfigFiles(repoPath)
    
    // Apply in reverse order so that cwd config (first in array) takes precedence
    for (let i = configFiles.length - 1; i >= 0; i--) {
      const configFile = configFiles[i]
      if (configFile) {
        const fileConfig = loadConfigFile(configFile)
        config = deepMerge(config, fileConfig)
      }
    }
  }
  
  // Apply CLI overrides
  if (overrides.maxCommits !== undefined) {
    config.analysis.maxCommits = overrides.maxCommits
  }
  
  if (overrides.noCache || overrides.clearCache) {
    config.performance.cacheEnabled = false
  }
  
  // Validate configuration
  validateConfiguration(config)
  
  return config
}

/**
 * Deep merge utility
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {} as any, source[key] as any)
      } else {
        result[key] = source[key] as any
      }
    }
  }
  
  return result
}

/**
 * Validates configuration
 */
function validateConfiguration(config: SimplifiedConfig): void {
  if (config.analysis.bytesPerLineEstimate <= 0) {
    throw new Error('bytesPerLineEstimate must be positive')
  }
  
  if (config.wordCloud.minWordLength < 1) {
    throw new Error('minWordLength must be at least 1')
  }
  
  if (config.wordCloud.maxWords < 1) {
    throw new Error('maxWords must be at least 1')
  }
  
  if (Math.abs(config.fileHeat.frequencyWeight + config.fileHeat.recencyWeight - 1) > 0.01) {
    throw new Error('fileHeat weights must sum to 1.0')
  }
  
  if (config.performance.progressThrottleMs < 0) {
    throw new Error('progressThrottleMs cannot be negative')
  }
}

// Export types for compatibility
export type { SimplifiedConfig }