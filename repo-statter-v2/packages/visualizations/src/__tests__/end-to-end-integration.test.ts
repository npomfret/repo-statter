/**
 * End-to-end integration test demonstrating complete Phase 3 → Phase 4 workflow
 * Tests the full pipeline from analysis results to rendered visualizations
 * @module @repo-statter/visualizations/__tests__/end-to-end-integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { transformAllVisualizationData } from '../utils/dataTransformers.js'
import { ComponentRegistry } from '../registry.js'
import type { ExtendedAnalysisResult } from '@repo-statter/core/analysis/analysis-orchestrator.js'

describe('End-to-End Phase 3 → Phase 4 Integration', () => {
  let mockAnalysisResult: ExtendedAnalysisResult

  beforeEach(() => {
    mockAnalysisResult = createRealisticAnalysisResult()
  })

  it('should demonstrate complete workflow from analysis to rendered visualizations', () => {
    // Step 1: Transform Phase 3 analysis results to visualization data
    const visualizationData = transformAllVisualizationData(mockAnalysisResult, {
      contributorLimit: 5,
      fileLimit: 10,
      heatmapLimit: 50
    })

    // Verify all visualization data types are transformed
    expect(visualizationData).toHaveProperty('growthChart')
    expect(visualizationData).toHaveProperty('languageChart')
    expect(visualizationData).toHaveProperty('fileTypesPie')
    expect(visualizationData).toHaveProperty('contributorBar')
    expect(visualizationData).toHaveProperty('fileHeatmap')
    expect(visualizationData).toHaveProperty('topFilesTable')
    expect(visualizationData).toHaveProperty('metricCards')
    expect(visualizationData).toHaveProperty('timeRange')

    // Step 2: Render all visualization components
    const renderedComponents = {
      growthChart: ComponentRegistry.renderComponent('growth-chart', visualizationData.growthChart),
      fileTypesPie: ComponentRegistry.renderComponent('file-types-pie', visualizationData.fileTypesPie),
      contributorBar: ComponentRegistry.renderComponent('contributor-bar', visualizationData.contributorBar),
      fileHeatmap: ComponentRegistry.renderComponent('file-activity-heatmap', visualizationData.fileHeatmap),
      topFilesTable: ComponentRegistry.renderComponent('top-files-table', visualizationData.topFilesTable),
      timeSlider: ComponentRegistry.renderComponent('time-slider', visualizationData.timeRange)
    }

    // Step 3: Verify all components render successfully
    Object.entries(renderedComponents).forEach(([name, result]) => {
      expect(result.html, `${name} should render HTML`).toBeTruthy()
      expect(result.html.length, `${name} HTML should have content`).toBeGreaterThan(100)
      expect(result.component, `${name} should return component instance`).toBeDefined()
    })

    // Step 4: Verify specific component content
    expect(renderedComponents.growthChart.html).toContain('growth-chart')
    expect(renderedComponents.fileTypesPie.html).toContain('file-types-chart')
    expect(renderedComponents.contributorBar.html).toContain('contributor-bar-chart')
    expect(renderedComponents.fileHeatmap.html).toContain('file-activity-heatmap')
    expect(renderedComponents.topFilesTable.html).toContain('top-files-table')
    expect(renderedComponents.timeSlider.html).toContain('time-range-slider')

    // Step 5: Verify metric cards render individually
    visualizationData.metricCards.forEach((metricData, index) => {
      const metricCard = ComponentRegistry.renderComponent('metric-card', metricData)
      expect(metricCard.html).toContain('metric-card')
      expect(metricCard.html).toContain(metricData.label)
    })
  })

  it('should handle realistic repository data volumes', () => {
    // Create large dataset simulation
    const largeAnalysisResult = createLargeRepositoryAnalysisResult()

    const startTime = performance.now()
    const visualizationData = transformAllVisualizationData(largeAnalysisResult)
    const transformTime = performance.now() - startTime

    // Should transform large datasets in reasonable time
    expect(transformTime).toBeLessThan(100) // 100ms

    // Verify data structure integrity
    expect(visualizationData.growthChart.series[0].data.length).toBe(12) // Monthly data for 1 year
    expect(visualizationData.contributorBar.contributors.length).toBeLessThanOrEqual(10) // Respects limit
    expect(visualizationData.fileHeatmap.files.length).toBeLessThanOrEqual(100) // Respects limit
    expect(visualizationData.topFilesTable.tabs.length).toBeGreaterThan(0)

    // Test rendering performance
    const renderStartTime = performance.now()
    const growthChart = ComponentRegistry.renderComponent('growth-chart', visualizationData.growthChart)
    const renderTime = performance.now() - renderStartTime

    expect(renderTime).toBeLessThan(50) // 50ms for rendering
    expect(growthChart.html).toContain('growth-chart')
  })

  it('should demonstrate data filtering and time range integration', () => {
    const timeRange = transformAllVisualizationData(mockAnalysisResult).timeRange
    
    // Verify time range structure
    expect(timeRange.min).toBeInstanceOf(Date)
    expect(timeRange.max).toBeInstanceOf(Date)
    expect(timeRange.current.start).toBeInstanceOf(Date)
    expect(timeRange.current.end).toBeInstanceOf(Date)

    // Verify logical time ordering
    expect(timeRange.min.getTime()).toBeLessThanOrEqual(timeRange.current.start.getTime())
    expect(timeRange.current.start.getTime()).toBeLessThanOrEqual(timeRange.current.end.getTime())
    expect(timeRange.current.end.getTime()).toBeLessThanOrEqual(timeRange.max.getTime())

    // Render time slider
    const timeSlider = ComponentRegistry.renderComponent('time-slider', timeRange)
    expect(timeSlider.html).toContain('time-range-slider')
    expect(timeSlider.html).toContain('preset-buttons')
    expect(timeSlider.html).toContain('slider-handle')
  })

  it('should validate component accessibility and structure', () => {
    const visualizationData = transformAllVisualizationData(mockAnalysisResult)

    // Test each component type for accessibility
    const accessibilityTests = [
      {
        type: 'top-files-table',
        data: visualizationData.topFilesTable,
        expectedAria: ['role="tablist"', 'role="tab"', 'role="tabpanel"']
      },
      {
        type: 'time-slider',
        data: visualizationData.timeRange,
        expectedAria: ['role="slider"', 'aria-label', 'aria-valuemin', 'aria-valuemax']
      }
    ]

    accessibilityTests.forEach(test => {
      const result = ComponentRegistry.renderComponent(test.type as any, test.data)
      
      test.expectedAria.forEach(ariaAttribute => {
        expect(result.html).toContain(ariaAttribute)
      })
    })

    // Test growth chart SVG accessibility
    const growthChart = ComponentRegistry.renderComponent('growth-chart', visualizationData.growthChart)
    expect(growthChart.html).toMatch(/role="img"/)
    expect(growthChart.html).toMatch(/aria-label/)
  })

  it('should handle edge cases and data validation', () => {
    const edgeCaseData: ExtendedAnalysisResult = {
      ...mockAnalysisResult,
      currentState: {
        ...mockAnalysisResult.currentState,
        fileMetrics: new Map(), // Empty
        contributors: new Map(), // Empty
        languages: new Map() // Empty
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

    // Should handle empty data without errors
    expect(() => {
      const visualizationData = transformAllVisualizationData(edgeCaseData)
      
      // Attempt to render each component type
      ComponentRegistry.renderComponent('growth-chart', visualizationData.growthChart)
      ComponentRegistry.renderComponent('file-types-pie', visualizationData.fileTypesPie)
      ComponentRegistry.renderComponent('contributor-bar', visualizationData.contributorBar)
      ComponentRegistry.renderComponent('top-files-table', visualizationData.topFilesTable)
    }).not.toThrow()
  })

  it('should demonstrate component interoperability', () => {
    const visualizationData = transformAllVisualizationData(mockAnalysisResult)

    // Create a complete dashboard HTML structure
    const dashboardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Repository Analysis Dashboard</title>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .full-width { grid-column: span 2; }
          .component { border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>Repository Analysis Dashboard</h1>
        <div class="dashboard">
          <div class="component full-width">
            <h2>Growth Over Time</h2>
            ${ComponentRegistry.renderComponent('growth-chart', visualizationData.growthChart).html}
          </div>
          
          <div class="component">
            <h2>Language Distribution</h2>
            ${ComponentRegistry.renderComponent('file-types-pie', visualizationData.fileTypesPie).html}
          </div>
          
          <div class="component">
            <h2>Top Contributors</h2>
            ${ComponentRegistry.renderComponent('contributor-bar', visualizationData.contributorBar).html}
          </div>
          
          <div class="component full-width">
            <h2>File Activity</h2>
            ${ComponentRegistry.renderComponent('file-activity-heatmap', visualizationData.fileHeatmap).html}
          </div>
          
          <div class="component full-width">
            <h2>Top Files</h2>
            ${ComponentRegistry.renderComponent('top-files-table', visualizationData.topFilesTable).html}
          </div>
          
          <div class="component full-width">
            <h2>Time Range Filter</h2>
            ${ComponentRegistry.renderComponent('time-slider', visualizationData.timeRange).html}
          </div>
        </div>
      </body>
      </html>
    `

    // Verify complete dashboard structure
    expect(dashboardHtml).toContain('<!DOCTYPE html>')
    expect(dashboardHtml).toContain('growth-chart')
    expect(dashboardHtml).toContain('file-types-chart')
    expect(dashboardHtml).toContain('contributor-bar-chart')
    expect(dashboardHtml).toContain('file-activity-heatmap')
    expect(dashboardHtml).toContain('top-files-table')
    expect(dashboardHtml).toContain('time-range-slider')

    // Verify HTML is well-formed
    expect(dashboardHtml).not.toContain('<div><div>') // No empty nested divs
    expect(dashboardHtml.match(/<div/g)?.length).toEqual(dashboardHtml.match(/<\/div>/g)?.length)
  })
})

/**
 * Create realistic analysis result for testing
 */
