import type { CommitData } from '../git/parser.js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
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

export interface TimeSeriesPoint {
  date: string
  commits: number
  linesAdded: number
  linesDeleted: number
  cumulativeLines: number
  bytesAdded: number
  bytesDeleted: number
  cumulativeBytes: number
}

export function getTimeSeriesData(commits: CommitData[]): TimeSeriesPoint[] {
  if (commits.length === 0) return []
  
  const repoAgeHours = getRepoAgeInHours(commits)
  const useHourlyData = repoAgeHours < 48
  
  assert(commits.length > 0, 'Cannot create time series from empty commits array')
  const firstCommit = commits[0]!
  const firstCommitDate = new Date(firstCommit.date)
  
  const timeSeriesMap = new Map<string, TimeSeriesPoint>()
  
  const startDateKey = getStartDateKey(firstCommitDate, useHourlyData)
  
  timeSeriesMap.set(startDateKey, {
    date: startDateKey,
    commits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    cumulativeLines: 0,
    bytesAdded: 0,
    bytesDeleted: 0,
    cumulativeBytes: 0
  })
  
  let cumulativeLines = 0
  let cumulativeBytes = 0
  
  for (const commit of commits) {
    const dateKey = getDateKey(new Date(commit.date), useHourlyData)
    
    if (!timeSeriesMap.has(dateKey)) {
      timeSeriesMap.set(dateKey, {
        date: dateKey,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        cumulativeLines: 0,
        bytesAdded: 0,
        bytesDeleted: 0,
        cumulativeBytes: 0
      })
    }
    
    const existing = timeSeriesMap.get(dateKey)!
    existing.commits += 1
    existing.linesAdded += commit.linesAdded
    existing.linesDeleted += commit.linesDeleted
    existing.bytesAdded += commit.bytesAdded ?? 0
    existing.bytesDeleted += commit.bytesDeleted ?? 0
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded ?? 0) - (commit.bytesDeleted ?? 0)
    existing.cumulativeLines = cumulativeLines
    existing.cumulativeBytes = cumulativeBytes
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