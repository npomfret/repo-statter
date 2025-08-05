# Phase 3: Analysis Engine

## Overview
Build the analysis engine that transforms raw git data into meaningful insights. This includes time-series analysis, current state analysis, and all the metrics calculations needed for visualization.

## Goals
1. Create time-series data builders
2. Implement current state analyzers
3. Build contributor statistics
4. Calculate file metrics and rankings
5. Generate word clouds and awards

## Tasks

### 3.1 Time Series Data Builder

#### Description
Build time-series data from the stream of commits for various metrics.

#### packages/core/src/analysis/TimeSeriesBuilder.ts
```typescript
import { CommitInfo } from '../types/git'
import { TimeSeriesPoint } from '../types/analysis'
import { Logger } from '../logging/logger'

export interface TimeSeriesOptions {
  interval?: 'day' | 'week' | 'month'
  fillGaps?: boolean
}

export class TimeSeriesBuilder {
  private logger = new Logger('TimeSeriesBuilder')
  
  // Track cumulative values
  private cumulativeLines = 0
  private cumulativeSize = 0
  private fileLineCount = new Map<string, number>()
  private fileTypeLines = new Map<string, number>()
  private contributorFirstSeen = new Map<string, Date>()
  
  buildCommitTimeSeries(
    commits: CommitInfo[],
    options: TimeSeriesOptions = {}
  ): TimeSeriesPoint[] {
    const interval = options.interval || 'day'
    const grouped = this.groupByInterval(commits, interval)
    
    const series: TimeSeriesPoint[] = []
    
    for (const [date, dayCommits] of grouped) {
      series.push({
        date,
        value: dayCommits.length,
        metadata: {
          commits: dayCommits.map(c => c.sha)
        }
      })
    }
    
    if (options.fillGaps) {
      return this.fillTimeGaps(series, interval)
    }
    
    return series
  }
  
  buildLinesOfCodeTimeSeries(
    commits: CommitInfo[],
    options: TimeSeriesOptions = {}
  ): TimeSeriesPoint[] {
    const series: TimeSeriesPoint[] = []
    
    // Process commits chronologically
    const sortedCommits = [...commits].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
    
    for (const commit of sortedCommits) {
      // Update file line counts
      for (const file of commit.stats.files) {
        const currentLines = this.fileLineCount.get(file.path) || 0
        
        if (file.status === 'deleted') {
          this.fileLineCount.delete(file.path)
          this.cumulativeLines -= currentLines
        } else if (file.status === 'renamed' && file.oldPath) {
          const oldLines = this.fileLineCount.get(file.oldPath) || 0
          this.fileLineCount.delete(file.oldPath)
          this.fileLineCount.set(file.path, oldLines + file.additions - file.deletions)
          this.cumulativeLines += file.additions - file.deletions
        } else {
          const newLines = currentLines + file.additions - file.deletions
          this.fileLineCount.set(file.path, Math.max(0, newLines))
          this.cumulativeLines += file.additions - file.deletions
        }
      }
      
      series.push({
        date: commit.timestamp,
        value: Math.max(0, this.cumulativeLines),
        metadata: {
          commit: commit.sha,
          fileCount: this.fileLineCount.size
        }
      })
    }
    
    return series
  }
  
  buildRepositorySizeTimeSeries(
    commits: CommitInfo[],
    options: TimeSeriesOptions = {}
  ): TimeSeriesPoint[] {
    const series: TimeSeriesPoint[] = []
    const avgBytesPerLine = 30 // Rough estimate
    
    const sortedCommits = [...commits].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
    
    for (const commit of sortedCommits) {
      this.cumulativeSize += (commit.stats.additions - commit.stats.deletions) * avgBytesPerLine
      
      series.push({
        date: commit.timestamp,
        value: Math.max(0, this.cumulativeSize),
        metadata: {
          commit: commit.sha
        }
      })
    }
    
    return series
  }
  
  buildContributorTimeSeries(
    commits: CommitInfo[],
    options: TimeSeriesOptions = {}
  ): TimeSeriesPoint[] {
    const series: TimeSeriesPoint[] = []
    const seenContributors = new Set<string>()
    
    const sortedCommits = [...commits].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
    
    for (const commit of sortedCommits) {
      const contributorKey = `${commit.author}:${commit.email}`
      
      if (!seenContributors.has(contributorKey)) {
        seenContributors.add(contributorKey)
        this.contributorFirstSeen.set(contributorKey, commit.timestamp)
      }
      
      series.push({
        date: commit.timestamp,
        value: seenContributors.size,
        metadata: {
          newContributor: !this.contributorFirstSeen.has(contributorKey)
        }
      })
    }
    
    return series
  }
  
  buildFileTypeTimeSeries(
    commits: CommitInfo[],
    fileTypeMap: Map<string, string>
  ): Map<string, TimeSeriesPoint[]> {
    const typeSeriesMap = new Map<string, TimeSeriesPoint[]>()
    const typeLines = new Map<string, number>()
    
    const sortedCommits = [...commits].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )
    
    for (const commit of sortedCommits) {
      // Update line counts by type
      for (const file of commit.stats.files) {
        const fileType = fileTypeMap.get(file.path) || 'Other'
        const currentTypeLines = typeLines.get(fileType) || 0
        
        if (file.status === 'deleted') {
          const fileLines = this.fileLineCount.get(file.path) || 0
          typeLines.set(fileType, Math.max(0, currentTypeLines - fileLines))
        } else {
          const delta = file.additions - file.deletions
          typeLines.set(fileType, Math.max(0, currentTypeLines + delta))
        }
      }
      
      // Create time series point for each type
      for (const [type, lines] of typeLines) {
        if (!typeSeriesMap.has(type)) {
          typeSeriesMap.set(type, [])
        }
        
        typeSeriesMap.get(type)!.push({
          date: commit.timestamp,
          value: lines,
          metadata: { commit: commit.sha }
        })
      }
    }
    
    return typeSeriesMap
  }
  
  private groupByInterval(
    commits: CommitInfo[],
    interval: 'day' | 'week' | 'month'
  ): Map<Date, CommitInfo[]> {
    const grouped = new Map<Date, CommitInfo[]>()
    
    for (const commit of commits) {
      const key = this.getIntervalKey(commit.timestamp, interval)
      
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      
      grouped.get(key)!.push(commit)
    }
    
    return grouped
  }
  
  private getIntervalKey(date: Date, interval: 'day' | 'week' | 'month'): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    
    switch (interval) {
      case 'week':
        const day = d.getDay()
        d.setDate(d.getDate() - day)
        break
      case 'month':
        d.setDate(1)
        break
    }
    
    return d
  }
  
  private fillTimeGaps(
    series: TimeSeriesPoint[],
    interval: 'day' | 'week' | 'month'
  ): TimeSeriesPoint[] {
    if (series.length < 2) return series
    
    const filled: TimeSeriesPoint[] = []
    const intervalMs = this.getIntervalMs(interval)
    
    series.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    for (let i = 0; i < series.length - 1; i++) {
      filled.push(series[i])
      
      const current = series[i].date.getTime()
      const next = series[i + 1].date.getTime()
      
      // Fill gaps
      for (let time = current + intervalMs; time < next; time += intervalMs) {
        filled.push({
          date: new Date(time),
          value: 0,
          metadata: { filled: true }
        })
      }
    }
    
    filled.push(series[series.length - 1])
    return filled
  }
  
  private getIntervalMs(interval: 'day' | 'week' | 'month'): number {
    switch (interval) {
      case 'day': return 24 * 60 * 60 * 1000
      case 'week': return 7 * 24 * 60 * 60 * 1000
      case 'month': return 30 * 24 * 60 * 60 * 1000 // Approximate
    }
  }
}
```

