/**
 * Integration tests for Phase 4 visualizations with Phase 3 analysis data
 * Tests that visualization components properly handle real analysis engine output
 * @module @repo-statter/visualizations/__tests__/phase-3-integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalysisOrchestrator, type ExtendedAnalysisResult } from '@repo-statter/core/analysis/analysis-orchestrator.js'
import { CommitInfo, RepositoryInfo } from '@repo-statter/core/types/git.js'
import { TimeSeriesPoint, FileMetrics, ContributorStats } from '@repo-statter/core/types/analysis.js'

// Import visualization components
import { GrowthChart, type GrowthChartData } from '../charts/GrowthChart.js'
import { FileTypesPieChart, type FileTypeData } from '../charts/FileTypesPieChart.js'
import { ContributorBarChart, type ContributorBarData } from '../charts/ContributorBarChart.js'
import { FileActivityHeatmap, type FileActivityHeatmapData } from '../charts/FileActivityHeatmap.js'
import { TopFilesTable, type TopFilesData } from '../widgets/TopFilesTable.js'
import { MetricCard, type MetricData } from '../widgets/MetricCard.js'
import { TimeRangeSlider, type TimeRangeData } from '../widgets/TimeRangeSlider.js'

describe('Phase 3 Integration Tests', () => {
  let mockAnalysisResult: ExtendedAnalysisResult

  beforeEach(() => {
    // Create comprehensive mock data based on real Phase 3 output structure
    mockAnalysisResult = createMockAnalysisResult()
  })

  describe('Time Series Data Integration', () => {
    it('should handle GrowthChart with Phase 3 time series data', () => {
      // Transform Phase 3 time series to GrowthChart format
      const growthData: GrowthChartData = {
        series: [
          {
            name: 'Lines of Code',
            data: mockAnalysisResult.timeSeries.linesOfCode.points.map(point => ({
              x: point.date.getTime(),
              y: point.value
            }))
          },
          {
            name: 'Commits',
            data: mockAnalysisResult.timeSeries.commits.points.map(point => ({
              x: point.date.getTime(),
              y: point.value
            }))
          }
        ]
      }

      const chart = new GrowthChart(growthData)
      const html = chart.renderStatic()

      // Verify chart renders with real data
      expect(html).toContain('growth-chart')
      expect(html).toContain('Lines of Code')
      expect(html).toContain('Commits')

      // Verify SVG generation works
      const svg = chart.toSVG()
      expect(svg).toContain('<svg')
      expect(svg).toContain('<path') // Should contain line paths
    })

    it('should handle multiple time series from Phase 3', () => {
      const data: GrowthChartData = {
        series: [
          {
            name: 'Contributors',
            data: mockAnalysisResult.timeSeries.contributors.points.map(point => ({
              x: point.date.getTime(),
              y: point.value
            }))
          },
          {
            name: 'Files',
            data: mockAnalysisResult.timeSeries.fileCount.points.map(point => ({
              x: point.date.getTime(),
              y: point.value
            }))
          }
        ]
      }

      const chart = new GrowthChart(data)
      const html = chart.renderStatic()

      expect(html).toContain('Contributors')
      expect(html).toContain('Files')
      expect(html).toContain('data-config')
    })
  })

  describe('Language Distribution Integration', () => {
    it('should handle FileTypesPieChart with Phase 3 language data', () => {
      // Transform Phase 3 language stats to pie chart format
      const languages = Array.from(mockAnalysisResult.currentState.languages.values())
      const data: FileTypeData = {
        series: languages.map(lang => lang.lines),
        labels: languages.map(lang => lang.language),
        colors: languages.map(lang => lang.color).filter(Boolean) as string[]
      }

      const chart = new FileTypesPieChart(data, { theme: 'light' })
      const html = chart.renderStatic()

      expect(html).toContain('file-types-chart')
      expect(html).toContain('JavaScript') // From mock data
      expect(html).toContain('TypeScript') // From mock data
      
      // Should have legend
      expect(html).toContain('pie-legend')
      expect(html).toContain('lines') // Value unit
    })

    it('should handle empty language data gracefully', () => {
      const data: FileTypeData = {
        series: [],
        labels: [],
        colors: []
      }

      const chart = new FileTypesPieChart(data)
      const html = chart.renderStatic()

      // Should render without errors
      expect(html).toContain('file-types-chart')
      expect(html).toContain('pie-legend')
    })
  })

  describe('Contributor Data Integration', () => {
    it('should handle ContributorBarChart with Phase 3 contributor stats', () => {
      // Transform Phase 3 contributor data
      const contributors = Array.from(mockAnalysisResult.currentState.contributors.values())
        .slice(0, 10) // Top 10
        .sort((a, b) => b.commits - a.commits)

      const data: ContributorBarData = {
        contributors: contributors.map(contributor => ({
          name: contributor.name,
          email: contributor.email,
          commits: contributor.commits,
          linesAdded: contributor.additions,
          linesDeleted: contributor.deletions,
          filesChanged: contributor.filesModified.size,
          avatar: `https://github.com/${contributor.name.toLowerCase()}.png?size=40`
        })),
        metrics: [
          { key: 'commits', label: 'Commits', color: '#008FFB' },
          { key: 'linesAdded', label: 'Lines Added', color: '#00E396' }
        ]
      }

      const chart = new ContributorBarChart(data)
      const html = chart.renderStatic()

      expect(html).toContain('contributor-bar-chart')
      expect(html).toContain('Alice Developer') // From mock data
      expect(html).toContain('Bob Coder') // From mock data
      
      // Should have metric toggles
      expect(html).toContain('metric-toggles')
      expect(html).toContain('commits')
    })

    it('should handle contributor awards data', () => {
      const awards = mockAnalysisResult.awards
      
      // Verify awards structure matches expectations
      expect(awards).toHaveProperty('individual')
      expect(awards).toHaveProperty('team')
      expect(awards.individual.size).toBeGreaterThan(0)
      expect(awards.team.length).toBeGreaterThan(0)
    })
  })

  describe('File Metrics Integration', () => {
    it('should handle TopFilesTable with Phase 3 file rankings', () => {
      const rankings = mockAnalysisResult.rankings

      const data: TopFilesData = {
        tabs: [
          {
            id: 'largest',
            label: 'Largest Files',
            files: rankings.largest.map(file => ({
              path: file.path,
              metric: file.lines,
              secondaryMetric: new Date().getTime() - file.lastModified.getTime()
            }))
          },
          {
            id: 'churn',
            label: 'Most Changed',
            files: rankings.mostChurn.map(file => ({
              path: file.path,
              metric: file.totalChanges,
              secondaryMetric: file.contributors
            }))
          },
          {
            id: 'complex',
            label: 'Most Complex',
            files: rankings.mostComplex.map(file => ({
              path: file.path,
              metric: file.complexity || 0,
              secondaryMetric: file.lines
            }))
          }
        ]
      }

      const table = new TopFilesTable(data, { maxFiles: 20 })
      const html = table.renderStatic()

      expect(html).toContain('top-files-table')
      expect(html).toContain('Largest Files')
      expect(html).toContain('Most Changed')
      expect(html).toContain('Most Complex')
      expect(html).toContain('src/main.ts') // From mock data
    })

    it('should handle FileActivityHeatmap with Phase 3 file data', () => {
      const fileMetrics = Array.from(mockAnalysisResult.currentState.fileMetrics.values())
        .slice(0, 50) // Limit for performance

      const data: FileActivityHeatmapData = {
        files: fileMetrics.map(file => ({
          path: file.path,
          size: file.currentLines,
          commits: file.totalCommits,
          lastModified: file.lastModified,
          contributors: Array.from(file.contributors),
          language: file.language,
          complexity: file.complexity || 1,
          changeFrequency: 2.5 // Mock value
        })),
        colorMetric: 'commits'
      }

      const heatmap = new FileActivityHeatmap(data)
      const html = heatmap.renderStatic()

      expect(html).toContain('file-activity-heatmap')
      expect(html).toContain('treemap-container')
    })
  })

  describe('Summary Statistics Integration', () => {
    it('should handle MetricCard with Phase 3 summary data', () => {
      const summary = mockAnalysisResult.summary

      // Repository metrics
      const repoCard = new MetricCard({
        label: 'Repository Age',
        value: `${summary.repository.age} days`,
        icon: 'calendar',
        description: `Created ${summary.repository.age} days ago`
      })

      const html = repoCard.render()
      expect(html).toContain('metric-card')
      expect(html).toContain('Repository Age')
      expect(html).toContain(`${summary.repository.age} days`)

      // Contributors metrics
      const contributorCard = new MetricCard({
        label: 'Total Contributors',
        value: summary.contributors.total,
        icon: 'users',
        trend: {
          value: 12.5,
          direction: 'up'
        },
        description: `${summary.contributors.active} active in last 30 days`
      })

      const contributorHtml = contributorCard.render()
      expect(contributorHtml).toContain('Total Contributors')
      expect(contributorHtml).toContain('trend-up')
      expect(contributorHtml).toContain('12.5%')
    })

    it('should format large numbers correctly', () => {
      const card = new MetricCard({
        label: 'Lines of Code',
        value: mockAnalysisResult.currentState.totalLines,
        icon: 'code'
      })

      const html = card.render()
      expect(html).toContain('Lines of Code')
      // Should format large numbers (like 125000 -> 125K)
      if (mockAnalysisResult.currentState.totalLines >= 1000) {
        expect(html).toMatch(/\d+[\.,]\d*[KM]/)
      }
    })
  })

  describe('Time Range Integration', () => {
    it('should handle TimeRangeSlider with Phase 3 date ranges', () => {
      const commits = mockAnalysisResult.history.commits
      const firstCommit = commits[0]?.timestamp || new Date('2023-01-01')
      const lastCommit = commits[commits.length - 1]?.timestamp || new Date()

      const data: TimeRangeData = {
        min: firstCommit,
        max: lastCommit,
        current: {
          start: new Date(lastCommit.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          end: lastCommit
        }
      }

      let capturedRange: { start: Date; end: Date } | null = null
      const slider = new TimeRangeSlider(data, {
        onChange: (range) => { capturedRange = range }
      })

      const html = slider.render()
      expect(html).toContain('time-range-slider')
      expect(html).toContain('slider-handle')
      expect(html).toContain('preset-buttons')

      // Verify date formatting
      expect(html).toMatch(/\w+ \d{1,2}, \d{4}/) // Date format like "Jan 1, 2023"
    })
  })

  describe('Data Validation and Error Handling', () => {
    it('should handle malformed time series data', () => {
      const badData: GrowthChartData = {
        series: [
          {
            name: 'Test',
            data: [
              { x: NaN, y: 100 },
              { x: Date.now(), y: NaN },
              { x: Date.now() + 86400000, y: 200 }
            ]
          }
        ]
      }

      const chart = new GrowthChart(badData)
      
      // Should not throw
      expect(() => chart.renderStatic()).not.toThrow()
      expect(() => chart.toSVG()).not.toThrow()
    })

    it('should handle missing optional data fields', () => {
      const fileMetrics = new Map([
        ['test.js', {
          path: 'test.js',
          currentLines: 100,
          totalCommits: 10,
          totalChurn: 50,
          // complexity: undefined, // Missing optional field
          lastModified: new Date(),
          firstAppeared: new Date('2023-01-01'),
          contributors: new Set(['alice']),
          sizeBytes: 3000
        } as FileMetrics]
      ])

      // Should handle missing complexity gracefully
      const ranking = Array.from(fileMetrics.values())
      const data: TopFilesData = {
        tabs: [{
          id: 'complex',
          label: 'Complex Files',
          files: ranking.map(file => ({
            path: file.path,
            metric: file.complexity || 0,
            secondaryMetric: file.currentLines
          }))
        }]
      }

      const table = new TopFilesTable(data)
      expect(() => table.renderStatic()).not.toThrow()
    })

    it('should handle empty datasets', () => {
      const emptyResult: ExtendedAnalysisResult = {
        ...mockAnalysisResult,
        currentState: {
          ...mockAnalysisResult.currentState,
          fileMetrics: new Map(),
          contributors: new Map(),
          languages: new Map()
        },
        rankings: {
          largest: [],
          mostChurn: [],
          mostComplex: [],
          mostActive: [],
          hotspots: [],
          stale: [],
          recent: []
        }
      }

      // All components should handle empty data gracefully
      expect(() => {
        new GrowthChart({ series: [] }).renderStatic()
        new FileTypesPieChart({ series: [], labels: [] }).renderStatic()
        new ContributorBarChart({ 
          contributors: [], 
          metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }] 
        }).renderStatic()
        new TopFilesTable({ tabs: [] }).renderStatic()
      }).not.toThrow()
    })
  })

  describe('Performance with Large Datasets', () => {
    it('should handle large time series efficiently', () => {
      // Generate large dataset
      const largeTimeSeries = Array.from({ length: 1000 }, (_, i) => ({
        x: new Date('2023-01-01').getTime() + i * 86400000,
        y: Math.floor(Math.random() * 1000)
      }))

      const data: GrowthChartData = {
        series: [{ name: 'Large Series', data: largeTimeSeries }]
      }

      const start = performance.now()
      const chart = new GrowthChart(data)
      const html = chart.renderStatic()
      const end = performance.now()

      // Should render in reasonable time (< 100ms for 1000 points)
      expect(end - start).toBeLessThan(100)
      expect(html).toContain('growth-chart')
    })

    it('should handle many files in heatmap', () => {
      const manyFiles = Array.from({ length: 200 }, (_, i) => ({
        path: `src/file${i}.ts`,
        size: Math.floor(Math.random() * 1000) + 10,
        commits: Math.floor(Math.random() * 50) + 1,
        complexity: Math.floor(Math.random() * 20) + 1,
        contributors: [`user${i % 10}`],
        lastModified: new Date(),
        language: 'TypeScript',
        changeFrequency: Math.random() * 10
      }))

      const data: FileActivityHeatmapData = {
        files: manyFiles,
        colorMetric: 'commits'
      }

      const start = performance.now()
      const heatmap = new FileActivityHeatmap(data)
      const html = heatmap.renderStatic()
      const end = performance.now()

      // Should handle large datasets reasonably
      expect(end - start).toBeLessThan(200) // 200ms for 200 files
      expect(html).toContain('file-activity-heatmap')
    })
  })
})

/**
 * Create comprehensive mock analysis result for testing
 */