function createRealisticAnalysisResult(): ExtendedAnalysisResult {
  const now = new Date()
  const startDate = new Date('2023-01-01')

  // Create monthly time series data for a full year
  const createMonthlyTimeSeries = (startValue: number, growth: number) => {
    const points = []
    for (let month = 0; month < 12; month++) {
      const date = new Date(2023, month, 1)
      const noise = (Math.random() - 0.5) * growth * 0.2
      points.push({
        date,
        value: Math.floor(startValue + month * growth + noise),
        commitSha: `commit${month}`
      })
    }
    return points
  }

  return {
    repository: {
      path: '/test/realistic-repo',
      name: 'realistic-repo',
      branch: 'main',
      remoteUrl: 'https://github.com/test/realistic-repo.git'
    },
    analyzedAt: now,
    config: { maxCommits: 5000, granularity: 'month' },
    timeSeries: {
      commits: {
        name: 'Commits',
        points: createMonthlyTimeSeries(50, 25),
        type: 'line'
      },
      linesOfCode: {
        name: 'Lines of Code',
        points: createMonthlyTimeSeries(5000, 2000),
        type: 'area'
      },
      contributors: {
        name: 'Contributors',
        points: createMonthlyTimeSeries(5, 2),
        type: 'line'
      },
      fileCount: {
        name: 'Files',
        points: createMonthlyTimeSeries(100, 20),
        type: 'line'
      },
      languages: new Map([
        ['TypeScript', {
          name: 'TypeScript',
          points: createMonthlyTimeSeries(3000, 1200),
          type: 'area'
        }],
        ['JavaScript', {
          name: 'JavaScript',
          points: createMonthlyTimeSeries(1500, 600),
          type: 'area'
        }],
        ['CSS', {
          name: 'CSS',
          points: createMonthlyTimeSeries(500, 200),
          type: 'area'
        }]
      ])
    },
    currentState: {
      totalLines: 25000,
      totalFiles: 340,
      totalBytes: 1250000,
      fileMetrics: new Map([
        ['src/app.tsx', {
          path: 'src/app.tsx',
          currentLines: 850,
          totalCommits: 45,
          totalChurn: 2200,
          complexity: 25,
          lastModified: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          firstAppeared: startDate,
          contributors: new Set(['alice', 'bob', 'charlie']),
          language: 'TypeScript',
          sizeBytes: 32000
        }],
        ['src/utils/helpers.ts', {
          path: 'src/utils/helpers.ts',
          currentLines: 650,
          totalCommits: 32,
          totalChurn: 1800,
          complexity: 18,
          lastModified: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          firstAppeared: new Date('2023-02-15'),
          contributors: new Set(['alice', 'dave']),
          language: 'TypeScript',
          sizeBytes: 24500
        }]
      ]),
      contributors: new Map([
        ['Alice', {
          name: 'Alice',
          email: 'alice@company.com',
          emails: new Set(['alice@company.com']),
          commits: 150,
          additions: 8500,
          deletions: 2100,
          filesModified: new Set(['src/app.tsx', 'src/utils/helpers.ts']),
          firstCommit: startDate,
          lastCommit: now,
          activeDays: 120,
          impactScore: 0.85
        }],
        ['Bob', {
          name: 'Bob',
          email: 'bob@company.com',
          emails: new Set(['bob@company.com']),
          commits: 98,
          additions: 5200,
          deletions: 1400,
          filesModified: new Set(['src/app.tsx']),
          firstCommit: new Date('2023-03-01'),
          lastCommit: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          activeDays: 85,
          impactScore: 0.72
        }]
      ]),
      languages: new Map([
        ['TypeScript', {
          language: 'TypeScript',
          extensions: ['.ts', '.tsx'],
          fileCount: 150,
          lines: 15000,
          bytes: 750000,
          percentage: 60.0,
          color: '#3178c6'
        }],
        ['JavaScript', {
          language: 'JavaScript',
          extensions: ['.js', '.jsx'],
          fileCount: 100,
          lines: 7500,
          bytes: 375000,
          percentage: 30.0,
          color: '#f7df1e'
        }],
        ['CSS', {
          language: 'CSS',
          extensions: ['.css', '.scss'],
          fileCount: 90,
          lines: 2500,
          bytes: 125000,
          percentage: 10.0,
          color: '#1572b6'
        }]
      ])
    },
    history: {
      commits: [
        {
          sha: 'abc123',
          message: 'Initial project setup',
          author: { name: 'Alice', email: 'alice@company.com' },
          timestamp: startDate,
          stats: { insertions: 500, deletions: 0, filesChanged: 10, files: [] }
        },
        {
          sha: 'def456',
          message: 'Add core functionality',
          author: { name: 'Bob', email: 'bob@company.com' },
          timestamp: new Date('2023-06-15'),
          stats: { insertions: 300, deletions: 50, filesChanged: 5, files: [] }
        }
      ]
    },
    rankings: {
      largest: [
        { path: 'src/app.tsx', lines: 850, lastModified: now },
        { path: 'src/utils/helpers.ts', lines: 650, lastModified: now }
      ],
      mostChurn: [
        { path: 'src/app.tsx', totalChanges: 2200, contributors: 3 },
        { path: 'src/utils/helpers.ts', totalChanges: 1800, contributors: 2 }
      ],
      mostComplex: [
        { path: 'src/app.tsx', complexity: 25, lines: 850 },
        { path: 'src/utils/helpers.ts', complexity: 18, lines: 650 }
      ],
      mostActive: [],
      hotspots: [],
      stale: [],
      recent: []
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
        age: 365,
        velocity: 3.2,
        momentum: 4.1
      },
      files: {
        median: 400,
        average: 425,
        largest: 850,
        smallest: 15
      },
      contributors: {
        total: 2,
        active: 2,
        average: {
          commits: 124,
          additions: 6850,
          deletions: 1750
        }
      }
    }
  } as ExtendedAnalysisResult
}