#### Testing
```typescript
describe('TimeSeriesBuilder', () => {
  it('should build commit time series', () => {
    const builder = new TimeSeriesBuilder()
    const commits: CommitInfo[] = [
      createCommit('2024-01-01', 'abc123'),
      createCommit('2024-01-01', 'def456'),
      createCommit('2024-01-02', 'ghi789')
    ]
    
    const series = builder.buildCommitTimeSeries(commits)
    
    expect(series).toHaveLength(2)
    expect(series[0].value).toBe(2) // Two commits on Jan 1
    expect(series[1].value).toBe(1) // One commit on Jan 2
  })
  
  it('should track cumulative lines of code', () => {
    const builder = new TimeSeriesBuilder()
    const commits: CommitInfo[] = [
      createCommitWithStats('2024-01-01', 100, 0),
      createCommitWithStats('2024-01-02', 50, 20),
      createCommitWithStats('2024-01-03', 0, 30)
    ]
    
    const series = builder.buildLinesOfCodeTimeSeries(commits)
    
    expect(series[0].value).toBe(100) // +100
    expect(series[1].value).toBe(130) // +50-20
    expect(series[2].value).toBe(100) // -30
  })
})
```

### 3.2 Current State Analyzer

#### Description
Analyze the current state of the repository at HEAD.

