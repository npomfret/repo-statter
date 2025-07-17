export interface LinearSeriesPoint {
  commitIndex: number;
  sha?: string;
  cumulativeLines?: number;
  cumulativeBytes?: number;
}

export interface Commit {
  sha: string;
  authorName: string;
  date: string;
  message: string;
  linesAdded: number;
  linesDeleted: number;
  bytesAdded?: number;
  bytesDeleted?: number;
}

export interface TooltipOptions {
  seriesIndex?: number;
  dataPointIndex: number;
  w?: any;
}

export type CustomContentFunction = (commit: Commit, point: LinearSeriesPoint) => string;

export function truncateMessage(msg: string, maxLength: number): string {
  if (msg.length <= maxLength) return msg;
  return msg.substring(0, maxLength) + '...';
}

export function createCommitTooltip(
  xAxis: string, 
  filteredLinearSeries: LinearSeriesPoint[], 
  commits: Commit[], 
  customContent?: CustomContentFunction
): (opts: TooltipOptions) => string | null {
  return function({ dataPointIndex }: TooltipOptions): string | null {
    if (xAxis === 'commit') {
      const point = filteredLinearSeries[dataPointIndex];
      if (point && point.sha !== 'start') {
        const commit = commits.find(c => c.sha === point.sha);
        if (commit) {
          let content = '<div class="custom-tooltip">' +
            '<div class="tooltip-title">Commit #' + point.commitIndex + '</div>' +
            '<div class="tooltip-content">' +
            '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
            '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
            '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
            '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>';
          
          if (customContent) {
            content += customContent(commit, point);
          }
          
          content += '</div></div>';
          return content;
        }
      }
    }
    return null;
  };
}

export function createUserChartTooltip(
  xAxis: string, 
  userCommits: Commit[], 
  metric: string
): (opts: TooltipOptions) => string | null {
  return function({ dataPointIndex }: TooltipOptions): string | null {
    if (xAxis === 'commit' && dataPointIndex > 0) {
      const commit = userCommits[dataPointIndex - 1];
      if (commit) {
        let content = '<div class="custom-tooltip">' +
          '<div class="tooltip-title">Commit #' + dataPointIndex + '</div>' +
          '<div class="tooltip-content">' +
          '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
          '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
          '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>';
        
        if (metric === 'lines') {
          content += '<div><strong>Lines Added:</strong> +' + commit.linesAdded.toLocaleString() + '</div>';
          content += '<div><strong>Lines Removed:</strong> -' + commit.linesDeleted.toLocaleString() + '</div>';
        } else {
          const bytesAdded = commit.bytesAdded || commit.linesAdded * 50;
          const bytesRemoved = commit.bytesDeleted || commit.linesDeleted * 50;
          const formatBytes = (bytes: number): string => {
            if (bytes >= 1000000000) {
              return (bytes / 1000000000).toFixed(2) + ' GB';
            } else if (bytes >= 1000000) {
              return (bytes / 1000000).toFixed(2) + ' MB';
            } else if (bytes >= 1000) {
              return (bytes / 1000).toFixed(2) + ' KB';
            } else {
              return bytes.toFixed(0) + ' bytes';
            }
          };
          content += '<div><strong>Bytes Added:</strong> +' + formatBytes(bytesAdded) + '</div>';
          content += '<div><strong>Bytes Removed:</strong> -' + formatBytes(bytesRemoved) + '</div>';
        }
        
        content += '</div></div>';
        return content;
      }
    }
    return null;
  };
}