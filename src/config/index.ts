/**
 * Re-export from unified loader for backward compatibility
 */
export { 
  loadConfiguration,
  exportConfiguration,
  type ConfigOverrides
} from './unified-loader.js'

export { 
  DEFAULT_CONFIG 
} from './defaults.js'

export type { 
  RepoStatterConfig,
  AnalysisConfig,
  WordCloudConfig,
  FileHeatConfig,
  ChartsConfig,
  PerformanceConfig,
  ExclusionsConfig,
  FileTypesConfig,
  TextAnalysisConfig,
  FileCategoriesConfig,
  CommitFiltersConfig
} from './schema.js'

export type {
  SimplifiedConfig
} from './simplified-schema.js'

// Re-export validation for backward compatibility
export { loadConfiguration as validateConfiguration } from './unified-loader.js'