function createMockAnalysisResult(): ExtendedAnalysisResult {
  const now = new Date()
  const startDate = new Date('2023-01-01')
  
  // Create mock time series points
  const createTimeSeriesPoints = (startValue: number, growth: number): TimeSeriesPoint[] => {
    const points: TimeSeriesPoint[] = []
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate.getTime() + i * 30 * 24 * 60 * 60 * 1000) // Monthly
      points.push({
        date,
        value: Math.floor(startValue + i * growth + Math.random() * growth * 0.2),
        commitSha: `commit${i}`
      })
    }
    return points
  }

  // Create mock file metrics
  const fileMetrics = new Map<string, FileMetrics>([
    ['src/main.ts', {
      path: 'src/main.ts',
      currentLines: 500,
      totalCommits: 25,
      totalChurn: 1200,
      complexity: 15,
      lastModified: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      firstAppeared: new Date('2023-01-15'),
      contributors: new Set(['alice', 'bob']),
      language: 'TypeScript',
      sizeBytes: 15000
    }],
    ['src/utils.js', {
      path: 'src/utils.js',
      currentLines: 300,
      totalCommits: 18,
      totalChurn: 800,
      complexity: 8,
      lastModified: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      firstAppeared: new Date('2023-02-01'),
      contributors: new Set(['alice', 'charlie']),
      language: 'JavaScript',
      sizeBytes: 9000
    }],
    ['README.md', {
      path: 'README.md',
      currentLines: 150,
      totalCommits: 12,
      totalChurn: 300,
      lastModified: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      firstAppeared: new Date('2023-01-01'),
      contributors: new Set(['alice']),
      language: 'Markdown',
      sizeBytes: 4500
    }]
  ])

  // Create mock contributors
  const contributors = new Map<string, ContributorStats>([
    ['Alice Developer', {
      name: 'Alice Developer',
      email: 'alice@example.com',
      emails: new Set(['alice@example.com']),
      commits: 45,
      additions: 2500,
      deletions: 800,
      filesModified: new Set(['src/main.ts', 'src/utils.js', 'README.md']),
      firstCommit: new Date('2023-01-01'),
      lastCommit: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      activeDays: 85,
      impactScore: 0.8
    }],
    ['Bob Coder', {
      name: 'Bob Coder',
      email: 'bob@example.com',
      emails: new Set(['bob@example.com']),
      commits: 32,
      additions: 1800,
      deletions: 600,
      filesModified: new Set(['src/main.ts', 'src/api.ts']),
      firstCommit: new Date('2023-01-15'),
      lastCommit: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      activeDays: 58,
      impactScore: 0.6
    }]
  ])

  // Create mock language stats
  const languages = new Map([
    ['TypeScript', {
      language: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      fileCount: 8,
      lines: 3200,
      bytes: 96000,
      percentage: 64.0,
      color: '#3178c6'
    }],
    ['JavaScript', {
      language: 'JavaScript',
      extensions: ['.js', '.jsx'],
      fileCount: 5,
      lines: 1500,
      bytes: 45000,
      percentage: 30.0,
      color: '#f7df1e'
    }],
    ['Markdown', {
      language: 'Markdown',
      extensions: ['.md'],
      fileCount: 2,
      lines: 300,
      bytes: 9000,
      percentage: 6.0,
      color: '#083fa1'
    }]
  ])

  return {
    repository: {
      path: '/test/repo',
      name: 'test-repo',
      branch: 'main',
      remoteUrl: 'https://github.com/test/repo.git'
    },
    analyzedAt: now,
    config: {
      maxCommits: 1000,
      granularity: 'month'
    },
    timeSeries: {
      commits: {
        name: 'Commits',
        points: createTimeSeriesPoints(5, 8),
        type: 'line'
      },
      linesOfCode: {
        name: 'Lines of Code',
        points: createTimeSeriesPoints(500, 400),
        type: 'area'
      },
      contributors: {
        name: 'Contributors',
        points: createTimeSeriesPoints(1, 0.5),
        type: 'line'
      },
      fileCount: {
        name: 'Files',
        points: createTimeSeriesPoints(10, 5),
        type: 'line'
      },
      languages: new Map([
        ['TypeScript', {
          name: 'TypeScript',
          points: createTimeSeriesPoints(200, 200),
          type: 'area'
        }],
        ['JavaScript', {
          name: 'JavaScript',
          points: createTimeSeriesPoints(150, 100),
          type: 'area'
        }]
      ])
    },
    currentState: {
      totalLines: 5000,
      totalFiles: 15,
      totalBytes: 150000,
      fileMetrics,
      contributors,
      languages
    },
    history: {
      commits: [] // Would contain actual commit data
    },
    rankings: {
      largest: [
        { path: 'src/main.ts', lines: 500, lastModified: new Date() },
        { path: 'src/utils.js', lines: 300, lastModified: new Date() }
      ],
      mostChurn: [
        { path: 'src/main.ts', totalChanges: 1200, contributors: 2 },
        { path: 'src/utils.js', totalChanges: 800, contributors: 2 }
      ],
      mostComplex: [
        { path: 'src/main.ts', complexity: 15, lines: 500 },
        { path: 'src/utils.js', complexity: 8, lines: 300 }
      ],
      mostActive: [],
      hotspots: [],
      stale: [],
      recent: []
    },
    awards: {
      individual: new Map([["Alice Developer", ["Most Active Developer"]], ["Bob Coder", ["Top Contributor"]]]),
      team: [{ name: "Dream Team", members: ["Alice Developer", "Bob Coder"], award: "Best Collaboration" }]
    },
    wordCloud: {
      overall: new Map(),
      themed: new Map()
    },
    summary: {
      repository: {
        age: 365,
        velocity: 2.5,
        momentum: 1.2
      },
      files: {
        median: 250,
        average: 333,
        largest: 500,
        smallest: 50
      },
      contributors: {
        total: 2,
        active: 2,
        average: {
          commits: 38,
          additions: 2150,
          deletions: 700
        }
      }
    }
  } as ExtendedAnalysisResult
}