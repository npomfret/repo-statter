import type { FilteredData, WordCloudData } from '../types/index.js'
import type { CommitData } from '../git/parser.js'
import type { ContributorStats, FileTypeStats, FileHeatData } from '../stats/calculator.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../chart/data-transformer.js'

export class DataRecalculator {
  private static readonly STOP_WORDS = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
    'how', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 
    'its', 'let', 'put', 'say', 'she', 'too', 'use'
  ]
  
  public static recalculateData(filteredCommits: CommitData[]): FilteredData {
    return {
      commits: filteredCommits,
      contributors: this.recalculateContributors(filteredCommits),
      fileTypes: this.recalculateFileTypes(filteredCommits),
      timeSeries: this.recalculateTimeSeries(filteredCommits),
      linearSeries: this.recalculateLinearSeries(filteredCommits),
      wordCloudData: this.recalculateWordCloud(filteredCommits),
      fileHeatData: this.recalculateFileHeat(filteredCommits)
    }
  }
  
  private static recalculateContributors(commits: CommitData[]): ContributorStats[] {
    const contributorMap = new Map<string, ContributorStats>()
    
    for (const commit of commits) {
      if (!contributorMap.has(commit.authorName)) {
        contributorMap.set(commit.authorName, {
          name: commit.authorName,
          commits: 0,
          linesAdded: 0,
          linesDeleted: 0
        })
      }
      const existing = contributorMap.get(commit.authorName)!
      existing.commits += 1
      existing.linesAdded += commit.linesAdded
      existing.linesDeleted += commit.linesDeleted
    }
    
    return Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits)
  }
  
  private static recalculateFileTypes(commits: CommitData[]): FileTypeStats[] {
    const fileTypeMap = new Map<string, number>()
    
    for (const commit of commits) {
      for (const fileChange of commit.filesChanged) {
        const existing = fileTypeMap.get(fileChange.fileType) ?? 0
        fileTypeMap.set(fileChange.fileType, existing + fileChange.linesAdded)
      }
    }
    
    const total = Array.from(fileTypeMap.values()).reduce((sum, lines) => sum + lines, 0)
    
    return Array.from(fileTypeMap.entries())
      .map(([type, lines]) => ({
        type,
        lines,
        percentage: total > 0 ? (lines / total) * 100 : 0
      }))
      .sort((a, b) => b.lines - a.lines)
  }
  
  private static recalculateTimeSeries(commits: CommitData[]): TimeSeriesPoint[] {
    const timeSeriesMap = new Map<string, TimeSeriesPoint>()
    
    for (const commit of commits) {
      const dateKey = new Date(commit.date).toISOString().split('T')[0]
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
    }
    
    const sorted = Array.from(timeSeriesMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Add cumulative data
    let runningLines = 0
    let runningBytes = 0
    sorted.forEach(point => {
      runningLines += point.linesAdded
      runningBytes += point.linesAdded * 50
      point.cumulativeLines = runningLines
      point.cumulativeBytes = runningBytes
    })
    
    return sorted
  }
  
  private static recalculateLinearSeries(commits: CommitData[]): LinearSeriesPoint[] {
    return commits.map((commit, index) => ({
      commitIndex: index + 1,
      cumulativeLines: commits.slice(0, index + 1).reduce((sum, c) => sum + c.linesAdded, 0),
      cumulativeBytes: commits.slice(0, index + 1).reduce((sum, c) => sum + (c.estimatedBytes || c.linesAdded * 50), 0),
      sha: commit.sha,
      linesAdded: commit.linesAdded,
      linesDeleted: commit.linesDeleted,
      netLines: commit.linesAdded - commit.linesDeleted
    }))
  }
  
  private static recalculateWordCloud(commits: CommitData[]): WordCloudData[] {
    const messages = commits.map(c => c.message)
    const words = messages.join(' ').toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.STOP_WORDS.includes(word))
    
    const wordFreq = new Map<string, number>()
    words.forEach(word => wordFreq.set(word, (wordFreq.get(word) || 0) + 1))
    
    return Array.from(wordFreq.entries())
      .map(([text, freq]) => ({ text, size: Math.min(freq * 10 + 12, 60) }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 50)
  }
  
  private static recalculateFileHeat(commits: CommitData[]): FileHeatData[] {
    const fileMap = new Map<string, any>()
    
    for (const commit of commits) {
      const commitDate = new Date(commit.date)
      for (const fileChange of commit.filesChanged) {
        const existing = fileMap.get(fileChange.fileName)
        if (!existing) {
          fileMap.set(fileChange.fileName, {
            commitCount: 1,
            lastModified: commitDate,
            totalLines: fileChange.linesAdded,
            fileType: fileChange.fileType
          })
        } else {
          existing.commitCount += 1
          existing.totalLines += fileChange.linesAdded
          if (commitDate > existing.lastModified) {
            existing.lastModified = commitDate
          }
        }
      }
    }
    
    const now = new Date()
    const results: FileHeatData[] = []
    
    for (const [fileName, data] of fileMap.entries()) {
      const daysSinceLastModification = (now.getTime() - data.lastModified.getTime()) / (1000 * 60 * 60 * 24)
      const frequency = data.commitCount
      const recency = Math.exp(-daysSinceLastModification / 30)
      const heatScore = (frequency * 0.4) + (recency * 0.6)
      
      results.push({
        fileName,
        heatScore,
        commitCount: data.commitCount,
        lastModified: data.lastModified.toISOString(),
        totalLines: Math.max(data.totalLines, 1),
        fileType: data.fileType
      })
    }
    
    return results.sort((a, b) => b.heatScore - a.heatScore)
  }
}