#### packages/core/src/analysis/CurrentStateAnalyzer.ts
```typescript
import { CommitInfo } from '../types/git'
import { FileMetrics, ContributorStats } from '../types/analysis'
import { FileAnalyzer } from '../git/FileAnalyzer'

export class CurrentStateAnalyzer {
  private fileAnalyzer: FileAnalyzer
  
  constructor() {
    this.fileAnalyzer = new FileAnalyzer()
  }
  
  async analyzeCurrentState(
    repoPath: string,
    commits: CommitInfo[],
    latestCommitSha: string
  ): Promise<{
    fileMetrics: Map<string, FileMetrics>
    contributors: Map<string, ContributorStats>
    fileTypes: Map<string, number>
    totalLines: number
  }> {
    const fileMetrics = await this.buildFileMetrics(repoPath, commits, latestCommitSha)
    const contributors = this.buildContributorStats(commits)
    const fileTypes = this.calculateFileTypes(fileMetrics)
    const totalLines = this.calculateTotalLines(fileMetrics)
    
    return {
      fileMetrics,
      contributors,
      fileTypes,
      totalLines
    }
  }
  
  private async buildFileMetrics(
    repoPath: string,
    commits: CommitInfo[],
    latestCommitSha: string
  ): Promise<Map<string, FileMetrics>> {
    const metrics = new Map<string, FileMetrics>()
    
    // Track which files currently exist
    const existingFiles = new Set<string>()
    
    // Get current files from latest commit
    for (const commit of commits) {
      for (const file of commit.stats.files) {
        if (file.status !== 'deleted') {
          existingFiles.add(file.path)
        }
        
        // Handle renames
        if (file.status === 'renamed' && file.oldPath) {
          existingFiles.delete(file.oldPath)
          existingFiles.add(file.path)
        }
      }
    }
    
    // Build metrics for each existing file
    for (const filePath of existingFiles) {
      const fileData = await this.fileAnalyzer.analyzeFileAtCommit(
        repoPath,
        filePath,
        latestCommitSha
      )
      
      const commitCount = this.countFileCommits(commits, filePath)
      const totalChurn = this.calculateFileChurn(commits, filePath)
      const lastModified = this.getLastModified(commits, filePath)
      const contributors = this.getFileContributors(commits, filePath)
      
      metrics.set(filePath, {
        path: filePath,
        currentLines: fileData.currentLines || 0,
        complexity: fileData.complexity || 0,
        totalCommits: commitCount,
        totalChurn,
        lastModified,
        contributors
      })
    }
    
    return metrics
  }
  
  private countFileCommits(commits: CommitInfo[], filePath: string): number {
    return commits.filter(commit =>
      commit.stats.files.some(file => 
        file.path === filePath || file.oldPath === filePath
      )
    ).length
  }
  
  private calculateFileChurn(commits: CommitInfo[], filePath: string): number {
    let churn = 0
    
    for (const commit of commits) {
      const file = commit.stats.files.find(f => 
        f.path === filePath || f.oldPath === filePath
      )
      
      if (file) {
        churn += file.additions + file.deletions
      }
    }
    
    return churn
  }
  
  private getLastModified(commits: CommitInfo[], filePath: string): Date {
    // Commits should be in reverse chronological order
    for (const commit of commits) {
      const hasFile = commit.stats.files.some(f => 
        f.path === filePath || f.oldPath === filePath
      )
      
      if (hasFile) {
        return commit.timestamp
      }
    }
    
    return new Date(0)
  }
  
  private getFileContributors(commits: CommitInfo[], filePath: string): Set<string> {
    const contributors = new Set<string>()
    
    for (const commit of commits) {
      const hasFile = commit.stats.files.some(f => 
        f.path === filePath || f.oldPath === filePath
      )
      
      if (hasFile) {
        contributors.add(`${commit.author}:${commit.email}`)
      }
    }
    
    return contributors
  }
  
  private buildContributorStats(commits: CommitInfo[]): Map<string, ContributorStats> {
    const stats = new Map<string, ContributorStats>()
    
    for (const commit of commits) {
      const key = `${commit.author}:${commit.email}`
      
      if (!stats.has(key)) {
        stats.set(key, {
          name: commit.author,
          email: commit.email,
          commits: 0,
          additions: 0,
          deletions: 0,
          filesModified: new Set(),
          firstCommit: commit.timestamp,
          lastCommit: commit.timestamp
        })
      }
      
      const contributor = stats.get(key)!
      contributor.commits++
      contributor.additions += commit.stats.additions
      contributor.deletions += commit.stats.deletions
      
      for (const file of commit.stats.files) {
        contributor.filesModified.add(file.path)
      }
      
      // Update date range
      if (commit.timestamp < contributor.firstCommit) {
        contributor.firstCommit = commit.timestamp
      }
      if (commit.timestamp > contributor.lastCommit) {
        contributor.lastCommit = commit.timestamp
      }
    }
    
    return stats
  }
  
  private calculateFileTypes(fileMetrics: Map<string, FileMetrics>): Map<string, number> {
    const types = new Map<string, number>()
    
    for (const [path, metrics] of fileMetrics) {
      const type = this.getFileType(path)
      const current = types.get(type) || 0
      types.set(type, current + metrics.currentLines)
    }
    
    return types
  }
  
  private calculateTotalLines(fileMetrics: Map<string, FileMetrics>): number {
    let total = 0
    
    for (const metrics of fileMetrics.values()) {
      total += metrics.currentLines
    }
    
    return total
  }
  
  private getFileType(filePath: string): string {
    const ext = filePath.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
    if (!ext) return 'Other'
    
    const typeMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      html: 'HTML',
      css: 'CSS',
      scss: 'CSS',
      json: 'JSON',
      md: 'Markdown',
      py: 'Python',
      java: 'Java',
      c: 'C',
      cpp: 'C++',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      rb: 'Ruby',
      php: 'PHP',
      sh: 'Shell',
      yml: 'YAML',
      yaml: 'YAML'
    }
    
    return typeMap[ext] || 'Other'
  }
}
```

