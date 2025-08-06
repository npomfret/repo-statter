/**
 * Analysis-related type definitions for repo-statter
 */

import type { CommitInfo, RepositoryInfo } from './git.js'

export interface TimeSeriesPoint {
  /** Data point timestamp */
  date: Date
  /** Numeric value at this point */
  value: number
  /** Optional metadata for this point */
  metadata?: Record<string, unknown>
  /** Commit SHA associated with this point */
  commitSha?: string
}

export interface TimeSeriesData {
  /** Series name/label */
  name: string
  /** Data points in chronological order */
  points: TimeSeriesPoint[]
  /** Series color (for visualization) */
  color?: string
  /** Series type */
  type?: 'line' | 'area' | 'bar'
}

export interface FileMetrics {
  /** File path relative to repository root */
  path: string
  /** Current line count */
  currentLines: number
  /** Total number of commits touching this file */
  totalCommits: number
  /** Total lines changed (added + deleted) */
  totalChurn: number
  /** Cyclomatic complexity if available */
  complexity?: number
  /** Last modification date */
  lastModified: Date
  /** First appearance date */
  firstAppeared: Date
  /** Set of contributors who modified this file */
  contributors: Set<string>
  /** Language/file type */
  language?: string
  /** File size in bytes */
  sizeBytes: number
}

export interface ContributorStats {
  /** Contributor name */
  name: string
  /** Primary email address */
  email: string
  /** All known email addresses */
  emails: Set<string>
  /** Total number of commits */
  commits: number
  /** Total lines added */
  additions: number
  /** Total lines deleted */
  deletions: number
  /** Files modified by this contributor */
  filesModified: Set<string>
  /** Date of first commit */
  firstCommit: Date
  /** Date of most recent commit */
  lastCommit: Date
  /** Active days (days with at least one commit) */
  activeDays: number
  /** Impact score (calculated metric) */
  impactScore?: number
}

export interface LanguageStats {
  /** Programming language name */
  language: string
  /** File extensions for this language */
  extensions: string[]
  /** Number of files */
  fileCount: number
  /** Total lines of code */
  lines: number
  /** Total bytes */
  bytes: number
  /** Percentage of codebase */
  percentage: number
  /** Color for visualization */
  color?: string
}

export interface AnalysisResult {
  /** Repository information */
  repository: RepositoryInfo
  /** Analysis timestamp */
  analyzedAt: Date
  /** Analysis configuration used */
  config: AnalysisConfig
  /** Time series data */
  timeSeries: {
    /** Commits over time */
    commits: TimeSeriesData
    /** Lines of code over time */
    linesOfCode: TimeSeriesData
    /** Number of contributors over time */
    contributors: TimeSeriesData
    /** File count over time */
    fileCount: TimeSeriesData
    /** Language-specific time series */
    languages: Map<string, TimeSeriesData>
    /** Custom metrics */
    custom?: Map<string, TimeSeriesData>
  }
  /** Current repository state */
  currentState: {
    /** Total lines of code */
    totalLines: number
    /** Total number of files */
    totalFiles: number
    /** Total repository size in bytes */
    totalBytes: number
    /** File metrics map */
    fileMetrics: Map<string, FileMetrics>
    /** Contributor statistics */
    contributors: Map<string, ContributorStats>
    /** Language distribution */
    languages: Map<string, LanguageStats>
    /** Complexity metrics if available */
    complexity?: ComplexityMetrics
  }
  /** Historical data */
  history: {
    /** All commits analyzed */
    commits: CommitInfo[]
    /** Key milestones */
    milestones?: Milestone[]
  }
}

export interface AnalysisConfig {
  /** Maximum number of commits to analyze */
  maxCommits?: number
  /** Date range for analysis */
  dateRange?: {
    from?: Date
    to?: Date
  }
  /** File patterns to include */
  includePatterns?: string[]
  /** File patterns to exclude */
  excludePatterns?: string[]
  /** Analyze file complexity */
  analyzeComplexity?: boolean
  /** Analyze file content (for word clouds, etc.) */
  analyzeContent?: boolean
  /** Time series granularity */
  granularity?: 'day' | 'week' | 'month' | 'year'
  /** Custom metrics to calculate */
  customMetrics?: CustomMetricDefinition[]
}

export interface ComplexityMetrics {
  /** Average cyclomatic complexity */
  averageComplexity: number
  /** Maximum cyclomatic complexity */
  maxComplexity: number
  /** Files with highest complexity */
  hotspots: Array<{
    path: string
    complexity: number
    lines: number
  }>
  /** Total technical debt (in hours) */
  technicalDebt?: number
}

export interface Milestone {
  /** Milestone name/label */
  name: string
  /** Date of milestone */
  date: Date
  /** Associated commit SHA */
  commitSha: string
  /** Milestone type */
  type: 'release' | 'tag' | 'custom'
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

export interface CustomMetricDefinition {
  /** Metric name */
  name: string
  /** Description of what this metric measures */
  description: string
  /** Function to calculate metric value from commit */
  calculate: (commit: CommitInfo, previousValue?: number) => number
  /** Aggregation method for time series */
  aggregate: 'sum' | 'average' | 'max' | 'min' | 'last'
  /** Initial value */
  initialValue: number
}