/**
 * Create large repository analysis result for performance testing
 */
function createLargeRepositoryAnalysisResult(): ExtendedAnalysisResult {
  const base = createRealisticAnalysisResult()
  
  // Scale up the data
  return {
    ...base,
    currentState: {
      ...base.currentState,
      totalLines: 500000, // 500K lines
      totalFiles: 5000, // 5K files
      fileMetrics: new Map(
        Array.from({ length: 1000 }, (_, i) => [
          `src/module${i}/file${i}.ts`,
          {
            path: `src/module${i}/file${i}.ts`,
            currentLines: Math.floor(Math.random() * 500) + 50,
            totalCommits: Math.floor(Math.random() * 20) + 1,
            totalChurn: Math.floor(Math.random() * 1000) + 100,
            complexity: Math.floor(Math.random() * 15) + 1,
            lastModified: new Date(),
            firstAppeared: new Date('2023-01-01'),
            contributors: new Set([`user${i % 20}`]),
            language: ['TypeScript', 'JavaScript', 'CSS'][i % 3],
            sizeBytes: Math.floor(Math.random() * 20000) + 1000
          }
        ])
      ),
      contributors: new Map(
        Array.from({ length: 50 }, (_, i) => [
          `Developer${i}`,
          {
            name: `Developer${i}`,
            email: `dev${i}@company.com`,
            emails: new Set([`dev${i}@company.com`]),
            commits: Math.floor(Math.random() * 100) + 10,
            additions: Math.floor(Math.random() * 5000) + 500,
            deletions: Math.floor(Math.random() * 2000) + 100,
            filesModified: new Set([`file${i}.ts`]),
            firstCommit: new Date('2023-01-01'),
            lastCommit: new Date(),
            activeDays: Math.floor(Math.random() * 300) + 30,
            impactScore: Math.random() * 0.8 + 0.2
          }
        ])
      )
    },
    summary: {
      ...base.summary,
      contributors: {
        total: 50,
        active: 35,
        average: {
          commits: 55,
          additions: 2750,
          deletions: 1050
        }
      }
    }
  }
}