### 3.3 File Rankings Calculator

#### Description
Calculate various rankings for files (largest, most churn, most complex).

#### packages/core/src/analysis/FileRankings.ts
```typescript
import { FileMetrics } from '../types/analysis'

export interface FileRanking {
  path: string
  value: number
  displayValue: string
}

export class FileRankingsCalculator {
  calculateLargestFiles(
    fileMetrics: Map<string, FileMetrics>,
    limit = 10
  ): FileRanking[] {
    return Array.from(fileMetrics.values())
      .sort((a, b) => b.currentLines - a.currentLines)
      .slice(0, limit)
      .map(file => ({
        path: this.shortenPath(file.path),
        value: file.currentLines,
        displayValue: `${file.currentLines} lines`
      }))
  }
  
  calculateMostChurn(
    fileMetrics: Map<string, FileMetrics>,
    limit = 10
  ): FileRanking[] {
    return Array.from(fileMetrics.values())
      .sort((a, b) => b.totalChurn - a.totalChurn)
      .slice(0, limit)
      .map(file => ({
        path: this.shortenPath(file.path),
        value: file.totalChurn,
        displayValue: `${file.totalChurn} changes`
      }))
  }
  
  calculateMostComplex(
    fileMetrics: Map<string, FileMetrics>,
    limit = 10
  ): FileRanking[] {
    return Array.from(fileMetrics.values())
      .filter(file => file.complexity > 0)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, limit)
      .map(file => ({
        path: this.shortenPath(file.path),
        value: file.complexity,
        displayValue: `Complexity: ${file.complexity}`
      }))
  }
  
  calculateHotspots(
    fileMetrics: Map<string, FileMetrics>,
    currentDate: Date = new Date()
  ): Map<string, number> {
    const hotspots = new Map<string, number>()
    
    for (const [path, metrics] of fileMetrics) {
      // Calculate hotspot score based on:
      // - Recent activity (exponential decay)
      // - Number of commits
      // - Number of contributors
      // - Churn rate
      
      const daysSinceModified = (currentDate.getTime() - metrics.lastModified.getTime()) / (1000 * 60 * 60 * 24)
      const recencyScore = Math.exp(-daysSinceModified / 30) // 30-day half-life
      
      const commitScore = Math.log(metrics.totalCommits + 1)
      const contributorScore = Math.log(metrics.contributors.size + 1)
      const churnScore = Math.log(metrics.totalChurn + 1)
      
      const hotspotScore = (
        recencyScore * 0.4 +
        commitScore * 0.3 +
        contributorScore * 0.2 +
        churnScore * 0.1
      )
      
      hotspots.set(path, hotspotScore)
    }
    
    return hotspots
  }
  
  private shortenPath(path: string): string {
    const parts = path.split('/')
    if (parts.length <= 2) return path
    
    // Show last two parts
    return parts.slice(-2).join('/')
  }
}
```

