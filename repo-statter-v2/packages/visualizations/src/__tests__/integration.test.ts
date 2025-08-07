/**
 * Integration tests for visualization components with Phase 3 analysis data
 * Tests data transformation, compatibility, and end-to-end functionality
 */

import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import { join } from 'path'

const PLAYGROUND_URL = 'http://localhost:5173'

// Sample Phase 3 analysis data format
const mockPhase3Data = {
  repository: {
    name: 'test-repo',
    path: '/path/to/repo',
    totalCommits: 1247,
    totalFiles: 245,
    totalContributors: 12,
    dateRange: {
      start: '2023-01-01T00:00:00Z',
      end: '2024-01-01T00:00:00Z'
    }
  },
  
  timeSeries: [
    {
      date: '2023-01-01T00:00:00Z',
      commits: 145,
      linesAdded: 2847,
      linesDeleted: 392,
      filesChanged: 23,
      contributors: 3
    },
    {
      date: '2023-02-01T00:00:00Z',
      commits: 189,
      linesAdded: 3254,
      linesDeleted: 567,
      filesChanged: 34,
      contributors: 4
    },
    {
      date: '2023-03-01T00:00:00Z',
      commits: 223,
      linesAdded: 4123,
      linesDeleted: 789,
      filesChanged: 42,
      contributors: 5
    }
    // ... more monthly data
  ],
  
  fileTypes: [
    { extension: 'ts', files: 89, linesOfCode: 25430, percentage: 45.2 },
    { extension: 'js', files: 45, linesOfCode: 12890, percentage: 22.9 },
    { extension: 'json', files: 23, linesOfCode: 5670, percentage: 10.1 },
    { extension: 'css', files: 18, linesOfCode: 4250, percentage: 7.5 },
    { extension: 'html', files: 12, linesOfCode: 3240, percentage: 5.7 },
    { extension: 'md', files: 8, linesOfCode: 1890, percentage: 3.4 }
  ],
  
  contributors: [
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      commits: 342,
      linesAdded: 8745,
      linesDeleted: 2134,
      filesChanged: 156,
      firstCommit: '2023-01-05T08:30:00Z',
      lastCommit: '2023-12-28T16:45:00Z'
    },
    {
      name: 'Bob Smith',
      email: 'bob@example.com',
      commits: 287,
      linesAdded: 6834,
      linesDeleted: 1923,
      filesChanged: 134,
      firstCommit: '2023-01-15T09:15:00Z',
      lastCommit: '2023-12-30T14:20:00Z'
    },
    {
      name: 'Carol Davis',
      email: 'carol@example.com',
      commits: 198,
      linesAdded: 4567,
      linesDeleted: 1245,
      filesChanged: 89,
      firstCommit: '2023-02-01T10:00:00Z',
      lastCommit: '2023-12-25T11:30:00Z'
    }
  ],
  
  hotspotFiles: [
    {
      path: 'src/components/Dashboard.tsx',
      commits: 45,
      contributors: 6,
      linesOfCode: 2456,
      complexity: 78,
      lastModified: '2023-12-29T15:30:00Z',
      changeFrequency: 8.2
    },
    {
      path: 'src/utils/dataProcessing.ts',
      commits: 38,
      contributors: 4,
      linesOfCode: 1890,
      complexity: 92,
      lastModified: '2023-12-27T10:15:00Z',
      changeFrequency: 7.1
    },
    {
      path: 'src/api/client.ts',
      commits: 32,
      contributors: 5,
      linesOfCode: 1654,
      complexity: 65,
      lastModified: '2023-12-28T12:45:00Z',
      changeFrequency: 6.8
    }
  ],
  
  largestFiles: [
    {
      path: 'src/components/MainDashboard.tsx',
      linesOfCode: 3245,
      complexity: 145,
      contributors: 8,
      lastModified: '2023-12-20T14:30:00Z'
    },
    {
      path: 'src/services/analytics.ts',
      linesOfCode: 2890,
      complexity: 120,
      contributors: 5,
      lastModified: '2023-12-22T16:20:00Z'
    },
    {
      path: 'src/types/repository.ts',
      linesOfCode: 2456,
      complexity: 85,
      contributors: 6,
      lastModified: '2023-12-25T09:15:00Z'
    }
  ],
  
  trends: {
    commitTrend: { value: 12.5, direction: 'up', period: '30d' },
    contributorTrend: { value: 3.2, direction: 'down', period: '30d' },
    complexityTrend: { value: 8.7, direction: 'up', period: '30d' },
    codeTrend: { value: 15.3, direction: 'up', period: '30d' }
  }
}

