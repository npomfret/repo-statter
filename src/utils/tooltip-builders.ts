import type { TooltipContext } from '../types/index.js'
import type { CommitData } from '../git/parser.js'
import type { LinearSeriesPoint } from '../chart/data-transformer.js'
import { formatBytes, truncateMessage } from './formatters.js'

type CustomContentFunction = (commit: CommitData, point: LinearSeriesPoint) => string

export function createCommitTooltip(
  xAxis: 'date' | 'commit',
  filteredLinearSeries: LinearSeriesPoint[],
  commits: CommitData[],
  customContent?: CustomContentFunction
): (context: TooltipContext) => string | null {
  return function({ seriesIndex, dataPointIndex, w }: TooltipContext): string | null {
    if (xAxis === 'commit') {
      const point = filteredLinearSeries[dataPointIndex]
      if (point && point.sha !== 'start') {
        const commit = commits.find(c => c.sha === point.sha)
        if (commit) {
          let content = '<div class="custom-tooltip">' +
            '<div class="tooltip-title">Commit #' + point.commitIndex + '</div>' +
            '<div class="tooltip-content">' +
            '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
            '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
            '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
            '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>'
          
          if (customContent) {
            content += customContent(commit, point)
          }
          
          content += '</div></div>'
          return content
        }
      }
    }
    return null
  }
}

export function createUserChartTooltip(
  xAxis: 'date' | 'commit',
  userCommits: CommitData[],
  metric: 'lines' | 'bytes'
): (context: TooltipContext) => string | null {
  return function({ seriesIndex, dataPointIndex, w }: TooltipContext): string | null {
    if (xAxis === 'commit' && dataPointIndex > 0) {
      const commit = userCommits[dataPointIndex - 1] // -1 because we have a zero starting point
      if (commit) {
        let content = '<div class="custom-tooltip">' +
          '<div class="tooltip-title">Commit #' + dataPointIndex + '</div>' +
          '<div class="tooltip-content">' +
          '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
          '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
          '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>'
        
        if (metric === 'lines') {
          content += '<div><strong>Lines Added:</strong> +' + commit.linesAdded.toLocaleString() + '</div>'
          content += '<div><strong>Lines Removed:</strong> -' + commit.linesDeleted.toLocaleString() + '</div>'
        } else {
          const bytesAdded = commit.bytesAdded || commit.linesAdded * 50
          const bytesRemoved = commit.bytesDeleted || commit.linesDeleted * 50
          content += '<div><strong>Bytes Added:</strong> +' + formatBytes(bytesAdded) + '</div>'
          content += '<div><strong>Bytes Removed:</strong> -' + formatBytes(bytesRemoved) + '</div>'
        }
        
        content += '</div></div>'
        return content
      }
    }
    return null
  }
}