### 3.4 Contributor Awards Calculator

#### Description
Calculate various awards for contributors based on their activity.

#### packages/core/src/analysis/ContributorAwards.ts
```typescript
import { CommitInfo } from '../types/git'
import { ContributorStats } from '../types/analysis'

export interface Award {
  title: string
  emoji: string
  entries: AwardEntry[]
}

export interface AwardEntry {
  description: string
  author: string
  date: Date
  value: string
  commitSha?: string
}

export class ContributorAwardsCalculator {
  calculateAwards(
    commits: CommitInfo[],
    contributors: Map<string, ContributorStats>
  ): Award[] {
    return [
      this.mostFilesModified(commits),
      this.mostBytesAdded(commits),
      this.mostBytesRemoved(commits),
      this.mostLinesAdded(commits),
      this.mostLinesRemoved(commits),
      this.lowestAverageChange(contributors),
      this.highestAverageChange(contributors)
    ]
  }
  
  private mostFilesModified(commits: CommitInfo[]): Award {
    const sorted = [...commits].sort((a, b) => 
      b.stats.filesChanged - a.stats.filesChanged
    )
    
    return {
      title: 'Most Files Modified',
      emoji: '📁',
      entries: sorted.slice(0, 5).map(commit => ({
        description: this.truncateMessage(commit.message),
        author: commit.author,
        date: commit.timestamp,
        value: commit.stats.filesChanged.toString(),
        commitSha: commit.sha
      }))
    }
  }
  
  private mostBytesAdded(commits: CommitInfo[]): Award {
    const sorted = [...commits].sort((a, b) => {
      const bytesA = a.stats.additions * 30 // ~30 bytes per line
      const bytesB = b.stats.additions * 30
      return bytesB - bytesA
    })
    
    return {
      title: 'Most Bytes Added',
      emoji: '➕',
      entries: sorted.slice(0, 5).map(commit => ({
        description: this.truncateMessage(commit.message),
        author: commit.author,
        date: commit.timestamp,
        value: this.formatBytes(commit.stats.additions * 30),
        commitSha: commit.sha
      }))
    }
  }
  
  private mostBytesRemoved(commits: CommitInfo[]): Award {
    const sorted = [...commits].sort((a, b) => {
      const bytesA = a.stats.deletions * 30
      const bytesB = b.stats.deletions * 30
      return bytesB - bytesA
    })
    
    return {
      title: 'Most Bytes Removed',
      emoji: '➖',
      entries: sorted.slice(0, 5).map(commit => ({
        description: this.truncateMessage(commit.message),
        author: commit.author,
        date: commit.timestamp,
        value: this.formatBytes(commit.stats.deletions * 30),
        commitSha: commit.sha
      }))
    }
  }
  
  private mostLinesAdded(commits: CommitInfo[]): Award {
    const sorted = [...commits].sort((a, b) => 
      b.stats.additions - a.stats.additions
    )
    
    return {
      title: 'Most Lines Added',
      emoji: '📈',
      entries: sorted.slice(0, 5).map(commit => ({
        description: this.truncateMessage(commit.message),
        author: commit.author,
        date: commit.timestamp,
        value: commit.stats.additions.toLocaleString(),
        commitSha: commit.sha
      }))
    }
  }
  
  private mostLinesRemoved(commits: CommitInfo[]): Award {
    const sorted = [...commits].sort((a, b) => 
      b.stats.deletions - a.stats.deletions
    )
    
    return {
      title: 'Most Lines Removed',
      emoji: '📉',
      entries: sorted.slice(0, 5).map(commit => ({
        description: this.truncateMessage(commit.message),
        author: commit.author,
        date: commit.timestamp,
        value: commit.stats.deletions.toLocaleString(),
        commitSha: commit.sha
      }))
    }
  }
  
  private lowestAverageChange(contributors: Map<string, ContributorStats>): Award {
    const avgChanges = Array.from(contributors.entries())
      .map(([key, stats]) => ({
        contributor: stats,
        avgChange: (stats.additions + stats.deletions) / stats.commits
      }))
      .filter(c => c.contributor.commits >= 5) // Min 5 commits
      .sort((a, b) => a.avgChange - b.avgChange)
    
    return {
      title: 'Lowest Average Lines Changed',
      emoji: '🎯',
      entries: avgChanges.slice(0, 5).map(({ contributor, avgChange }) => ({
        description: contributor.name,
        author: contributor.name,
        date: contributor.lastCommit,
        value: avgChange.toFixed(1)
      }))
    }
  }
  
  private highestAverageChange(contributors: Map<string, ContributorStats>): Award {
    const avgChanges = Array.from(contributors.entries())
      .map(([key, stats]) => ({
        contributor: stats,
        avgChange: (stats.additions + stats.deletions) / stats.commits
      }))
      .filter(c => c.contributor.commits >= 5)
      .sort((a, b) => b.avgChange - a.avgChange)
    
    return {
      title: 'Highest Average Lines Changed',
      emoji: '💥',
      entries: avgChanges.slice(0, 5).map(({ contributor, avgChange }) => ({
        description: contributor.name,
        author: contributor.name,
        date: contributor.lastCommit,
        value: avgChange.toFixed(1)
      }))
    }
  }
  
  private truncateMessage(message: string, maxLength = 50): string {
    const firstLine = message.split('\n')[0]
    if (firstLine.length <= maxLength) return firstLine
    return firstLine.substring(0, maxLength - 3) + '...'
  }
  
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}
```