// Data transformation utilities (would be part of the visualization package)
function transformTimeSeriesData(timeSeries: typeof mockPhase3Data.timeSeries) {
  return {
    series: [
      {
        name: 'Commits',
        data: timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.commits
        })),
        color: '#008FFB'
      },
      {
        name: 'Lines of Code',
        data: timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.linesAdded - point.linesDeleted
        })),
        color: '#00E396',
        type: 'area'
      },
      {
        name: 'Files Changed',
        data: timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.filesChanged
        })),
        color: '#FEB019'
      }
    ]
  }
}

function transformFileTypesData(fileTypes: typeof mockPhase3Data.fileTypes) {
  return {
    series: fileTypes.map(ft => ft.linesOfCode),
    labels: fileTypes.map(ft => ft.extension.toUpperCase()),
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3']
  }
}

function transformMetricCardsData(data: typeof mockPhase3Data) {
  return [
    {
      label: 'Total Commits',
      value: data.repository.totalCommits,
      icon: 'commits',
      trend: data.trends.commitTrend,
      description: `${data.trends.commitTrend.direction === 'up' ? 'Increased' : 'Decreased'} by ${data.trends.commitTrend.value}% in the last ${data.trends.commitTrend.period}`
    },
    {
      label: 'Contributors',
      value: data.repository.totalContributors,
      icon: 'users',
      trend: data.trends.contributorTrend,
      description: `${data.trends.contributorTrend.direction === 'up' ? 'Increased' : 'Decreased'} by ${data.trends.contributorTrend.value}% in the last ${data.trends.contributorTrend.period}`
    },
    {
      label: 'Total Files',
      value: data.repository.totalFiles,
      icon: 'files',
      trend: data.trends.codeTrend,
      description: `${data.trends.codeTrend.direction === 'up' ? 'Increased' : 'Decreased'} by ${data.trends.codeTrend.value}% in the last ${data.trends.codeTrend.period}`
    }
  ]
}

function transformTopFilesData(data: typeof mockPhase3Data) {
  return {
    tabs: [
      {
        id: 'largest',
        label: 'Largest Files',
        files: data.largestFiles.map(file => ({
          path: file.path,
          metric: file.linesOfCode,
          secondaryMetric: file.contributors,
          contributors: []
        }))
      },
      {
        id: 'hotspots',
        label: 'Hotspot Files',
        files: data.hotspotFiles.map(file => ({
          path: file.path,
          metric: Math.round(file.changeFrequency * 10), // Convert to score
          secondaryMetric: file.commits,
          contributors: []
        }))
      },
      {
        id: 'complex',
        label: 'Most Complex',
        files: [...data.largestFiles, ...data.hotspotFiles]
          .sort((a, b) => b.complexity - a.complexity)
          .slice(0, 10)
          .map(file => ({
            path: file.path,
            metric: file.complexity,
            secondaryMetric: file.linesOfCode,
            contributors: []
          }))
      }
    ]
  }
}

