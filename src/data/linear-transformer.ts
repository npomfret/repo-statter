import type { CommitData } from '../git/parser.js'
import type { LinearSeriesPoint } from './types.js'

export function getLinearSeriesData(commits: CommitData[], baselineBytes: number = 0, baselineLines: number = 0): LinearSeriesPoint[] {
  const linearSeries: LinearSeriesPoint[] = []
  
  let cumulativeLines = baselineLines
  let cumulativeBytes = baselineBytes
  
  commits.forEach((commit, index) => {
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded ?? 0) - (commit.bytesDeleted ?? 0)
    
    // Ensure cumulative values don't go negative (though this should be rare now)
    cumulativeLines = Math.max(0, cumulativeLines)
    cumulativeBytes = Math.max(0, cumulativeBytes)
    
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