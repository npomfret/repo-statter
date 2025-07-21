import { readFileSync, existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname, extname } from 'path';
import type { RepoStatterConfig } from './schema.js';
import { DEFAULT_CONFIG } from './defaults.js';

export interface ConfigOverrides {
  maxCommits?: number | null;
  output?: string;
  outputFile?: string;
  noCache?: boolean;
  clearCache?: boolean;
  configPath?: string;
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {} as any, source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }
  
  return result;
}

export async function exportConfiguration(filePath: string, force: boolean = false): Promise<void> {
  // Add .json extension if not provided
  const finalPath = extname(filePath) ? filePath : `${filePath}.json`;
  
  // Check if file already exists
  if (existsSync(finalPath) && !force) {
    throw new Error(`Configuration file already exists: ${finalPath}. Use --force to overwrite.`);
  }
  
  // Create directory if it doesn't exist
  const dir = dirname(finalPath);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
  
  // Export configuration as pretty JSON
  const configJson = JSON.stringify(DEFAULT_CONFIG, null, 2);
  
  try {
    await writeFile(finalPath, configJson, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write configuration file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadConfigFile(configPath: string): Partial<RepoStatterConfig> | null {
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Configuration file must contain a JSON object');
    }
    
    return parsed;
  } catch (error) {
    throw new Error(`Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function findConfigFiles(repoPath: string): string[] {
  const configPaths: string[] = [];
  
  // Current working directory
  const cwdConfig = resolve(process.cwd(), 'repo-statter.config.json');
  if (existsSync(cwdConfig)) {
    configPaths.push(cwdConfig);
  }
  
  // Repository root
  const repoConfig = resolve(repoPath, 'repo-statter.config.json');
  if (existsSync(repoConfig) && repoConfig !== cwdConfig) {
    configPaths.push(repoConfig);
  }
  
  return configPaths;
}

export function loadConfiguration(repoPath: string, overrides: ConfigOverrides = {}): RepoStatterConfig {
  let config = { ...DEFAULT_CONFIG };
  
  // Start with defaults
  let mergedConfig = config;
  
  // If custom config path is specified, use only that
  if (overrides.configPath) {
    const customConfig = loadConfigFile(overrides.configPath);
    if (customConfig) {
      mergedConfig = deepMerge(mergedConfig, customConfig);
    }
  } else {
    // Apply config files in order (cwd takes precedence over repo root)
    const configFiles = findConfigFiles(repoPath);
    
    // Apply in reverse order so that cwd config (first in array) takes precedence
    for (let i = configFiles.length - 1; i >= 0; i--) {
      const configFile = configFiles[i];
      if (configFile) {
        const fileConfig = loadConfigFile(configFile);
        if (fileConfig) {
          mergedConfig = deepMerge(mergedConfig, fileConfig);
        }
      }
    }
  }
  
  // Apply simple CLI overrides
  if (overrides.maxCommits !== undefined) {
    mergedConfig.analysis.maxCommits = overrides.maxCommits;
  }
  
  if (overrides.noCache || overrides.clearCache) {
    mergedConfig.performance.cacheEnabled = false;
  }
  
  return mergedConfig;
}

export function validateConfiguration(config: RepoStatterConfig): void {
  if (config.analysis.bytesPerLineEstimate <= 0) {
    throw new Error('bytesPerLineEstimate must be positive');
  }
  
  if (config.wordCloud.minWordLength < 1) {
    throw new Error('wordCloud.minWordLength must be at least 1');
  }
  
  if (config.wordCloud.maxWords < 1) {
    throw new Error('wordCloud.maxWords must be at least 1');
  }
  
  if (config.fileHeat.frequencyWeight + config.fileHeat.recencyWeight !== 1) {
    throw new Error('fileHeat.frequencyWeight + fileHeat.recencyWeight must equal 1');
  }
  
  if (config.performance.progressThrottleMs < 0) {
    throw new Error('performance.progressThrottleMs must be non-negative');
  }
}