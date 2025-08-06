/**
 * Analysis Engine
 * @module @repo-statter/core/analysis/engine
 */

import { GitRepository } from '../git/repository.js'
import { Logger } from '../logging/logger.js'
import { RepoStatterError } from '../errors/base.js'
import { AnalysisResult, AnalysisConfig, ContributorStats, TimeSeriesData } from '../types/analysis.js'
import { CommitInfo } from '../types/git.js'

export class AnalysisEngineError extends RepoStatterError {
  code = 'ANALYSIS_ERROR'
  userMessage = 'Failed to analyze repository'
  
  constructor(message: string, originalError?: Error) {
    super(message, originalError)
    this.name = 'AnalysisEngineError'
  }
}

export interface AnalysisProgress {
  phase: 'initialization' | 'commit_processing' | 'statistics_calculation' | 'finalization'
  processed: number
  total: number
  percentage: number
  currentItem?: string
}

export class AnalysisEngine {
  private readonly logger: Logger
  private progressCallback?: (progress: AnalysisProgress) => void

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger('AnalysisEngine')
  }

  setProgressCallback(callback: (progress: AnalysisProgress) => void): void {
    this.progressCallback = callback
  }

  async analyze(repositoryPath: string, config: AnalysisConfig = {}): Promise<AnalysisResult> {
    const startTime = Date.now()
    
    try {
      this.logger.info('Starting repository analysis', { path: repositoryPath })
      
      // Initialize repository
      this.emitProgress('initialization', 0, 4, 'Initializing repository')
      const repository = new GitRepository(repositoryPath)
      const repoInfo = await repository.getRepositoryInfo()
      
      if (!repoInfo.isValid) {
        throw new AnalysisEngineError('Invalid git repository')
      }

      this.emitProgress('initialization', 1, 4, 'Repository validated')

      // Process commits
      this.emitProgress('commit_processing', 0, repoInfo.totalCommits, 'Processing commits')
      const commits: CommitInfo[] = []
      let processed = 0

      // For now, create mock commit data structure that matches CommitInfo
      for await (const gitCommit of repository.streamCommits()) {
        const commitInfo: CommitInfo = {
          sha: gitCommit.sha,
          author: gitCommit.author.name,
          email: gitCommit.author.email,
          timestamp: gitCommit.date,
          message: gitCommit.message,
          stats: {
            filesChanged: gitCommit.files.length,
            additions: gitCommit.stats.insertions,
            deletions: gitCommit.stats.deletions,
            files: gitCommit.files.map((file: any) => ({
              path: file.path,
              additions: file.insertions,
              deletions: file.deletions,
              status: file.status
            }))
          }
        }
        
        commits.push(commitInfo)
        processed++
        
        if (processed % 100 === 0) {
          this.emitProgress('commit_processing', processed, repoInfo.totalCommits, `Processed ${processed} commits`)
        }

        if (config.maxCommits && processed >= config.maxCommits) {
          break
        }
      }

      this.emitProgress('commit_processing', processed, processed, 'Commit processing complete')

      // Calculate statistics
      this.emitProgress('statistics_calculation', 0, 3, 'Calculating contributor statistics')
      const contributors = this.calculateContributorStats(commits)
      
      this.emitProgress('statistics_calculation', 2, 3, 'Generating time series data')
      const timeSeries = this.generateTimeSeries(commits, config.granularity || 'month')

      // Finalize results
      this.emitProgress('finalization', 3, 3, 'Finalizing analysis')
      const endTime = Date.now()
      
      const result: AnalysisResult = {
        repository: {
          path: repositoryPath,
          name: repositoryPath.split('/').pop() || 'unknown',
          branch: repoInfo.currentBranch || 'unknown',
          totalCommits: commits.length,
          firstCommitDate: commits[commits.length - 1]?.timestamp || new Date(),
          lastCommitDate: commits[0]?.timestamp || new Date()
        },
        analyzedAt: new Date(),
        config,
        timeSeries: {
          commits: timeSeries.commits,
          linesOfCode: timeSeries.linesOfCode,
          contributors: timeSeries.contributors,
          fileCount: timeSeries.fileCount,
          languages: new Map()
        },
        currentState: {
          totalLines: commits.reduce((sum, commit) => sum + commit.stats.additions, 0),
          totalFiles: new Set(commits.flatMap(c => c.stats.files.map(f => f.path))).size,
          totalBytes: 0,
          fileMetrics: new Map(),
          contributors,
          languages: new Map()
        },
        history: {
          commits
        }
      }

      this.logger.info('Repository analysis completed', {
        path: repositoryPath,
        commitsProcessed: commits.length,
        processingTime: endTime - startTime
      })

      return result

    } catch (error) {
      this.logger.error('Analysis failed', error as Error)
      throw error instanceof AnalysisEngineError 
        ? error 
        : new AnalysisEngineError(`Analysis failed: ${(error as Error).message}`)
    }
  }

  private calculateContributorStats(commits: CommitInfo[]): Map<string, ContributorStats> {
    const contributorMap = new Map<string, ContributorStats>()

    for (const commit of commits) {
      const key = commit.email
      const existing = contributorMap.get(key)

      if (existing) {
        existing.commits++
        existing.additions += commit.stats.additions
        existing.deletions += commit.stats.deletions
        existing.lastCommit = commit.timestamp > existing.lastCommit ? commit.timestamp : existing.lastCommit
        commit.stats.files.forEach(file => existing.filesModified.add(file.path))
        existing.emails.add(commit.email)
      } else {
        contributorMap.set(key, {
          name: commit.author,
          email: commit.email,
          emails: new Set([commit.email]),
          commits: 1,
          additions: commit.stats.additions,
          deletions: commit.stats.deletions,
          filesModified: new Set(commit.stats.files.map(f => f.path)),
          firstCommit: commit.timestamp,
          lastCommit: commit.timestamp,
          activeDays: 1
        })
      }
    }

    return contributorMap
  }

  private generateTimeSeries(commits: CommitInfo[], interval: 'day' | 'week' | 'month' | 'year'): {
    commits: TimeSeriesData
    linesOfCode: TimeSeriesData
    contributors: TimeSeriesData
    fileCount: TimeSeriesData
  } {
    // Simple implementation - group by time period
    const periods = new Map<string, {
      commits: number
      linesAdded: number
      contributors: Set<string>
      files: Set<string>
    }>()

    for (const commit of commits) {
      const period = this.formatTimePeriod(commit.timestamp, interval)
      const existing = periods.get(period)

      if (existing) {
        existing.commits++
        existing.linesAdded += commit.stats.additions
        existing.contributors.add(commit.email)
        commit.stats.files.forEach(file => existing.files.add(file.path))
      } else {
        periods.set(period, {
          commits: 1,
          linesAdded: commit.stats.additions,
          contributors: new Set([commit.email]),
          files: new Set(commit.stats.files.map(f => f.path))
        })
      }
    }

    const sortedPeriods = Array.from(periods.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    return {
      commits: {
        name: 'Commits',
        points: sortedPeriods.map(([period, data]) => ({
          date: this.parseTimePeriod(period, interval),
          value: data.commits
        }))
      },
      linesOfCode: {
        name: 'Lines of Code',
        points: sortedPeriods.map(([period, data]) => ({
          date: this.parseTimePeriod(period, interval),
          value: data.linesAdded
        }))
      },
      contributors: {
        name: 'Contributors',
        points: sortedPeriods.map(([period, data]) => ({
          date: this.parseTimePeriod(period, interval),
          value: data.contributors.size
        }))
      },
      fileCount: {
        name: 'Files',
        points: sortedPeriods.map(([period, data]) => ({
          date: this.parseTimePeriod(period, interval),
          value: data.files.size
        }))
      }
    }
  }

  private formatTimePeriod(date: Date, interval: 'day' | 'week' | 'month' | 'year'): string {
    switch (interval) {
      case 'day':
        return date.toISOString().split('T')[0]!
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().split('T')[0]!
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      case 'year':
        return String(date.getFullYear())
    }
  }

  private parseTimePeriod(period: string, interval: 'day' | 'week' | 'month' | 'year'): Date {
    switch (interval) {
      case 'day':
      case 'week':
        return new Date(period)
      case 'month':
        return new Date(period + '-01')
      case 'year':
        return new Date(period + '-01-01')
    }
  }

  private emitProgress(phase: AnalysisProgress['phase'], processed: number, total: number, currentItem?: string): void {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        processed,
        total,
        percentage: total > 0 ? Math.round((processed / total) * 100) : 0,
        currentItem
      })
    }
  }
}