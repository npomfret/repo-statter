import type { CommitData } from '../git/parser.js'
import { assert } from '../utils/errors.js'
import { getFileCategory, type FileCategory } from '../utils/file-categories.js'
import type { AnalysisConfig } from '../config/schema.js'

function createEmptyBreakdown(): CategoryBreakdown {
  return {
    total: 0,
    application: 0,
    test: 0,
    build: 0,
    documentation: 0,
    other: 0
  }
}

function addToBreakdown(breakdown: CategoryBreakdown, category: FileCategory, value: number): void {
  breakdown.total += value
  breakdown[category.toLowerCase() as keyof Omit<CategoryBreakdown, 'total'>] += value
}


function getDateKey(date: Date, useHourly: boolean): string {
  if (useHourly) {
    return date.toISOString().slice(0, 13) + ':00:00'
  }
  return date.toISOString().split('T')[0]!
}

function getStartDateKey(firstCommitDate: Date, useHourly: boolean): string {
  const startDate = new Date(firstCommitDate)
  if (useHourly) {
    startDate.setHours(startDate.getHours() - 1)
  } else {
    startDate.setDate(startDate.getDate() - 1)
  }
  return getDateKey(startDate, useHourly)
}

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
  linesAdded: CategoryBreakdown
  linesDeleted: CategoryBreakdown
  cumulativeLines: CategoryBreakdown
  bytesAdded: CategoryBreakdown
  bytesDeleted: CategoryBreakdown
  cumulativeBytes: CategoryBreakdown
}

export function getTimeSeriesData(commits: CommitData[], config?: AnalysisConfig): TimeSeriesPoint[] {
  if (commits.length === 0) return []
  
  const hourlyThreshold = config?.timeSeriesHourlyThresholdHours ?? 48
  const repoAgeHours = getRepoAgeInHours(commits)
  const useHourlyData = repoAgeHours < hourlyThreshold
  
  assert(commits.length > 0, 'Cannot create time series from empty commits array')
  const firstCommit = commits[0]!
  const firstCommitDate = new Date(firstCommit.date)
  
  const timeSeriesMap = new Map<string, TimeSeriesPoint>()
  
  const startDateKey = getStartDateKey(firstCommitDate, useHourlyData)
  
  timeSeriesMap.set(startDateKey, {
    date: startDateKey,
    commits: 0,
    linesAdded: createEmptyBreakdown(),
    linesDeleted: createEmptyBreakdown(),
    cumulativeLines: createEmptyBreakdown(),
    bytesAdded: createEmptyBreakdown(),
    bytesDeleted: createEmptyBreakdown(),
    cumulativeBytes: createEmptyBreakdown()
  })
  
  let cumulativeLines = createEmptyBreakdown()
  let cumulativeBytes = createEmptyBreakdown()
  
  for (const commit of commits) {
    const dateKey = getDateKey(new Date(commit.date), useHourlyData)
    
    if (!timeSeriesMap.has(dateKey)) {
      timeSeriesMap.set(dateKey, {
        date: dateKey,
        commits: 0,
        linesAdded: createEmptyBreakdown(),
        linesDeleted: createEmptyBreakdown(),
        cumulativeLines: createEmptyBreakdown(),
        bytesAdded: createEmptyBreakdown(),
        bytesDeleted: createEmptyBreakdown(),
        cumulativeBytes: createEmptyBreakdown()
      })
    }
    
    const existing = timeSeriesMap.get(dateKey)!
    existing.commits += 1
    
    // Aggregate by file category
    for (const fileChange of commit.filesChanged) {
      const category = getFileCategory(fileChange.fileName)
      
      // For binary files, only count bytes, not lines
      if (fileChange.fileType === 'Binary') {
        addToBreakdown(existing.bytesAdded, category, fileChange.bytesAdded ?? 0)
        addToBreakdown(existing.bytesDeleted, category, fileChange.bytesDeleted ?? 0)
        addToBreakdown(cumulativeBytes, category, (fileChange.bytesAdded ?? 0) - (fileChange.bytesDeleted ?? 0))
      } else {
        // For text files, count both lines and bytes
        addToBreakdown(existing.linesAdded, category, fileChange.linesAdded)
        addToBreakdown(existing.linesDeleted, category, fileChange.linesDeleted)
        addToBreakdown(existing.bytesAdded, category, fileChange.bytesAdded ?? 0)
        addToBreakdown(existing.bytesDeleted, category, fileChange.bytesDeleted ?? 0)
        
        addToBreakdown(cumulativeLines, category, fileChange.linesAdded - fileChange.linesDeleted)
        addToBreakdown(cumulativeBytes, category, (fileChange.bytesAdded ?? 0) - (fileChange.bytesDeleted ?? 0))
      }
    }
    
    // Copy cumulative totals
    existing.cumulativeLines = { ...cumulativeLines }
    existing.cumulativeBytes = { ...cumulativeBytes }
  }
  
  return Array.from(timeSeriesMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getRepoAgeInHours(commits: CommitData[]): number {
  if (commits.length === 0) return 0
  const firstCommit = commits[0]
  const lastCommit = commits[commits.length - 1]
  if (!firstCommit || !lastCommit) return 0
  const firstDate = new Date(firstCommit.date)
  const lastDate = new Date(lastCommit.date)
  return (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60)
}