### 3.5 Word Cloud Generator

#### Description
Generate word frequency data for commit messages.

#### packages/core/src/analysis/WordCloudGenerator.ts
```typescript
import { CommitInfo } from '../types/git'

export interface WordFrequency {
  word: string
  count: number
  weight: number
}

export class WordCloudGenerator {
  private stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
    'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
    'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
    'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
    'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out',
    'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
    'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some',
    'could', 'them', 'see', 'other', 'than', 'then', 'now',
    'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
    'well', 'way', 'even', 'new', 'want', 'because', 'any',
    'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are',
    'been', 'has', 'had', 'were', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could',
    'may', 'might', 'must', 'shall', 'can', 'need', 'ought'
  ])
  
  generateFromCommits(
    commits: CommitInfo[],
    maxWords = 50,
    minWordLength = 3
  ): WordFrequency[] {
    const wordCounts = new Map<string, number>()
    
    // Extract words from commit messages
    for (const commit of commits) {
      const words = this.extractWords(commit.message)
      
      for (const word of words) {
        if (word.length >= minWordLength && !this.stopWords.has(word)) {
          const count = wordCounts.get(word) || 0
          wordCounts.set(word, count + 1)
        }
      }
    }
    
    // Sort by frequency and take top N
    const sorted = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxWords)
    
    // Calculate weights (0-100 scale)
    const maxCount = sorted[0]?.[1] || 1
    
    return sorted.map(([word, count]) => ({
      word,
      count,
      weight: (count / maxCount) * 100
    }))
  }
  
  generateFromFileContent(
    fileContents: Map<string, string>,
    maxWords = 50,
    minWordLength = 3
  ): WordFrequency[] {
    const wordCounts = new Map<string, number>()
    
    // Extract words from file contents
    for (const [path, content] of fileContents) {
      // Skip non-code files
      if (!this.isCodeFile(path)) continue
      
      const words = this.extractCodeWords(content)
      
      for (const word of words) {
        if (word.length >= minWordLength && !this.isCommonCodeWord(word)) {
          const count = wordCounts.get(word) || 0
          wordCounts.set(word, count + 1)
        }
      }
    }
    
    // Sort and weight as before
    const sorted = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxWords)
    
    const maxCount = sorted[0]?.[1] || 1
    
    return sorted.map(([word, count]) => ({
      word,
      count,
      weight: (count / maxCount) * 100
    }))
  }
  
  private extractWords(text: string): string[] {
    // Remove URLs
    text = text.replace(/https?:\/\/[^\s]+/g, '')
    
    // Extract words
    const words = text
      .toLowerCase()
      .split(/[\s\-_,.;:!?'"()\[\]{}<>\/\\]+/)
      .filter(word => /^[a-z]+$/.test(word))
    
    return words
  }
  
  private extractCodeWords(content: string): string[] {
    // Remove comments (simple approach)
    content = content.replace(/\/\/.*$/gm, '')
    content = content.replace(/\/\*[\s\S]*?\*\//g, '')
    content = content.replace(/#.*$/gm, '') // Python comments
    
    // Extract identifiers
    const words = content
      .split(/[^a-zA-Z0-9_]+/)
      .filter(word => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(word))
      .map(word => word.toLowerCase())
    
    return words
  }
  
  private isCodeFile(path: string): boolean {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs']
    return codeExtensions.some(ext => path.endsWith(ext))
  }
  
  private isCommonCodeWord(word: string): boolean {
    const commonWords = new Set([
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'return', 'class', 'import', 'export', 'from', 'async', 'await',
      'public', 'private', 'static', 'void', 'int', 'string', 'boolean',
      'true', 'false', 'null', 'undefined', 'this', 'self', 'def',
      'package', 'include', 'require', 'using', 'namespace'
    ])
    
    return commonWords.has(word) || this.stopWords.has(word)
  }
}
```

