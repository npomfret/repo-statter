/**
 * Data transformation utilities for converting Phase 3 analysis results
 * into formats suitable for Phase 4 visualization components
 * @module @repo-statter/visualizations/utils/dataTransformers
 */

import type { ExtendedAnalysisResult } from '@repo-statter/core/analysis/analysis-orchestrator.js'
import type { AnalysisResult, TimeSeriesData, ContributorStats, FileMetrics } from '@repo-statter/core/types/analysis.js'

// Import visualization component data types
import type { GrowthChartData } from '../charts/GrowthChart.js'
import type { FileTypeData } from '../charts/FileTypesPieChart.js'
import type { ContributorBarData } from '../charts/ContributorBarChart.js'
import type { FileActivityHeatmapData } from '../charts/FileActivityHeatmap.js'
import type { TopFilesData } from '../widgets/TopFilesTable.js'
import type { MetricData } from '../widgets/MetricCard.js'
import type { TimeRangeData } from '../widgets/TimeRangeSlider.js'

/**
 * Transform Phase 3 time series data to GrowthChart format
 */
export function transformToGrowthChart(analysisResult: AnalysisResult | ExtendedAnalysisResult): GrowthChartData {
  const timeSeries = analysisResult.timeSeries
  
  return {
    series: [
      {
        name: 'Lines of Code',
        data: timeSeries.linesOfCode.points.map(point => ({
          x: point.date.getTime(),
          y: point.value
        }))
      },
      {
        name: 'Commits',
        data: timeSeries.commits.points.map(point => ({
          x: point.date.getTime(),
          y: point.value
        }))
      },
      {
        name: 'Contributors',
        data: timeSeries.contributors.points.map(point => ({
          x: point.date.getTime(),
          y: point.value
        }))
      },
      {
        name: 'Files',
        data: timeSeries.fileCount.points.map(point => ({
          x: point.date.getTime(),
          y: point.value
        }))
      }
    ]
  }
}

/**
 * Create growth chart with specific metrics
 */
export function transformToCustomGrowthChart(
  analysisResult: AnalysisResult | ExtendedAnalysisResult,
  metrics: Array<'linesOfCode' | 'commits' | 'contributors' | 'fileCount'>
): GrowthChartData {
  const timeSeries = analysisResult.timeSeries
  const series = []
  
  for (const metric of metrics) {
    if (timeSeries[metric]) {
      series.push({
        name: timeSeries[metric].name,
        data: timeSeries[metric].points.map(point => ({
          x: point.date.getTime(),
          y: point.value
        }))
      })
    }
  }
  
  return { series }
}

/**
 * Transform language statistics to pie chart format
 */
export function transformToFileTypesPie(analysisResult: AnalysisResult | ExtendedAnalysisResult): FileTypeData {
  const languages = Array.from(analysisResult.currentState.languages.values())
    .sort((a, b) => b.lines - a.lines) // Sort by lines, largest first
  
  return {
    series: languages.map(lang => lang.lines),
    labels: languages.map(lang => lang.language),
    colors: languages.map(lang => lang.color).filter(Boolean) as string[]
  }
}

/**
 * Transform contributor statistics to bar chart format
 */
export function transformToContributorBarChart(
  analysisResult: AnalysisResult | ExtendedAnalysisResult,
  limit: number = 10,
  activeMetric: 'commits' | 'additions' | 'deletions' | 'impact' = 'commits'
): ContributorBarData {
  const contributors = Array.from(analysisResult.currentState.contributors.values())
    .sort((a, b) => {
      switch (activeMetric) {
        case 'commits': return b.commits - a.commits
        case 'additions': return b.additions - a.additions
        case 'deletions': return b.deletions - a.deletions
        case 'impact': return (b.impactScore || 0) - (a.impactScore || 0)
        default: return b.commits - a.commits
      }
    })
    .slice(0, limit)
  
  return {
    contributors: contributors.map(contributor => ({
      name: contributor.name,
      email: contributor.email,
      commits: contributor.commits,
      linesAdded: contributor.additions,
      linesDeleted: contributor.deletions,
      filesChanged: contributor.filesModified.size,
      avatar: generateAvatarUrl(contributor.email)
    })),
    metrics: [
      { key: 'commits', label: 'Commits', color: '#008FFB' },
      { key: 'linesAdded', label: 'Lines Added', color: '#00E396' },
      { key: 'linesDeleted', label: 'Lines Deleted', color: '#FEB019' },
      { key: 'filesChanged', label: 'Files Changed', color: '#FF4560' }
    ]
  }
}

