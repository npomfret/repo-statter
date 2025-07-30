/**
 * Centralized type definitions for data processing
 * Consolidates types from individual transformer files
 */

// Contributor types
export interface ContributorStats {
  name: string
  commits: number
  linesAdded: number
  linesDeleted: number
}

export interface ContributorAward {
  name: string
  commits: number
  averageLinesChanged: number
}

// File types
export interface FileTypeStats {
  type: string
  lines: number
  percentage: number
}

export interface FileHeatData {
  fileName: string
  heatScore: number
  commitCount: number
  lastModified: string
  totalLines: number
  fileType: string
}

// Time series types
export interface CategoryBreakdown {
  total: number
  application: number
  test: number
  build: number
  documentation: number
  other: number
}

export interface TimeSeriesPoint {
  date: string
  commits: number
  commitShas: string[]
  linesAdded: CategoryBreakdown
  linesDeleted: CategoryBreakdown
  cumulativeLines: CategoryBreakdown
  bytesAdded: CategoryBreakdown
  bytesDeleted: CategoryBreakdown
  cumulativeBytes: CategoryBreakdown
}

// Linear series types
export interface LinearSeriesPoint {
  commitIndex: number
  sha: string
  date: string
  cumulativeLines: number
  commits: number
  linesAdded: number
  linesDeleted: number
  netLines: number
  cumulativeBytes: number
}

// Award types
export interface CommitAward {
  sha: string
  authorName: string
  date: string
  message: string
  value: number
}

// Top files types
export interface TopFileStats {
  fileName: string
  value: number
  percentage: number
}

export interface TopFilesData {
  largest: TopFileStats[]
  mostChurn: TopFileStats[]
  mostComplex: TopFileStats[]
}

// Word frequency types (from text processor)
export interface WordFrequency {
  word: string
  count: number
  size?: number
}