### 3.6 Analysis Orchestrator

#### Description
Orchestrate all analysis components to produce complete results.

#### packages/core/src/analysis/AnalysisOrchestrator.ts
```typescript
import { CommitInfo } from '../types/git'
import { AnalysisResult } from '../types/analysis'
import { TimeSeriesBuilder } from './TimeSeriesBuilder'
import { CurrentStateAnalyzer } from './CurrentStateAnalyzer'
import { FileRankingsCalculator } from './FileRankings'
import { ContributorAwardsCalculator } from './ContributorAwards'
import { WordCloudGenerator } from './WordCloudGenerator'
import { Logger } from '../logging/logger'

export class AnalysisOrchestrator {
  private logger = new Logger('AnalysisOrchestrator')
  
  async analyzeRepository(
    repoPath: string,
    commits: CommitInfo[],
    repoInfo: any
  ): Promise<AnalysisResult & {
    rankings: any
    awards: any
    wordCloud: any
  }> {
    this.logger.info('Starting repository analysis', { 
      commitCount: commits.length 
    })
    
    // Build time series data
    const timeSeriesBuilder = new TimeSeriesBuilder()
    const commitTimeSeries = timeSeriesBuilder.buildCommitTimeSeries(commits)
    const locTimeSeries = timeSeriesBuilder.buildLinesOfCodeTimeSeries(commits)
    const sizeTimeSeries = timeSeriesBuilder.buildRepositorySizeTimeSeries(commits)
    const contributorTimeSeries = timeSeriesBuilder.buildContributorTimeSeries(commits)
    
    // Analyze current state
    const currentStateAnalyzer = new CurrentStateAnalyzer()
    const currentState = await currentStateAnalyzer.analyzeCurrentState(
      repoPath,
      commits,
      commits[0].sha // Latest commit
    )
    
    // Build file type map for time series
    const fileTypeMap = new Map<string, string>()
    for (const [path, metrics] of currentState.fileMetrics) {
      const type = this.getFileType(path)
      fileTypeMap.set(path, type)
    }
    
    const fileTypeTimeSeries = timeSeriesBuilder.buildFileTypeTimeSeries(
      commits,
      fileTypeMap
    )
    
    // Calculate rankings
    const rankingsCalculator = new FileRankingsCalculator()
    const rankings = {
      largest: rankingsCalculator.calculateLargestFiles(currentState.fileMetrics),
      mostChurn: rankingsCalculator.calculateMostChurn(currentState.fileMetrics),
      mostComplex: rankingsCalculator.calculateMostComplex(currentState.fileMetrics),
      hotspots: rankingsCalculator.calculateHotspots(currentState.fileMetrics)
    }
    
    // Calculate awards
    const awardsCalculator = new ContributorAwardsCalculator()
    const awards = awardsCalculator.calculateAwards(
      commits,
      currentState.contributors
    )
    
    // Generate word cloud
    const wordCloudGenerator = new WordCloudGenerator()
    const wordCloud = wordCloudGenerator.generateFromCommits(commits)
    
    this.logger.info('Analysis complete')
    
    return {
      repository: repoInfo,
      timeSeries: {
        commits: commitTimeSeries,
        linesOfCode: locTimeSeries,
        size: sizeTimeSeries,
        contributors: contributorTimeSeries,
        fileTypes: fileTypeTimeSeries
      },
      currentState,
      rankings,
      awards,
      wordCloud
    }
  }
  
  private getFileType(path: string): string {
    // Same logic as CurrentStateAnalyzer
    const ext = path.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
    if (!ext) return 'Other'
    
    const typeMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      // ... etc
    }
    
    return typeMap[ext] || 'Other'
  }
}
```

