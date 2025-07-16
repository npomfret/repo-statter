import type { CommitData } from '../git/parser.js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

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

export function getLinearSeriesData(commits: CommitData[]): LinearSeriesPoint[] {
  const linearSeries: LinearSeriesPoint[] = []
  
  // Add zero starting point
  if (commits.length > 0) {
    const firstCommit = commits[0]
    assert(firstCommit !== undefined, 'First commit should exist when array is not empty')
    
    linearSeries.push({
      commitIndex: 0,
      sha: 'start',
      date: firstCommit.date,
      cumulativeLines: 0,
      commits: 0,
      linesAdded: 0,
      linesDeleted: 0,
      netLines: 0,
      cumulativeBytes: 0
    })
  }
  
  let cumulativeLines = 0
  let cumulativeBytes = 0
  
  commits.forEach((commit, index) => {
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded ?? 0) - (commit.bytesDeleted ?? 0)
    
    linearSeries.push({
      commitIndex: index + 1,
      sha: commit.sha,
      date: commit.date,
      cumulativeLines,
      commits: 1,
      linesAdded: commit.linesAdded,
      linesDeleted: commit.linesDeleted,
      netLines: commit.linesAdded - commit.linesDeleted,
      cumulativeBytes
    })
  })
  
  return linearSeries
}