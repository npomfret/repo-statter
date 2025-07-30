/**
 * Legacy config loader - delegates to unified loader for backward compatibility
 * @deprecated Use unified-loader.ts instead
 */
import { 
  loadConfiguration as unifiedLoadConfiguration,
  exportConfiguration as unifiedExportConfiguration,
  type ConfigOverrides
} from './unified-loader.js';
import type { SimplifiedConfig } from './simplified-schema.js';

// Re-export ConfigOverrides for compatibility
export type { ConfigOverrides } from './unified-loader.js';

// Legacy export configuration - delegates to unified loader
export async function exportConfiguration(filePath: string, force: boolean = false): Promise<void> {
  return unifiedExportConfiguration(filePath, force);
}

// Legacy load configuration - delegates to unified loader
export function loadConfiguration(repoPath: string, overrides: ConfigOverrides = {}): SimplifiedConfig {
  return unifiedLoadConfiguration(overrides, repoPath);
}

// Legacy validation - delegates to internal validation
export function validateConfiguration(config: SimplifiedConfig): void {
  // Perform actual validation for backward compatibility
  if (config.analysis.bytesPerLineEstimate <= 0) {
    throw new Error('bytesPerLineEstimate must be positive')
  }
  
  if (config.wordCloud.minWordLength < 1) {
    throw new Error('wordCloud.minWordLength must be at least 1')
  }
  
  if (config.wordCloud.maxWords < 1) {
    throw new Error('wordCloud.maxWords must be at least 1')
  }
  
  if (Math.abs(config.fileHeat.frequencyWeight + config.fileHeat.recencyWeight - 1) > 0.01) {
    throw new Error('fileHeat weights must sum to 1.0')
  }
  
  if (config.performance.progressThrottleMs < 0) {
    throw new Error('progressThrottleMs cannot be negative')
  }
}