/**
 * Transform file metrics to activity heatmap format
 */
export function transformToFileActivityHeatmap(
  analysisResult: AnalysisResult | ExtendedAnalysisResult,
  colorScheme: 'blue' | 'green' | 'red' | 'rainbow' = 'blue',
  limit: number = 100
): FileActivityHeatmapData {
  const fileMetrics = Array.from(analysisResult.currentState.fileMetrics.values())
    .filter(file => file.currentLines > 0) // Only include files with content
    .sort((a, b) => b.totalCommits - a.totalCommits) // Sort by activity
    .slice(0, limit) // Limit for performance
  
  return {
    files: fileMetrics.map(file => ({
      path: file.path,
      size: file.currentLines,
      commits: file.totalCommits,
      lastModified: file.lastModified,
      contributors: Array.from(file.contributors),
      language: file.language,
      complexity: file.complexity || 1,
      changeFrequency: file.totalCommits / Math.max(1, (new Date().getTime() - file.firstAppeared.getTime()) / (30 * 24 * 60 * 60 * 1000)) // commits per month
    })),
    colorMetric: 'commits'
  }
}

/**
 * Transform file rankings to top files table format
 */
export function transformToTopFilesTable(
  analysisResult: ExtendedAnalysisResult,
  options: {
    maxFiles?: number
    includeTabs?: Array<'largest' | 'churn' | 'complex' | 'hotspots' | 'recent' | 'stale'>
  } = {}
): TopFilesData {
  const { maxFiles = 20, includeTabs = ['largest', 'churn', 'complex', 'hotspots'] } = options
  const rankings = analysisResult.rankings
  
  const tabs = []
  
  if (includeTabs.includes('largest')) {
    tabs.push({
      id: 'largest',
      label: 'Largest Files',
      files: rankings.largest.slice(0, maxFiles).map(file => ({
        path: file.path,
        metric: file.lines,
        secondaryMetric: calculateDaysAgo(file.lastModified),
        contributors: getFileContributors(file.path, analysisResult.currentState.fileMetrics)
      }))
    })
  }
  
  if (includeTabs.includes('churn')) {
    tabs.push({
      id: 'churn',
      label: 'Most Changed',
      files: rankings.mostChurn.slice(0, maxFiles).map(file => ({
        path: file.path,
        metric: file.totalChanges,
        secondaryMetric: file.contributors,
        contributors: getFileContributors(file.path, analysisResult.currentState.fileMetrics)
      }))
    })
  }
  
  if (includeTabs.includes('complex')) {
    tabs.push({
      id: 'complex',
      label: 'Most Complex',
      files: rankings.mostComplex.slice(0, maxFiles).map(file => ({
        path: file.path,
        metric: file.complexity || 0,
        secondaryMetric: file.lines,
        contributors: getFileContributors(file.path, analysisResult.currentState.fileMetrics)
      }))
    })
  }
  
  if (includeTabs.includes('hotspots')) {
    tabs.push({
      id: 'hotspots',
      label: 'Hotspots',
      files: rankings.hotspots.slice(0, maxFiles).map(file => ({
        path: file.path,
        metric: Math.round(file.score * 100) / 100, // Round to 2 decimal places
        secondaryMetric: file.recentCommits,
        contributors: getFileContributors(file.path, analysisResult.currentState.fileMetrics)
      }))
    })
  }
  
  if (includeTabs.includes('recent')) {
    tabs.push({
      id: 'recent',
      label: 'Recently Modified',
      files: rankings.recent.slice(0, maxFiles).map(file => ({
        path: file.path,
        metric: calculateDaysAgo(file.lastModified),
        secondaryMetric: file.lines,
        contributors: getFileContributors(file.path, analysisResult.currentState.fileMetrics)
      }))
    })
  }
  
  if (includeTabs.includes('stale')) {
    tabs.push({
      id: 'stale',
      label: 'Stale Files',
      files: rankings.stale.slice(0, maxFiles).map(file => ({
        path: file.path,
        metric: calculateDaysAgo(file.lastModified),
        secondaryMetric: file.lines,
        contributors: getFileContributors(file.path, analysisResult.currentState.fileMetrics)
      }))
    })
  }
  
  return { tabs }
}

