/**
 * Visual regression tests for visualization components
 * Uses Playwright for browser testing and screenshot comparison
 */

import { test, expect, Page } from '@playwright/test'
import { promises as fs } from 'fs'
import { join } from 'path'

const PLAYGROUND_URL = 'http://localhost:5173'

// Test data generators
const testData = {
  growthChart: {
    series: [
      {
        name: 'Commits',
        data: Array.from({ length: 12 }, (_, i) => ({
          x: new Date(2023, i, 1).getTime(),
          y: Math.floor(50 + Math.random() * 100 + i * 10)
        }))
      },
      {
        name: 'Lines of Code',
        data: Array.from({ length: 12 }, (_, i) => ({
          x: new Date(2023, i, 1).getTime(),
          y: Math.floor(1000 + Math.random() * 2000 + i * 200)
        }))
      }
    ]
  },

  fileTypesPie: {
    series: [25000, 15000, 10000, 8000, 5000, 3000],
    labels: ['TypeScript', 'JavaScript', 'JSON', 'CSS', 'HTML', 'Markdown'],
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3']
  },

  metricCards: [
    {
      label: 'Total Commits',
      value: 2485,
      icon: 'commits',
      trend: { value: 12.5, direction: 'up' as const },
      description: 'Commits in the last 30 days'
    },
    {
      label: 'Contributors',
      value: 23,
      icon: 'users',
      trend: { value: 8.3, direction: 'down' as const },
      description: 'Active contributors this month'
    },
    {
      label: 'Lines of Code',
      value: 125000,
      icon: 'code',
      description: 'Total lines across all files'
    }
  ],

  topFilesTable: {
    tabs: [
      {
        id: 'largest',
        label: 'Largest Files',
        files: [
          { path: 'src/components/MainDashboard.tsx', metric: 2450, secondaryMetric: 15 },
          { path: 'src/utils/dataProcessing.ts', metric: 1890, secondaryMetric: 8 },
          { path: 'src/api/repositories.ts', metric: 1654, secondaryMetric: 12 },
          { path: 'src/components/charts/GrowthChart.tsx', metric: 1420, secondaryMetric: 6 },
          { path: 'src/types/analytics.ts', metric: 1200, secondaryMetric: 3 }
        ]
      },
      {
        id: 'churn',
        label: 'Most Changed',
        files: [
          { path: 'src/config/api.ts', metric: 245, secondaryMetric: 12 },
          { path: 'src/components/Settings.tsx', metric: 189, secondaryMetric: 8 },
          { path: 'README.md', metric: 156, secondaryMetric: 15 },
          { path: 'package.json', metric: 134, secondaryMetric: 9 },
          { path: 'src/hooks/useData.ts', metric: 98, secondaryMetric: 5 }
        ]
      }
    ]
  },

  timeRangeSlider: {
    min: new Date('2023-01-01'),
    max: new Date('2024-01-01'),
    current: {
      start: new Date('2023-06-01'),
      end: new Date('2024-01-01')
    }
  },

  chartToggle: {
    options: ['commits', 'lines', 'files'],
    defaultValue: 'commits'
  }
}

