import type { CommitData } from '../git/parser.js'
import type { LinearSeriesPoint } from './types.js'

export function getLinearSeriesData(commits: CommitData[]): LinearSeriesPoint[] {
  const linearSeries: LinearSeriesPoint[] = []
  
  let cumulativeLines = 0
  let cumulativeBytes = 0
  
  commits.forEach((commit, index) => {
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    cumulativeBytes += (commit.bytesAdded ?? 0) - (commit.bytesDeleted ?? 0)
    
    // Detect data integrity issues early
    if (cumulativeBytes < 0) {
      throw new Error(`Negative cumulativeBytes (${cumulativeBytes}) detected at commit ${index + 1} (${commit.sha}). This indicates a data integrity issue - likely incorrect byte calculations in git diff parsing.`)
    }
    
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