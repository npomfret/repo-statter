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
  
  let cumulativeLines = 0
  let cumulativeBytes = 0
  
  commits.forEach((commit, index) => {
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded ?? 0) - (commit.bytesDeleted ?? 0)
    
    linearSeries.push({
      commitIndex: index,
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