test.describe('Visual Regression Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    // Set consistent viewport for reproducible screenshots
    await page.setViewportSize({ width: 1200, height: 800 })
  })

  test.describe('Growth Chart', () => {
    test('should render consistently across themes', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      // Light theme
      const lightChart = page.locator('.growth-chart')
      await expect(lightChart).toHaveScreenshot('growth-chart-light.png', {
        fullPage: false,
        threshold: 0.1
      })

      // Dark theme
      await page.click('[data-theme="dark"]')
      await page.waitForTimeout(500) // Allow theme transition
      await expect(lightChart).toHaveScreenshot('growth-chart-dark.png', {
        fullPage: false,
        threshold: 0.1
      })
    })

    test('should handle data updates smoothly', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      // Initial state
      const chart = page.locator('.growth-chart')
      await expect(chart).toHaveScreenshot('growth-chart-initial.png')

      // Simulate data update
      await page.evaluate(() => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'growth-chart', newData: {} }
        })
        window.dispatchEvent(event)
      })
      
      await page.waitForTimeout(1000)
      await expect(chart).toHaveScreenshot('growth-chart-updated.png')
    })
  })

  test.describe('File Types Pie Chart', () => {
    test('should render pie chart with legend', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=file-types-pie`)
      await page.waitForSelector('.file-types-chart')
      
      const chart = page.locator('.file-types-chart')
      await expect(chart).toHaveScreenshot('pie-chart-full.png', {
        threshold: 0.1
      })
    })

    test('should handle legend interactions', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=file-types-pie`)
      await page.waitForSelector('.file-types-chart')
      
      // Click on first legend item
      await page.click('.pie-legend li:first-child')
      await page.waitForTimeout(500)
      
      const chart = page.locator('.file-types-chart')
      await expect(chart).toHaveScreenshot('pie-chart-legend-toggled.png')
    })
  })

  test.describe('Metric Cards', () => {
    test('should render metric cards with animations', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Wait for animations to complete
      await page.waitForTimeout(1500)
      
      const cards = page.locator('.component-demo')
      await expect(cards).toHaveScreenshot('metric-cards.png', {
        threshold: 0.1
      })
    })

    test('should show hover effects', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Hover over first card
      await page.hover('.metric-card:first-child')
      await page.waitForTimeout(300)
      
      const cards = page.locator('.component-demo')
      await expect(cards).toHaveScreenshot('metric-cards-hover.png')
    })
  })

  test.describe('Top Files Table', () => {
    test('should render table with tabs', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      const table = page.locator('.top-files-table')
      await expect(table).toHaveScreenshot('files-table-initial.png')
    })

    test('should handle tab switching', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      // Click second tab
      await page.click('.tab-button:nth-child(2)')
      await page.waitForTimeout(300)
      
      const table = page.locator('.top-files-table')
      await expect(table).toHaveScreenshot('files-table-second-tab.png')
    })

    test('should handle sorting', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      // Click metric column header
      await page.click('th.sortable[data-sort="metric"]')
      await page.waitForTimeout(300)
      
      const table = page.locator('.top-files-table')
      await expect(table).toHaveScreenshot('files-table-sorted.png')
    })
  })

  test.describe('Time Range Slider', () => {
    test('should render slider with controls', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      const slider = page.locator('.time-range-slider')
      await expect(slider).toHaveScreenshot('time-slider-initial.png')
    })

    test('should handle preset buttons', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Click "3 Months" preset
      await page.click('[data-range="3m"]')
      await page.waitForTimeout(300)
      
      const slider = page.locator('.time-range-slider')
      await expect(slider).toHaveScreenshot('time-slider-3months.png')
    })

    test('should handle drag interactions', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Drag start handle
      const startHandle = page.locator('.slider-handle.start')
      const sliderTrack = page.locator('.slider-track')
      
      await startHandle.dragTo(sliderTrack, {
        targetPosition: { x: 200, y: 0 }
      })
      await page.waitForTimeout(300)
      
      const slider = page.locator('.time-range-slider')
      await expect(slider).toHaveScreenshot('time-slider-dragged.png')
    })
  })

  test.describe('Chart Toggle', () => {
    test('should render toggle buttons', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=chart-toggle`)
      await page.waitForSelector('.chart-toggle')
      
      const toggle = page.locator('.chart-toggle')
      await expect(toggle).toHaveScreenshot('chart-toggle-initial.png')
    })

    test('should handle selection changes', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=chart-toggle`)
      await page.waitForSelector('.chart-toggle')
      
      // Click second option
      await page.click('.toggle-option:nth-child(2)')
      await page.waitForTimeout(300)
      
      const toggle = page.locator('.chart-toggle')
      await expect(toggle).toHaveScreenshot('chart-toggle-selected.png')
    })
  })

  test.describe('Cross-browser Consistency', () => {
    test('components should render consistently across viewports', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ]

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        
        await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
        await page.waitForSelector('.metric-card')
        await page.waitForTimeout(500)
        
        const cards = page.locator('.component-demo')
        await expect(cards).toHaveScreenshot(`metric-cards-${viewport.width}x${viewport.height}.png`, {
          threshold: 0.2
        })
      }
    })
  })

  test.describe('Performance Visual Tests', () => {
    test('should render large datasets without visual artifacts', async () => {
      // Generate large dataset
      const largeData = {
        series: [{
          name: 'Large Dataset',
          data: Array.from({ length: 1000 }, (_, i) => ({
            x: new Date(2020, 0, 1).getTime() + (i * 24 * 60 * 60 * 1000),
            y: Math.floor(Math.random() * 100)
          }))
        }]
      }

      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      // Inject large dataset
      await page.evaluate((data) => {
        const event = new CustomEvent('updateChart', {
          detail: { type: 'growth-chart', newData: data }
        })
        window.dispatchEvent(event)
      }, largeData)
      
      await page.waitForTimeout(2000) // Allow for rendering
      
      const chart = page.locator('.growth-chart')
      await expect(chart).toHaveScreenshot('growth-chart-large-dataset.png', {
        threshold: 0.1
      })
    })
  })
})

test.describe('Component State Tests', () => {
  test('should maintain state during theme changes', async ({ page }) => {
    await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
    await page.waitForSelector('.time-range-slider')
    
    // Set custom range
    await page.click('[data-range="3m"]')
    await page.waitForTimeout(300)
    
    // Capture state
    const beforeTheme = await page.locator('.start-label').textContent()
    
    // Change theme
    await page.click('[data-theme="dark"]')
    await page.waitForTimeout(500)
    
    // Verify state maintained
    const afterTheme = await page.locator('.start-label').textContent()
    expect(beforeTheme).toBe(afterTheme)
  })

  test('should handle rapid interactions gracefully', async ({ page }) => {
    await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
    await page.waitForSelector('.top-files-table')
    
    // Rapid tab switching
    for (let i = 0; i < 5; i++) {
      await page.click('.tab-button:nth-child(1)')
      await page.click('.tab-button:nth-child(2)')
    }
    
    await page.waitForTimeout(500)
    
    // Verify table is still functional
    const activeTab = page.locator('.tab-button.active')
    await expect(activeTab).toBeVisible()
    
    const activePanel = page.locator('.table-panel.active')
    await expect(activePanel).toBeVisible()
  })
})