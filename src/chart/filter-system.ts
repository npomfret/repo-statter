export interface Commit {
  sha: string;
  authorName: string;
  date: string;
  message: string;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: FileChange[];
  estimatedBytes?: number;
}

export interface FileChange {
  fileName: string;
  fileType: string;
  linesAdded: number;
  linesDeleted: number;
}

export interface Contributor {
  name: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface FileType {
  type: string;
  lines: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  date: string;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  cumulativeLines: number;
  cumulativeBytes: number;
  commitIndex?: number;
}

export interface LinearSeriesPoint {
  commitIndex: number;
  cumulativeLines: number;
  cumulativeBytes: number;
  sha?: string;
}

export interface WordCloudItem {
  text: string;
  weight: number;
}

export interface FileHeatItem {
  fileName: string;
  commitCount: number;
  lastModified: Date;
  totalLines: number;
  fileType: string;
  averageChurn?: number;
  churnScore?: number;
}

export interface FilterState {
  authorFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  fileTypeFilter: string;
}

export interface FilteredData {
  commits: Commit[];
  contributors: Contributor[];
  fileTypes: FileType[];
  timeSeries: TimeSeriesPoint[];
  linearSeries: LinearSeriesPoint[];
  wordCloudData: WordCloudItem[];
  fileHeatData: FileHeatItem[];
}

export function applyFilters(
  originalCommits: Commit[],
  filters: FilterState
): Commit[] {
  return originalCommits.filter(commit => {
    // Author filter
    if (filters.authorFilter && commit.authorName !== filters.authorFilter) return false;
    
    // Date range filter
    const commitDate = new Date(commit.date);
    if (filters.dateFromFilter && commitDate < new Date(filters.dateFromFilter)) return false;
    if (filters.dateToFilter && commitDate > new Date(filters.dateToFilter)) return false;
    
    // File type filter
    if (filters.fileTypeFilter && !commit.filesChanged.some(f => f.fileType === filters.fileTypeFilter)) return false;
    
    return true;
  });
}

export function recalculateData(filteredCommits: Commit[]): Omit<FilteredData, 'commits'> {
  // Recalculate contributors
  const contributorMap = new Map<string, Contributor>();
  for (const commit of filteredCommits) {
    if (!contributorMap.has(commit.authorName)) {
      contributorMap.set(commit.authorName, { 
        name: commit.authorName, 
        commits: 0, 
        linesAdded: 0, 
        linesDeleted: 0 
      });
    }
    const existing = contributorMap.get(commit.authorName)!;
    existing.commits += 1;
    existing.linesAdded += commit.linesAdded;
    existing.linesDeleted += commit.linesDeleted;
  }
  const contributors = Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits);
  
  // Recalculate file types
  const fileTypeMap = new Map<string, number>();
  for (const commit of filteredCommits) {
    for (const fileChange of commit.filesChanged) {
      const existing = fileTypeMap.get(fileChange.fileType) ?? 0;
      fileTypeMap.set(fileChange.fileType, existing + fileChange.linesAdded);
    }
  }
  const total = Array.from(fileTypeMap.values()).reduce((sum, lines) => sum + lines, 0);
  const fileTypes = Array.from(fileTypeMap.entries())
    .map(([type, lines]) => ({ 
      type, 
      lines, 
      percentage: total > 0 ? (lines / total) * 100 : 0 
    }))
    .sort((a, b) => b.lines - a.lines);
  
  // Recalculate time series
  const timeSeriesMap = new Map<string, TimeSeriesPoint>();
  let cumulativeLines = 0;
  let cumulativeBytes = 0;
  