/**
 * Transform summary statistics to metric cards
 */
export function transformToMetricCards(analysisResult: ExtendedAnalysisResult): MetricData[] {
  const summary = analysisResult.summary
  const currentState = analysisResult.currentState
  
  return [
    {
      label: 'Total Lines',
      value: currentState.totalLines,
      icon: 'code',
      description: 'Lines of code in repository'
    },
    {
      label: 'Total Files',
      value: currentState.totalFiles,
      icon: 'files',
      description: 'Files tracked in repository'
    },
    {
      label: 'Contributors',
      value: summary.contributors.total,
      icon: 'users',
      trend: summary.contributors.active > summary.contributors.total * 0.5 ? {
        value: Math.round((summary.contributors.active / summary.contributors.total) * 100),
        direction: 'up' as const
      } : undefined,
      description: `${summary.contributors.active} active in last 30 days`
    },
    {
      label: 'Repository Age',
      value: `${summary.repository.age} days`,
      icon: 'calendar',
      description: 'Days since first commit'
    },
    {
      label: 'Commit Velocity',
      value: `${summary.repository.velocity}/day`,
      icon: 'commits',
      trend: summary.repository.momentum > summary.repository.velocity ? {
        value: Math.round(((summary.repository.momentum - summary.repository.velocity) / summary.repository.velocity) * 100),
        direction: 'up' as const
      } : undefined,
      description: 'Average commits per day'
    },
    {
      label: 'Languages',
      value: currentState.languages.size,
      icon: 'code',
      description: 'Programming languages detected'
    }
  ]
}

/**
 * Transform commit history to time range data
 */
export function transformToTimeRange(analysisResult: AnalysisResult | ExtendedAnalysisResult): TimeRangeData {
  const commits = analysisResult.history.commits
  
  if (commits.length === 0) {
    const now = new Date()
    const oneYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    return {
      min: oneYear,
      max: now,
      current: {
        start: oneYear,
        end: now
      }
    }
  }
  
  const firstCommit = commits[0].timestamp
  const lastCommit = commits[commits.length - 1].timestamp
  
  // Default to last 3 months or full range if shorter
  const threeMonthsAgo = new Date(lastCommit.getTime() - 90 * 24 * 60 * 60 * 1000)
  const startDate = threeMonthsAgo > firstCommit ? threeMonthsAgo : firstCommit
  
  return {
    min: firstCommit,
    max: lastCommit,
    current: {
      start: startDate,
      end: lastCommit
    }
  }
}

/**
 * Create filtered analysis result based on date range
 */
