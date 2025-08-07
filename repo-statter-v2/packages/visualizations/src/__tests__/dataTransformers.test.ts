/**
 * Tests for data transformation utilities
 * @module @repo-statter/visualizations/__tests__/dataTransformers
 */

import { describe, it, expect } from 'vitest'
import {
  transformToGrowthChart,
  transformToCustomGrowthChart,
  transformToFileTypesPie,
  transformToContributorBarChart,
  transformToFileActivityHeatmap,
  transformToTopFilesTable,
  transformToMetricCards,
  transformToTimeRange,
  transformToLanguageTimeSeries,
  filterAnalysisByDateRange,
  calculatePercentageChange,
  formatTrendData,
  transformAllVisualizationData
} from '../utils/dataTransformers.js'
import type { ExtendedAnalysisResult } from '@repo-statter/core/analysis/analysis-orchestrator.js'
import type { AnalysisResult, FileMetrics, ContributorStats, TimeSeriesPoint } from '@repo-statter/core/types/analysis.js'

describe('Data Transformers', () => {
  // Create mock analysis result for testing
  const createMockAnalysisResult = (): ExtendedAnalysisResult => {
    const now = new Date()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const createTimeSeriesPoints = (baseValue: number, count: number = 5): TimeSeriesPoint[] => 
      Array.from({ length: count }, (_, i) => ({
        date: new Date(monthAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000), // Weekly points
        value: baseValue + i * 10,
        commitSha: `sha${i}`
      }))

    return {
      repository: {
        path: '/test/repo',
        name: 'test-repo',
        branch: 'main',
        remoteUrl: 'https://github.com/test/repo.git'
      },
      analyzedAt: now,
      config: { maxCommits: 1000 },
      timeSeries: {
        commits: {
          name: 'Commits',
          points: createTimeSeriesPoints(10),
          type: 'line'
        },
        linesOfCode: {
          name: 'Lines of Code',
          points: createTimeSeriesPoints(1000),
          type: 'area'
        },
        contributors: {
          name: 'Contributors',
          points: createTimeSeriesPoints(2),
          type: 'line'
        },
        fileCount: {
          name: 'Files',
          points: createTimeSeriesPoints(20),
          type: 'line'
        },
        languages: new Map([
          ['TypeScript', {
            name: 'TypeScript',
            points: createTimeSeriesPoints(600),
            type: 'area'
          }],
          ['JavaScript', {
            name: 'JavaScript', 
            points: createTimeSeriesPoints(400),
            type: 'area'
          }]
        ])
      },
      currentState: {
        totalLines: 1500,
        totalFiles: 25,
        totalBytes: 45000,
        fileMetrics: new Map([
          ['src/main.ts', {
            path: 'src/main.ts',
            currentLines: 500,
            totalCommits: 25,
            totalChurn: 1200,
            complexity: 15,
            lastModified: now,
            firstAppeared: monthAgo,
            contributors: new Set(['alice', 'bob']),
            language: 'TypeScript',
            sizeBytes: 15000
          } as FileMetrics],
          ['src/utils.js', {
            path: 'src/utils.js',
            currentLines: 300,
            totalCommits: 18,
            totalChurn: 800,
            lastModified: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            firstAppeared: monthAgo,
            contributors: new Set(['alice']),
            language: 'JavaScript',
            sizeBytes: 9000
          } as FileMetrics]
        ]),
        contributors: new Map([
          ['alice', {
            name: 'alice',
            email: 'alice@test.com',
            emails: new Set(['alice@test.com']),
            commits: 30,
            additions: 2000,
            deletions: 500,
            filesModified: new Set(['src/main.ts', 'src/utils.js']),
            firstCommit: monthAgo,
            lastCommit: now,
            activeDays: 20,
            impactScore: 0.8
          } as ContributorStats],
          ['bob', {
            name: 'bob',
            email: 'bob@test.com',
            emails: new Set(['bob@test.com']),
            commits: 15,
            additions: 1000,
            deletions: 200,
            filesModified: new Set(['src/main.ts']),
            firstCommit: monthAgo,
            lastCommit: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
            activeDays: 10,
            impactScore: 0.5
          } as ContributorStats]
        ]),
        languages: new Map([
          ['TypeScript', {
            language: 'TypeScript',
            extensions: ['.ts'],
            fileCount: 10,
            lines: 900,
            bytes: 27000,
            percentage: 60.0,
            color: '#3178c6'
          }],
          ['JavaScript', {
            language: 'JavaScript',
            extensions: ['.js'],
            fileCount: 15,
            lines: 600,
            bytes: 18000,
            percentage: 40.0,
            color: '#f7df1e'
          }]
        ])
      },
      history: {
        commits: [
          {
            sha: 'abc123',
            message: 'Initial commit',
            author: { name: 'alice', email: 'alice@test.com' },
            timestamp: monthAgo,
            stats: { insertions: 100, deletions: 0, filesChanged: 1, files: [] }
          },
          {
            sha: 'def456',
            message: 'Add feature',
            author: { name: 'bob', email: 'bob@test.com' },
            timestamp: now,
            stats: { insertions: 50, deletions: 10, filesChanged: 1, files: [] }
          }
        ]
      },
      rankings: {
        largest: [
          { path: 'src/main.ts', lines: 500, lastModified: now },
          { path: 'src/utils.js', lines: 300, lastModified: now }
        ],
        mostChurn: [
          { path: 'src/main.ts', totalChanges: 1200, contributors: 2 },
          { path: 'src/utils.js', totalChanges: 800, contributors: 1 }
        ],
        mostComplex: [
          { path: 'src/main.ts', complexity: 15, lines: 500 },
          { path: 'src/utils.js', complexity: 8, lines: 300 }
        ],
        mostActive: [],
        hotspots: [
          { path: 'src/main.ts', score: 0.85, recentCommits: 5 },
          { path: 'src/utils.js', score: 0.65, recentCommits: 3 }
        ],
        stale: [],
        recent: [
          { path: 'src/main.ts', lastModified: now, lines: 500 },
          { path: 'src/utils.js', lastModified: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), lines: 300 }
        ]
      },
      awards: {
        individual: new Map(),
        team: []
      },
      wordCloud: {
        overall: new Map(),
        themed: new Map()
      },
      summary: {
        repository: {
          age: 30,
          velocity: 1.5,
          momentum: 2.0
        },
        files: {
          median: 400,
          average: 400,
          largest: 500,
          smallest: 300
        },
        contributors: {
          total: 2,
          active: 2,
          average: {
            commits: 22,
            additions: 1500,
            deletions: 350
          }
        }
      }
    } as ExtendedAnalysisResult
  }

  let mockResult: ExtendedAnalysisResult

  beforeEach(() => {
    mockResult = createMockAnalysisResult()
  })

  describe('transformToGrowthChart', () => {
    it('should transform time series data correctly', () => {
      const result = transformToGrowthChart(mockResult)

      expect(result.series).toHaveLength(4) // lines, commits, contributors, files
      expect(result.series[0].name).toBe('Lines of Code')
      expect(result.series[1].name).toBe('Commits')
      expect(result.series[2].name).toBe('Contributors')
      expect(result.series[3].name).toBe('Files')

      // Check data point format
      const firstSeries = result.series[0]
      expect(firstSeries.data).toHaveLength(5)
      expect(firstSeries.data[0]).toHaveProperty('x')
      expect(firstSeries.data[0]).toHaveProperty('y')
      expect(typeof firstSeries.data[0].x).toBe('number') // timestamp
      expect(typeof firstSeries.data[0].y).toBe('number')
    })

    it('should handle empty time series', () => {
      const emptyResult = {
        ...mockResult,
        timeSeries: {
          commits: { name: 'Commits', points: [], type: 'line' as const },
          linesOfCode: { name: 'Lines', points: [], type: 'area' as const },
          contributors: { name: 'Contributors', points: [], type: 'line' as const },
          fileCount: { name: 'Files', points: [], type: 'line' as const },
          languages: new Map()
        }
      }

      const result = transformToGrowthChart(emptyResult)
      expect(result.series).toHaveLength(4)
      expect(result.series[0].data).toHaveLength(0)
    })
  })

  describe('transformToCustomGrowthChart', () => {
    it('should include only specified metrics', () => {
      const result = transformToCustomGrowthChart(mockResult, ['commits', 'contributors'])

      expect(result.series).toHaveLength(2)
      expect(result.series[0].name).toBe('Commits')
      expect(result.series[1].name).toBe('Contributors')
    })

    it('should handle invalid metrics gracefully', () => {
      const result = transformToCustomGrowthChart(mockResult, ['commits', 'invalid' as any])

      expect(result.series).toHaveLength(1)
      expect(result.series[0].name).toBe('Commits')
    })
  })

  describe('transformToFileTypesPie', () => {
    it('should transform language data to pie chart format', () => {
      const result = transformToFileTypesPie(mockResult)

      expect(result.series).toHaveLength(2)
      expect(result.labels).toHaveLength(2)
      expect(result.colors).toHaveLength(2)

      expect(result.labels).toContain('TypeScript')
      expect(result.labels).toContain('JavaScript')
      expect(result.colors).toContain('#3178c6')
      expect(result.colors).toContain('#f7df1e')

      // Should be sorted by lines (largest first)
      expect(result.series[0]).toBeGreaterThanOrEqual(result.series[1])
    })

    it('should handle empty language data', () => {
      const emptyResult = {
        ...mockResult,
        currentState: {
          ...mockResult.currentState,
          languages: new Map()
        }
      }

      const result = transformToFileTypesPie(emptyResult)
      expect(result.series).toHaveLength(0)
      expect(result.labels).toHaveLength(0)
      expect(result.colors).toHaveLength(0)
    })
  })

  describe('transformToContributorBarChart', () => {
    it('should transform contributor data correctly', () => {
      const result = transformToContributorBarChart(mockResult, 10, 'commits')

      expect(result.contributors).toHaveLength(2)
      expect(result.metrics).toHaveLength(4)

      const alice = result.contributors[0]
      expect(alice.name).toBe('alice')
      expect(alice.commits).toBe(30)
      expect(alice.linesAdded).toBe(2000)
      expect(alice.linesDeleted).toBe(500)
      expect(alice.filesChanged).toBe(2)
      expect(alice.avatar).toContain('alice')
    })

    it('should sort by specified metric', () => {
      const result = transformToContributorBarChart(mockResult, 10, 'additions')

      expect(result.metrics[1].key).toBe('linesAdded')
      // Should be sorted by additions (alice has more)
      expect(result.contributors[0].name).toBe('alice')
      expect(result.contributors[1].name).toBe('bob')
    })

    it('should respect limit parameter', () => {
      const result = transformToContributorBarChart(mockResult, 1, 'commits')

      expect(result.contributors).toHaveLength(1)
      expect(result.contributors[0].name).toBe('alice') // Top contributor
    })
  })

  describe('transformToFileActivityHeatmap', () => {
    it('should transform file metrics to heatmap format', () => {
      const result = transformToFileActivityHeatmap(mockResult, 'blue', 100)

      expect(result.files).toHaveLength(2)
      expect(result.colorMetric).toBe('commits')

      const file = result.files[0]
      expect(file).toHaveProperty('path')
      expect(file).toHaveProperty('size')
      expect(file).toHaveProperty('commits')
      expect(file).toHaveProperty('complexity')
      expect(file).toHaveProperty('contributors')
      expect(file).toHaveProperty('lastModified')
    })

    it('should filter out files with zero lines', () => {
      const modifiedResult = {
        ...mockResult,
        currentState: {
          ...mockResult.currentState,
          fileMetrics: new Map([
            ...mockResult.currentState.fileMetrics,
            ['empty.js', {
              path: 'empty.js',
              currentLines: 0, // Zero lines should be filtered out
              totalCommits: 5,
              totalChurn: 10,
              lastModified: new Date(),
              firstAppeared: new Date(),
              contributors: new Set(['alice']),
              sizeBytes: 0
            } as FileMetrics]
          ])
        }
      }

      const result = transformToFileActivityHeatmap(modifiedResult)
      expect(result.files).toHaveLength(2) // Should still be 2, empty file filtered
    })
  })

  describe('transformToTopFilesTable', () => {
    it('should create table with all default tabs', () => {
      const result = transformToTopFilesTable(mockResult)

      expect(result.tabs).toHaveLength(4) // largest, churn, complex, hotspots
      
      const tabIds = result.tabs.map(tab => tab.id)
      expect(tabIds).toContain('largest')
      expect(tabIds).toContain('churn')
      expect(tabIds).toContain('complex')
      expect(tabIds).toContain('hotspots')
    })

    it('should include only specified tabs', () => {
      const result = transformToTopFilesTable(mockResult, {
        includeTabs: ['largest', 'recent']
      })

      expect(result.tabs).toHaveLength(2)
      expect(result.tabs[0].id).toBe('largest')
      expect(result.tabs[1].id).toBe('recent')
    })

    it('should respect maxFiles limit', () => {
      const result = transformToTopFilesTable(mockResult, {
        maxFiles: 1
      })

      result.tabs.forEach(tab => {
        expect(tab.files.length).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('transformToMetricCards', () => {
    it('should create metric cards from summary data', () => {
      const result = transformToMetricCards(mockResult)

      expect(result).toHaveLength(6) // Total lines, files, contributors, age, velocity, languages
      
      const labels = result.map(card => card.label)
      expect(labels).toContain('Total Lines')
      expect(labels).toContain('Total Files')
      expect(labels).toContain('Contributors')
      expect(labels).toContain('Repository Age')
      expect(labels).toContain('Commit Velocity')
      expect(labels).toContain('Languages')
    })

    it('should include trend data for relevant metrics', () => {
      const contributorCard = transformToMetricCards(mockResult)
        .find(card => card.label === 'Contributors')

      expect(contributorCard?.trend).toBeDefined()
      expect(contributorCard?.trend?.direction).toBe('up') // All contributors are active
    })
  })

  describe('transformToTimeRange', () => {
    it('should create time range from commit history', () => {
      const result = transformToTimeRange(mockResult)

      expect(result.min).toBeInstanceOf(Date)
      expect(result.max).toBeInstanceOf(Date)
      expect(result.current.start).toBeInstanceOf(Date)
      expect(result.current.end).toBeInstanceOf(Date)

      expect(result.min.getTime()).toBeLessThanOrEqual(result.max.getTime())
      expect(result.current.start.getTime()).toBeGreaterThanOrEqual(result.min.getTime())
      expect(result.current.end.getTime()).toBeLessThanOrEqual(result.max.getTime())
    })

    it('should handle empty commit history', () => {
      const emptyResult = {
        ...mockResult,
        history: { commits: [] }
      }

      const result = transformToTimeRange(emptyResult)

      expect(result.min).toBeInstanceOf(Date)
      expect(result.max).toBeInstanceOf(Date)
      expect(result.min.getTime()).toBeLessThanOrEqual(result.max.getTime())
    })
  })

  describe('transformToLanguageTimeSeries', () => {
    it('should create language-specific time series', () => {
      const result = transformToLanguageTimeSeries(mockResult, ['TypeScript', 'JavaScript'])

      expect(result.series).toHaveLength(2)
      expect(result.series[0].name).toBe('TypeScript')
      expect(result.series[1].name).toBe('JavaScript')

      expect(result.series[0].data).toHaveLength(5) // 5 time points
      expect(result.series[1].data).toHaveLength(5)
    })

    it('should handle unspecified languages by selecting top 5', () => {
      const result = transformToLanguageTimeSeries(mockResult)

      expect(result.series).toHaveLength(2) // Only 2 languages in mock data
    })
  })

  describe('filterAnalysisByDateRange', () => {
    it('should filter data by date range', () => {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const result = filterAnalysisByDateRange(mockResult, weekAgo, now)

      // Should filter commits
      expect(result.history?.commits.length).toBeLessThanOrEqual(mockResult.history.commits.length)

      // Should filter time series points
      if (result.timeSeries) {
        const filteredPoints = result.timeSeries.commits.points
        filteredPoints.forEach(point => {
          expect(point.date.getTime()).toBeGreaterThanOrEqual(weekAgo.getTime())
          expect(point.date.getTime()).toBeLessThanOrEqual(now.getTime())
        })
      }
    })
  })

  describe('Utility Functions', () => {
    describe('calculatePercentageChange', () => {
      it('should calculate percentage change correctly', () => {
        expect(calculatePercentageChange(110, 100)).toBe(10)
        expect(calculatePercentageChange(90, 100)).toBe(-10)
        expect(calculatePercentageChange(100, 0)).toBe(100)
        expect(calculatePercentageChange(0, 0)).toBe(0)
      })
    })

    describe('formatTrendData', () => {
      it('should format trend data correctly', () => {
        const upTrend = formatTrendData(110, 100)
        expect(upTrend?.direction).toBe('up')
        expect(upTrend?.value).toBe(10)

        const downTrend = formatTrendData(90, 100)
        expect(downTrend?.direction).toBe('down')
        expect(downTrend?.value).toBe(10)

        const noChange = formatTrendData(100, 100)
        expect(noChange).toBeUndefined()

        const minimalChange = formatTrendData(100.5, 100)
        expect(minimalChange?.value).toBe(1) // 0.5% rounds to 1%
      })
    })
  })

  describe('transformAllVisualizationData', () => {
    it('should transform all visualization data types', () => {
      const result = transformAllVisualizationData(mockResult)

      expect(result).toHaveProperty('growthChart')
      expect(result).toHaveProperty('languageChart')
      expect(result).toHaveProperty('fileTypesPie')
      expect(result).toHaveProperty('contributorBar')
      expect(result).toHaveProperty('fileHeatmap')
      expect(result).toHaveProperty('topFilesTable')
      expect(result).toHaveProperty('metricCards')
      expect(result).toHaveProperty('timeRange')

      // Verify structure of each transformed data type
      expect(result.growthChart.series).toBeDefined()
      expect(result.fileTypesPie.series).toBeDefined()
      expect(result.contributorBar.contributors).toBeDefined()
      expect(result.fileHeatmap.files).toBeDefined()
      expect(result.topFilesTable.tabs).toBeDefined()
      expect(Array.isArray(result.metricCards)).toBe(true)
      expect(result.timeRange.min).toBeDefined()
    })

    it('should respect limit options', () => {
      const result = transformAllVisualizationData(mockResult, {
        contributorLimit: 1,
        fileLimit: 1,
        heatmapLimit: 1
      })

      expect(result.contributorBar.contributors).toHaveLength(1)
      expect(result.fileHeatmap.files).toHaveLength(1)
      result.topFilesTable.tabs.forEach(tab => {
        expect(tab.files.length).toBeLessThanOrEqual(1)
      })
    })
  })
})