import type { CommitData } from '../git/parser.js'

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

export interface LinearSeriesPoint {
  commitIndex: number
  sha: string
  date: string
  cumulativeLines: number
  commits: number
  linesAdded: number
  linesDeleted: number
  cumulativeBytes: number
}

export function getTimeSeriesData(commits: CommitData[]): TimeSeriesPoint[] {
  if (commits.length === 0) return []
  
  // First, determine if we need hourly granularity
  const repoAgeHours = getRepoAgeInHours(commits)
  const useHourlyData = repoAgeHours < 48 // Use hourly data for repos less than 2 days old
  
  // Add a starting point just before the first commit
  const firstCommit = commits[0]
  if (!firstCommit) return []
  const firstCommitDate = new Date(firstCommit.date)
  const startDate = new Date(firstCommitDate)
  if (useHourlyData) {
    startDate.setHours(startDate.getHours() - 1) // One hour before
  } else {
    startDate.setDate(startDate.getDate() - 1) // One day before
  }
  
  const timeSeriesMap = new Map<string, TimeSeriesPoint>()
  
  // Add the zero starting point
  const startDateKey = useHourlyData 
    ? startDate.toISOString().slice(0, 13) + ':00:00'
    : startDate.toISOString().split('T')[0]!
  
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
    // For short time frames, include hours in the grouping
    const dateKey = useHourlyData 
      ? new Date(commit.date).toISOString().slice(0, 13) + ':00:00' // Group by hour
      : new Date(commit.date).toISOString().split('T')[0]! // Group by day
    
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
    existing.bytesAdded += commit.bytesAdded || 0
    existing.bytesDeleted += commit.bytesDeleted || 0
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded || 0) - (commit.bytesDeleted || 0)
    existing.cumulativeLines = cumulativeLines
    existing.cumulativeBytes = cumulativeBytes
  }
  
  return Array.from(timeSeriesMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getLinearSeriesData(commits: CommitData[]): LinearSeriesPoint[] {
  const linearSeries: LinearSeriesPoint[] = []
  
  // Add zero starting point
  if (commits.length > 0) {
    const firstCommit = commits[0]
    if (firstCommit) {
      linearSeries.push({
        commitIndex: 0,
        sha: 'start',
        date: firstCommit.date,
        cumulativeLines: 0,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        cumulativeBytes: 0
      })
    }
  }
  
  let cumulativeLines = 0
  let cumulativeBytes = 0
  
  commits.forEach((commit, index) => {
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded || 0) - (commit.bytesDeleted || 0)
    
    linearSeries.push({
      commitIndex: index + 1,
      sha: commit.sha,
      date: commit.date,
      cumulativeLines,
      commits: 1,
      linesAdded: commit.linesAdded,
      linesDeleted: commit.linesDeleted,
      cumulativeBytes
    })
  })
  
  return linearSeries
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