## Testing

### Integration Test
```typescript
describe('Analysis Engine Integration', () => {
  it('should analyze a complete repository', async () => {
    const commits = await loadTestCommits()
    const orchestrator = new AnalysisOrchestrator()
    
    const result = await orchestrator.analyzeRepository(
      './test-repo',
      commits,
      { name: 'test-repo', totalCommits: commits.length }
    )
    
    // Time series
    expect(result.timeSeries.commits).toHaveLength(commits.length)
    expect(result.timeSeries.linesOfCode).toHaveLength(commits.length)
    expect(result.timeSeries.fileTypes.size).toBeGreaterThan(0)
    
    // Current state
    expect(result.currentState.totalLines).toBeGreaterThan(0)
    expect(result.currentState.fileMetrics.size).toBeGreaterThan(0)
    expect(result.currentState.contributors.size).toBeGreaterThan(0)
    
    // Rankings
    expect(result.rankings.largest).toHaveLength(10)
    expect(result.rankings.mostChurn).toHaveLength(10)
    expect(result.rankings.mostComplex.length).toBeLessThanOrEqual(10)
    
    // Awards
    expect(result.awards).toHaveLength(7)
    expect(result.awards[0].entries).toHaveLength(5)
    
    // Word cloud
    expect(result.wordCloud.length).toBeLessThanOrEqual(50)
    expect(result.wordCloud[0].weight).toBe(100)
  })
})
```

## Deliverables

1. **TimeSeriesBuilder**: Builds all time-series data from commits
2. **CurrentStateAnalyzer**: Analyzes repository state at HEAD
3. **FileRankingsCalculator**: Calculates file rankings and hotspots
4. **ContributorAwardsCalculator**: Generates contributor awards
5. **WordCloudGenerator**: Creates word frequency data
6. **AnalysisOrchestrator**: Coordinates all analysis components

## Success Criteria

- [ ] Time series accurately tracks cumulative values
- [ ] File metrics include complexity calculations
- [ ] Rankings identify the right files
- [ ] Awards recognize notable contributions
- [ ] Word cloud filters out common words
- [ ] All components work together seamlessly

## Next Phase

With analysis complete, Phase 4 will create the visualization components that display this data beautifully.