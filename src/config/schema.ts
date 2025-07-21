export interface AnalysisConfig {
  maxCommits: number | null;
  bytesPerLineEstimate: number;
  timeSeriesHourlyThresholdHours: number;
}

export interface WordCloudConfig {
  minWordLength: number;
  maxWords: number;
  minSize: number;
  maxSize: number;
}

export interface FileHeatConfig {
  recencyDecayDays: number;
  frequencyWeight: number;
  recencyWeight: number;
  maxFilesDisplayed: number;
}

export interface ChartsConfig {
  wordCloudHeight: number;
  topContributorsLimit: number;
  fileHeatmapHeight: number;
  fileHeatmapMaxFiles: number;
  topFilesChartHeight: number;
}

export interface PerformanceConfig {
  progressThrottleMs: number;
  cacheEnabled: boolean;
  cacheVersion: string;
  cacheDirName: string;
}

export interface ExclusionsConfig {
  patterns: string[];
}

export interface FileTypesConfig {
  mappings: Record<string, string>;
  binaryExtensions: string[];
}

export interface TextAnalysisConfig {
  stopWords: string[];
}

export interface FileCategoriesConfig {
  testPatterns: string[];
  categoryMappings: Record<string, 'Application' | 'Test' | 'Build' | 'Documentation' | 'Other'>;
}

export interface CommitFiltersConfig {
  mergePatterns: string[];
  automatedPatterns: string[];
}

export interface RepoStatterConfig {
  version: string;
  analysis: AnalysisConfig;
  wordCloud: WordCloudConfig;
  fileHeat: FileHeatConfig;
  charts: ChartsConfig;
  performance: PerformanceConfig;
  exclusions: ExclusionsConfig;
  fileTypes: FileTypesConfig;
  textAnalysis: TextAnalysisConfig;
  fileCategories: FileCategoriesConfig;
  commitFilters: CommitFiltersConfig;
}