  for (const commit of filteredCommits) {
    const dateKey = new Date(commit.date).toISOString().split('T')[0]!;
    if (!timeSeriesMap.has(dateKey)) {
      timeSeriesMap.set(dateKey, { 
        date: dateKey, 
        commits: 0, 
        linesAdded: 0, 
        linesDeleted: 0, 
        cumulativeLines: 0, 
        cumulativeBytes: 0 
      });
    }
    const existing = timeSeriesMap.get(dateKey)!;
    existing.commits += 1;
    existing.linesAdded += commit.linesAdded;
    existing.linesDeleted += commit.linesDeleted;
    cumulativeLines += commit.linesAdded;
    cumulativeBytes += commit.estimatedBytes || (commit.linesAdded * 50);
    existing.cumulativeLines = cumulativeLines;
    existing.cumulativeBytes = cumulativeBytes;
  }
  
  const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Add commitIndex to time series
  timeSeries.forEach((point, index) => {
    point.commitIndex = index;
  });
  
  // Recalculate linear series
  const linearSeries = filteredCommits.map((_, index) => ({
    commitIndex: index + 1,
    cumulativeLines: filteredCommits.slice(0, index + 1).reduce((sum, c) => sum + c.linesAdded, 0),
    cumulativeBytes: filteredCommits.slice(0, index + 1).reduce((sum, c) => 
      sum + (c.estimatedBytes || c.linesAdded * 50), 0
    )
  }));
  
  // Recalculate word cloud data
  const messages = filteredCommits.map(c => c.message);
  const words = messages.join(' ').toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 
      'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its', 
      'let', 'put', 'say', 'she', 'too', 'use', 'with'].includes(word));
  
  const wordFreq = new Map<string, number>();
  words.forEach(word => wordFreq.set(word, (wordFreq.get(word) || 0) + 1));
  
  const wordCloudData = Array.from(wordFreq.entries())
    .map(([text, freq]) => ({ text, weight: freq }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 200);
  
  // Recalculate file heat data
  const fileMap = new Map<string, FileHeatItem>();
  for (const commit of filteredCommits) {
    const commitDate = new Date(commit.date);
    for (const fileChange of commit.filesChanged) {
      const existing = fileMap.get(fileChange.fileName);
      if (!existing) {
        fileMap.set(fileChange.fileName, {
          fileName: fileChange.fileName,
          commitCount: 1,
          lastModified: commitDate,
          totalLines: fileChange.linesAdded - fileChange.linesDeleted,
          fileType: fileChange.fileType
        });
      } else {
        existing.commitCount += 1;
        existing.totalLines += fileChange.linesAdded - fileChange.linesDeleted;
        if (commitDate > existing.lastModified) {
          existing.lastModified = commitDate;
        }
      }
    }
  }
  
  const fileHeatData = Array.from(fileMap.values()).filter(f => f.totalLines > 0);
  fileHeatData.forEach(file => {
    file.averageChurn = file.totalLines / file.commitCount;
    file.churnScore = Math.log(file.commitCount + 1) * Math.log(file.totalLines + 1);
  });
  
  return {
    contributors,
    fileTypes,
    timeSeries,
    linearSeries,
    wordCloudData,
    fileHeatData
  };
}

export function populateAuthorFilter(commits: Commit[]): string[] {
  return [...new Set(commits.map(c => c.authorName))].sort();
}

export function populateFileTypeFilter(commits: Commit[]): string[] {
  return [...new Set(commits.flatMap(c => c.filesChanged.map(f => f.fileType)))].sort();
}

export function getDateRange(commits: Commit[]): { minDate: Date; maxDate: Date } {
  const dates = commits.map(c => new Date(c.date));
  return {
    minDate: new Date(Math.min(...dates.map(d => d.getTime()))),
    maxDate: new Date(Math.max(...dates.map(d => d.getTime())))
  };
}

export function clearFilters(): FilterState {
  return {
    authorFilter: '',
    dateFromFilter: '',
    dateToFilter: '',
    fileTypeFilter: ''
  };
}

export function getFilterStatus(filteredCommits: Commit[], originalCommits: Commit[]): string {
  return `Showing ${filteredCommits.length} of ${originalCommits.length} commits`;
}