export function filterAnalysisByDateRange(
  analysisResult: AnalysisResult | ExtendedAnalysisResult,
  startDate: Date,
  endDate: Date
): Partial<AnalysisResult> {
  // Filter commits
  const filteredCommits = analysisResult.history.commits.filter(commit => 
    commit.timestamp >= startDate && commit.timestamp <= endDate
  )
  
  // Filter time series points
  const filterTimeSeries = (series: TimeSeriesData): TimeSeriesData => ({
    ...series,
    points: series.points.filter(point => 
      point.date >= startDate && point.date <= endDate
    )
  })
  
  return {
    ...analysisResult,
    history: {
      commits: filteredCommits
    },
    timeSeries: {
      commits: filterTimeSeries(analysisResult.timeSeries.commits),
      linesOfCode: filterTimeSeries(analysisResult.timeSeries.linesOfCode),
      contributors: filterTimeSeries(analysisResult.timeSeries.contributors),
      fileCount: filterTimeSeries(analysisResult.timeSeries.fileCount),
      languages: new Map(
        Array.from(analysisResult.timeSeries.languages.entries())
          .map(([lang, series]) => [lang, filterTimeSeries(series)])
      )
    }
  }
}

/**
 * Generate language time series for specific languages
 */
export function transformToLanguageTimeSeries(
  analysisResult: AnalysisResult | ExtendedAnalysisResult,
  languages?: string[]
): GrowthChartData {
  const languageTimeSeries = analysisResult.timeSeries.languages
  const selectedLanguages = languages || Array.from(languageTimeSeries.keys()).slice(0, 5)
  
  return {
    series: selectedLanguages
      .filter(lang => languageTimeSeries.has(lang))
      .map(lang => {
        const series = languageTimeSeries.get(lang)!
        return {
          name: lang,
          data: series.points.map(point => ({
            x: point.date.getTime(),
            y: point.value
          }))
        }
      })
  }
}

// Helper functions

/**
 * Generate avatar URL from email
 */
function generateAvatarUrl(email: string): string {
  // Simple implementation - in real app might use Gravatar or GitHub
  const username = email.split('@')[0].toLowerCase()
  return `https://github.com/${username}.png?size=40`
}

/**
 * Calculate days ago from a date
 */
function calculateDaysAgo(date: Date): number {
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get contributors for a specific file
 */
function getFileContributors(filePath: string, fileMetrics: Map<string, FileMetrics>): string[] {
  const metrics = fileMetrics.get(filePath)
  return metrics ? Array.from(metrics.contributors) : []
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Format trend data for metric cards
 */
export function formatTrendData(
  current: number,
  previous: number
): { value: number; direction: 'up' | 'down' } | undefined {
  if (previous === 0 && current === 0) return undefined
  
  const change = calculatePercentageChange(current, previous)
  
  if (Math.abs(change) < 1) return undefined // Ignore changes < 1%
  
  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : 'down'
  }
}

/**
 * Batch transform all visualization data from analysis result
 */
export function transformAllVisualizationData(
  analysisResult: ExtendedAnalysisResult,
  options: {
    contributorLimit?: number
    fileLimit?: number
    heatmapLimit?: number
  } = {}
): {
  growthChart: GrowthChartData
  languageChart: GrowthChartData
  fileTypesPie: FileTypeData
  contributorBar: ContributorBarData
  fileHeatmap: FileActivityHeatmapData
  topFilesTable: TopFilesData
  metricCards: MetricData[]
  timeRange: TimeRangeData
} {
  const { contributorLimit = 10, fileLimit = 20, heatmapLimit = 100 } = options
  
  return {
    growthChart: transformToGrowthChart(analysisResult),
    languageChart: transformToLanguageTimeSeries(analysisResult),
    fileTypesPie: transformToFileTypesPie(analysisResult),
    contributorBar: transformToContributorBarChart(analysisResult, contributorLimit),
    fileHeatmap: transformToFileActivityHeatmap(analysisResult, 'blue', heatmapLimit),
    topFilesTable: transformToTopFilesTable(analysisResult, { maxFiles: fileLimit }),
    metricCards: transformToMetricCards(analysisResult),
    timeRange: transformToTimeRange(analysisResult)
  }
}