test.describe('Integration Tests with Phase 3 Data', () => {
  test.describe('Data Transformation', () => {
    test('should transform time series data correctly', async ({ page }) => {
      const transformedData = transformTimeSeriesData(mockPhase3Data.timeSeries)
      
      expect(transformedData.series).toHaveLength(3)
      expect(transformedData.series[0].name).toBe('Commits')
      expect(transformedData.series[0].data).toHaveLength(3)
      expect(transformedData.series[0].data[0]).toEqual({
        x: new Date('2023-01-01T00:00:00Z').getTime(),
        y: 145
      })
      
      // Test in browser with real data
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      // Inject transformed data
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'growth-chart', newData: data }
        })
        window.dispatchEvent(event)
      }, transformedData)
      
      await page.waitForTimeout(1000)
      
      // Verify chart updated
      const chart = page.locator('.growth-chart')
      await expect(chart).toBeVisible()
      
      // Check if ApexCharts rendered
      const apexCanvas = chart.locator('.apexcharts-canvas, canvas')
      const canvasCount = await apexCanvas.count()
      
      if (canvasCount > 0) {
        // Chart loaded successfully
        await expect(apexCanvas.first()).toBeVisible()
      } else {
        // Fallback table should be visible
        const fallbackTable = chart.locator('table, noscript')
        await expect(fallbackTable.first()).toBeVisible()
      }
    })

    test('should transform file types data correctly', async ({ page }) => {
      const transformedData = transformFileTypesData(mockPhase3Data.fileTypes)
      
      expect(transformedData.series).toHaveLength(6)
      expect(transformedData.labels).toEqual(['TS', 'JS', 'JSON', 'CSS', 'HTML', 'MD'])
      expect(transformedData.series[0]).toBe(25430) // TypeScript LOC
      
      // Test in browser
      await page.goto(`${PLAYGROUND_URL}?component=file-types-pie`)
      await page.waitForSelector('.file-types-chart')
      
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'file-types-pie', newData: data }
        })
        window.dispatchEvent(event)
      }, transformedData)
      
      await page.waitForTimeout(1000)
      
      // Verify legend shows correct data
      const legend = page.locator('.pie-legend')
      await expect(legend).toBeVisible()
      
      const legendItems = legend.locator('li')
      await expect(legendItems).toHaveCount(6)
      
      // Check first item
      const firstItem = legendItems.first()
      await expect(firstItem).toContainText('TS')
      await expect(firstItem).toContainText('25,430')
    })

    test('should transform metric cards data correctly', async ({ page }) => {
      const transformedData = transformMetricCardsData(mockPhase3Data)
      
      expect(transformedData).toHaveLength(3)
      expect(transformedData[0].label).toBe('Total Commits')
      expect(transformedData[0].value).toBe(1247)
      expect(transformedData[0].trend?.direction).toBe('up')
      
      // Test in browser
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'metric-card', newData: data }
        })
        window.dispatchEvent(event)
      }, transformedData)
      
      await page.waitForTimeout(2000) // Allow for animations
      
      // Verify cards rendered
      const cards = page.locator('.metric-card')
      await expect(cards).toHaveCount(3)
      
      // Check first card content
      const firstCard = cards.first()
      await expect(firstCard).toContainText('Total Commits')
      await expect(firstCard).toContainText('1,247')
      
      // Check trend indicator
      const trendUp = firstCard.locator('.trend-up')
      await expect(trendUp).toBeVisible()
      await expect(trendUp).toContainText('12.5%')
    })

    test('should transform top files data correctly', async ({ page }) => {
      const transformedData = transformTopFilesData(mockPhase3Data)
      
      expect(transformedData.tabs).toHaveLength(3)
      expect(transformedData.tabs[0].id).toBe('largest')
      expect(transformedData.tabs[0].files).toHaveLength(3)
      
      // Test in browser
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'top-files-table', newData: data }
        })
        window.dispatchEvent(event)
      }, transformedData)
      
      await page.waitForTimeout(500)
      
      // Verify tabs rendered
      const tabs = page.locator('.tab-button')
      await expect(tabs).toHaveCount(3)
      
      // Check tab labels
      await expect(tabs.nth(0)).toContainText('Largest Files')
      await expect(tabs.nth(1)).toContainText('Hotspot Files')
      await expect(tabs.nth(2)).toContainText('Most Complex')
      
      // Check table content
      const activeTable = page.locator('.table-panel.active table')
      const rows = activeTable.locator('tbody tr')
      await expect(rows).toHaveCount(3)
      
      // Check first row
      const firstRow = rows.first()
      await expect(firstRow).toContainText('MainDashboard.tsx')
      await expect(firstRow).toContainText('3,245')
    })
  })

  test.describe('End-to-End Data Flow', () => {
    test('should handle complete repository analysis data', async ({ page }) => {
      // Transform all data types
      const growthData = transformTimeSeriesData(mockPhase3Data.timeSeries)
      const pieData = transformFileTypesData(mockPhase3Data.fileTypes)
      const metricData = transformMetricCardsData(mockPhase3Data)
      const tableData = transformTopFilesData(mockPhase3Data)
      
      // Test growth chart
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      await page.evaluate((data) => {
        window.testData = data
      }, { growthData, pieData, metricData, tableData })
      
      // Navigate through all components
      const components = ['growth-chart', 'file-types-pie', 'metric-card', 'top-files-table']
      
      for (const component of components) {
        await page.goto(`${PLAYGROUND_URL}?component=${component}`)
        await page.waitForSelector(`.${component.replace('-', '-')}`, { timeout: 5000 })
        
        // Verify component loaded without errors
        const errors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.error, [data-error]')
          return Array.from(errorElements).map(el => el.textContent)
        })
        
        expect(errors).toHaveLength(0)
        
        // Take screenshot for visual comparison
        const component_el = page.locator(`.component-demo`)
        await expect(component_el).toBeVisible()
      }
    })

    test('should handle date range filtering', async ({ page }) => {
      const timeRangeData = {
        min: new Date(mockPhase3Data.repository.dateRange.start),
        max: new Date(mockPhase3Data.repository.dateRange.end),
        current: {
          start: new Date('2023-06-01'),
          end: new Date('2023-12-01')
        }
      }
      
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Test date range matches repository data
      const minTime = timeRangeData.min.getTime()
      const maxTime = timeRangeData.max.getTime()
      
      const slider = page.locator('.time-range-slider')
      const dataMin = await slider.getAttribute('data-min')
      const dataMax = await slider.getAttribute('data-max')
      
      expect(parseInt(dataMin!)).toBe(minTime)
      expect(parseInt(dataMax!)).toBe(maxTime)
    })

    test('should integrate with contributor data', async ({ page }) => {
      // Transform contributor data for bar chart (if we had one)
      const contributorData = mockPhase3Data.contributors.map(contributor => ({
        name: contributor.name,
        commits: contributor.commits,
        linesAdded: contributor.linesAdded,
        filesChanged: contributor.filesChanged
      }))
      
      expect(contributorData).toHaveLength(3)
      expect(contributorData[0].name).toBe('Alice Johnson')
      expect(contributorData[0].commits).toBe(342)
      
      // This would be used with a contributor bar chart component
      const transformedForChart = {
        series: [{
          name: 'Commits',
          data: contributorData.map(c => c.commits)
        }],
        categories: contributorData.map(c => c.name.split(' ')[0]) // First names
      }
      
      expect(transformedForChart.series[0].data).toEqual([342, 287, 198])
      expect(transformedForChart.categories).toEqual(['Alice', 'Bob', 'Carol'])
    })
  })

  test.describe('Error Handling', () => {
    test('should handle missing data gracefully', async ({ page }) => {
      const incompleteData = {
        series: [], // Empty series
        categories: []
      }
      
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'growth-chart', newData: data }
        })
        window.dispatchEvent(event)
      }, incompleteData)
      
      await page.waitForTimeout(1000)
      
      // Should not show errors, but handle gracefully
      const errors = page.locator('.error')
      await expect(errors).toHaveCount(0)
      
      // Chart should still be present
      const chart = page.locator('.growth-chart')
      await expect(chart).toBeVisible()
    })

    test('should validate data format', async ({ page }) => {
      const invalidData = {
        series: "not an array", // Invalid format
        labels: null
      }
      
      await page.goto(`${PLAYGROUND_URL}?component=file-types-pie`)
      await page.waitForSelector('.file-types-chart')
      
      // Should handle invalid data without crashing
      await page.evaluate((data) => {
        try {
          const event = new CustomEvent('updateChart', {
            detail: { type: 'file-types-pie', newData: data }
          })
          window.dispatchEvent(event)
        } catch (e) {
          console.warn('Data validation error:', e)
        }
      }, invalidData)
      
      await page.waitForTimeout(1000)
      
      // Page should still be functional
      const chart = page.locator('.file-types-chart')
      await expect(chart).toBeVisible()
    })
  })

  test.describe('Performance with Real Data', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Generate large dataset similar to what Phase 3 might produce
      const largeDateSet = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2023, 0, 1 + i).toISOString(),
        commits: Math.floor(Math.random() * 50),
        linesAdded: Math.floor(Math.random() * 2000),
        linesDeleted: Math.floor(Math.random() * 500),
        filesChanged: Math.floor(Math.random() * 20),
        contributors: Math.floor(Math.random() * 10) + 1
      }))
      
      const largeGrowthData = transformTimeSeriesData(largeDateSet)
      
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      // Measure performance
      const startTime = await page.evaluate(() => performance.now())
      
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'growth-chart', newData: data }
        })
        window.dispatchEvent(event)
      }, largeGrowthData)
      
      await page.waitForTimeout(3000) // Allow time for rendering
      
      const endTime = await page.evaluate(() => performance.now())
      const renderTime = endTime - startTime
      
      // Should render within reasonable time (less than 3 seconds)
      expect(renderTime).toBeLessThan(3000)
      
      // Chart should be visible and functional
      const chart = page.locator('.growth-chart')
      await expect(chart).toBeVisible()
    })
  })
})