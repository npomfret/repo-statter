/**
 * Comprehensive unit tests for visualization components
 * Tests component rendering, data handling, and core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  resources: 'usable'
})

global.window = dom.window as any
global.document = dom.window.document
global.navigator = dom.window.navigator
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn()

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Import components after setting up mocks
import { GrowthChart } from '../charts/GrowthChart'
import { FileTypesPieChart } from '../charts/FileTypesPieChart'
import { MetricCard } from '../widgets/MetricCard'
import { ChartToggle } from '../widgets/ChartToggle'
import { TimeRangeSlider } from '../widgets/TimeRangeSlider'
import { TopFilesTable } from '../widgets/TopFilesTable'
import { ComponentRegistry } from '../registry'

describe('Visualization Components Unit Tests', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    // Reset any global state
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test
    document.body.innerHTML = ''
  })

  describe('GrowthChart', () => {
    const testData = {
      series: [
        {
          name: 'Commits',
          data: [
            { x: Date.parse('2024-01-01'), y: 100 },
            { x: Date.parse('2024-02-01'), y: 150 },
            { x: Date.parse('2024-03-01'), y: 200 }
          ]
        }
      ]
    }

    it('should create instance with data', () => {
      const chart = new GrowthChart(testData)
      expect(chart).toBeDefined()
    })

    it('should render static HTML', () => {
      const chart = new GrowthChart(testData, { title: 'Test Chart' })
      const html = chart.renderStatic()
      
      expect(html).toContain('growth-chart')
      expect(html).toContain('Test Chart')
      expect(html).toContain('<svg')
      expect(html).toContain('data-chart-id')
    })

    it('should generate unique IDs for multiple instances', () => {
      const chart1 = new GrowthChart(testData)
      const chart2 = new GrowthChart(testData)
      
      const html1 = chart1.renderStatic()
      const html2 = chart2.renderStatic()
      
      const id1 = html1.match(/data-chart-id="([^"]+)"/)?.[1]
      const id2 = html2.match(/data-chart-id="([^"]+)"/)?.[1]
      
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })

    it('should generate valid SVG', () => {
      const chart = new GrowthChart(testData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('<svg')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('width="800"')
      expect(svg).toContain('height="400"')
    })

    it('should handle empty data gracefully', () => {
      const emptyChart = new GrowthChart({ series: [] })
      const html = emptyChart.renderStatic()
      
      expect(html).toBeTruthy()
      expect(html).toContain('growth-chart')
    })

    it('should handle invalid data gracefully', () => {
      const invalidChart = new GrowthChart({ series: null as any })
      
      expect(() => {
        invalidChart.renderStatic()
      }).not.toThrow()
    })

    it('should support theme options', () => {
      const lightChart = new GrowthChart(testData, { theme: 'light' })
      const darkChart = new GrowthChart(testData, { theme: 'dark' })
      
      const lightHtml = lightChart.renderStatic()
      const darkHtml = darkChart.renderStatic()
      
      expect(lightHtml).toContain('data-theme="light"')
      expect(darkHtml).toContain('data-theme="dark"')
    })
  })

  describe('FileTypesPieChart', () => {
    const testData = {
      series: [25, 15, 10, 8, 5],
      labels: ['TypeScript', 'JavaScript', 'CSS', 'HTML', 'JSON'],
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57']
    }

    it('should render pie chart HTML', () => {
      const chart = new FileTypesPieChart(testData)
      const html = chart.renderStatic()
      
      expect(html).toContain('file-types-chart')
      expect(html).toContain('chart-legend')
      expect(html).toContain('<svg')
      expect(html).toContain('TypeScript')
      expect(html).toContain('JavaScript')
    })

    it('should generate SVG with correct slices', () => {
      const chart = new FileTypesPieChart(testData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('<path') // Pie slices
      expect(svg).toContain('fill="#FF6B6B"') // First color
      expect(svg).toContain('<text') // Labels
    })

    it('should calculate percentages correctly', () => {
      const chart = new FileTypesPieChart(testData)
      const html = chart.renderStatic()
      
      // 25 out of 63 total should be ~39.7%
      expect(html).toContain('39.7%')
    })

    it('should handle single item data', () => {
      const singleData = {
        series: [100],
        labels: ['TypeScript'],
        colors: ['#FF6B6B']
      }
      
      const chart = new FileTypesPieChart(singleData)
      const html = chart.renderStatic()
      
      expect(html).toContain('TypeScript')
      expect(html).toContain('100.0%')
    })
  })

  describe('MetricCard', () => {
    const testData = {
      label: 'Total Commits',
      value: 1247,
      icon: 'commits',
      trend: { value: 12.5, direction: 'up' as const },
      description: 'Commits in the last 30 days'
    }

    it('should render metric card', () => {
      const card = new MetricCard(testData)
      const html = card.render()
      
      expect(html).toContain('metric-card')
      expect(html).toContain('Total Commits')
      expect(html).toContain('1,247')
      expect(html).toContain('12.5%')
      expect(html).toContain('trend-up')
    })

    it('should format large numbers', () => {
      const largeData = { ...testData, value: 1500000 }
      const card = new MetricCard(largeData)
      const html = card.render()
      
      expect(html).toContain('1.5M')
    })

    it('should format thousands', () => {
      const thousandData = { ...testData, value: 2500 }
      const card = new MetricCard(thousandData)
      const html = card.render()
      
      expect(html).toContain('2.5K')
    })

    it('should handle trend down', () => {
      const downData = {
        ...testData,
        trend: { value: 8.3, direction: 'down' as const }
      }
      const card = new MetricCard(downData)
      const html = card.render()
      
      expect(html).toContain('trend-down')
      expect(html).toContain('8.3%')
    })

    it('should render without trend', () => {
      const noTrendData = { ...testData, trend: undefined }
      const card = new MetricCard(noTrendData)
      const html = card.render()
      
      expect(html).toContain('Total Commits')
      expect(html).not.toContain('trend-')
    })

    it('should render with different themes', () => {
      const lightCard = new MetricCard(testData, { theme: 'light' })
      const darkCard = new MetricCard(testData, { theme: 'dark' })
      
      const lightHtml = lightCard.render()
      const darkHtml = darkCard.render()
      
      expect(lightHtml).toContain('metric-card light')
      expect(darkHtml).toContain('metric-card dark')
    })
  })

  describe('ChartToggle', () => {
    const testOptions = [
      { value: 'commits', label: 'Commits', icon: '📊' },
      { value: 'lines', label: 'Lines of Code', icon: '📝' },
      { value: 'files', label: 'Files Changed', icon: '📁' }
    ]

    it('should render toggle buttons', () => {
      const toggle = new ChartToggle(testOptions)
      const html = toggle.render()
      
      expect(html).toContain('chart-toggle')
      expect(html).toContain('role="radiogroup"')
      expect(html).toContain('Commits')
      expect(html).toContain('Lines of Code')
      expect(html).toContain('Files Changed')
    })

    it('should mark default value as active', () => {
      const toggle = new ChartToggle(testOptions, { defaultValue: 'lines' })
      const html = toggle.render()
      
      expect(html).toContain('data-value="lines"')
      expect(html).toMatch(/data-value="lines"[^>]*class="[^"]*active/)
    })

    it('should include icons when provided', () => {
      const toggle = new ChartToggle(testOptions)
      const html = toggle.render()
      
      expect(html).toContain('📊')
      expect(html).toContain('📝')
      expect(html).toContain('📁')
    })

    it('should handle options without icons', () => {
      const noIconOptions = testOptions.map(opt => ({ ...opt, icon: undefined }))
      const toggle = new ChartToggle(noIconOptions)
      const html = toggle.render()
      
      expect(html).toContain('Commits')
      expect(html).not.toContain('toggle-icon')
    })
  })

  describe('TimeRangeSlider', () => {
    const testData = {
      min: new Date('2023-01-01'),
      max: new Date('2024-01-01'),
      current: {
        start: new Date('2023-06-01'),
        end: new Date('2024-01-01')
      }
    }

    it('should render slider HTML', () => {
      const slider = new TimeRangeSlider(testData)
      const html = slider.render()
      
      expect(html).toContain('time-range-slider')
      expect(html).toContain('slider-track')
      expect(html).toContain('slider-handle start')
      expect(html).toContain('slider-handle end')
      expect(html).toContain('preset-buttons')
    })

    it('should include date labels', () => {
      const slider = new TimeRangeSlider(testData)
      const html = slider.render()
      
      expect(html).toContain('Jun 1, 2023')
      expect(html).toContain('Jan 1, 2024')
    })

    it('should include ARIA attributes', () => {
      const slider = new TimeRangeSlider(testData)
      const html = slider.render()
      
      expect(html).toContain('role="slider"')
      expect(html).toContain('aria-label="Start date"')
      expect(html).toContain('aria-label="End date"')
      expect(html).toContain('aria-valuemin')
      expect(html).toContain('aria-valuemax')
    })

    it('should include preset buttons', () => {
      const slider = new TimeRangeSlider(testData)
      const html = slider.render()
      
      expect(html).toContain('1 Month')
      expect(html).toContain('3 Months')
      expect(html).toContain('6 Months')
      expect(html).toContain('1 Year')
      expect(html).toContain('All Time')
    })
  })

  describe('TopFilesTable', () => {
    const testData = {
      tabs: [
        {
          id: 'largest',
          label: 'Largest Files',
          files: [
            { path: 'src/components/Dashboard.tsx', metric: 2450, secondaryMetric: 15 },
            { path: 'src/utils/helpers.ts', metric: 1890, secondaryMetric: 8 }
          ]
        },
        {
          id: 'churn',
          label: 'Most Changed',
          files: [
            { path: 'src/config/api.ts', metric: 245, secondaryMetric: 12 }
          ]
        }
      ]
    }

    it('should render table with tabs', () => {
      const table = new TopFilesTable(testData)
      const html = table.renderStatic()
      
      expect(html).toContain('top-files-table')
      expect(html).toContain('table-tabs')
      expect(html).toContain('Largest Files')
      expect(html).toContain('Most Changed')
    })

    it('should render table content', () => {
      const table = new TopFilesTable(testData)
      const html = table.renderStatic()
      
      expect(html).toContain('Dashboard.tsx')
      expect(html).toContain('2,450')
      expect(html).toContain('helpers.ts')
      expect(html).toContain('1,890')
    })

    it('should mark default tab as active', () => {
      const table = new TopFilesTable(testData, { defaultTab: 'churn' })
      const html = table.renderStatic()
      
      expect(html).toMatch(/data-tab="churn"[^>]*class="[^"]*active/)
      expect(html).toMatch(/id="panel-churn"[^>]*class="[^"]*active/)
    })

    it('should limit files when maxFiles option is set', () => {
      const table = new TopFilesTable(testData, { maxFiles: 1 })
      const html = table.renderStatic()
      
      // Should only show 1 file per tab
      expect(html).toContain('Dashboard.tsx')
      expect(html).not.toContain('helpers.ts')
    })

    it('should include file icons', () => {
      const table = new TopFilesTable(testData)
      const html = table.renderStatic()
      
      expect(html).toContain('file-icon')
      expect(html).toContain('⚛️') // TypeScript React icon
    })

    it('should include sortable headers', () => {
      const table = new TopFilesTable(testData)
      const html = table.renderStatic()
      
      expect(html).toContain('class="sortable"')
      expect(html).toContain('data-sort="path"')
      expect(html).toContain('data-sort="metric"')
    })
  })

  describe('ComponentRegistry', () => {
    beforeEach(() => {
      // Reset registry
      ComponentRegistry.reset?.()
    })

    it('should register and retrieve components', () => {
      expect(ComponentRegistry.get('growth-chart')).toBeDefined()
      expect(ComponentRegistry.get('file-types-pie')).toBeDefined()
      expect(ComponentRegistry.get('metric-card')).toBeDefined()
    })

    it('should throw error for unknown component', () => {
      expect(() => {
        ComponentRegistry.get('unknown-component' as any)
      }).toThrow('Unknown component type')
    })

    it('should render component with factory method', () => {
      const testData = {
        series: [{ name: 'Test', data: [{ x: 1, y: 2 }] }]
      }
      
      const result = ComponentRegistry.renderComponent(
        'growth-chart',
        testData,
        { title: 'Test Chart' }
      )
      
      expect(result.html).toContain('growth-chart')
      expect(result.html).toContain('Test Chart')
      expect(result.component).toBeDefined()
    })

    it('should return all registered components', () => {
      const allComponents = ComponentRegistry.getAll()
      
      expect(allComponents.size).toBeGreaterThan(0)
      expect(allComponents.has('growth-chart')).toBe(true)
      expect(allComponents.has('file-types-pie')).toBe(true)
    })

    it('should allow custom component registration', () => {
      class CustomComponent {
        render() { return '<div>Custom</div>' }
      }
      
      ComponentRegistry.register('custom' as any, CustomComponent)
      const retrieved = ComponentRegistry.get('custom' as any)
      
      expect(retrieved).toBe(CustomComponent)
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize XSS in chart data', () => {
      const maliciousData = {
        series: [{
          name: '<script>alert("xss")</script>',
          data: [{ x: 1, y: 2 }]
        }]
      }
      
      const chart = new GrowthChart(maliciousData)
      const html = chart.renderStatic()
      
      // Should not contain unescaped script tags
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('alert("xss")')
    })

    it('should sanitize XSS in file paths', () => {
      const maliciousData = {
        tabs: [{
          id: 'test',
          label: 'Test',
          files: [{
            path: '<img src=x onerror=alert("xss")>',
            metric: 100
          }]
        }]
      }
      
      const table = new TopFilesTable(maliciousData)
      const html = table.renderStatic()
      
      expect(html).not.toContain('onerror=')
      expect(html).not.toContain('alert("xss")')
    })
  })

  describe('Error Handling', () => {
    it('should handle null data gracefully', () => {
      expect(() => {
        new GrowthChart(null as any)
      }).not.toThrow()
    })

    it('should handle undefined options gracefully', () => {
      const data = { series: [{ name: 'Test', data: [] }] }
      
      expect(() => {
        new GrowthChart(data, undefined)
      }).not.toThrow()
    })

    it('should handle malformed data gracefully', () => {
      const malformedData = {
        series: "not an array" as any,
        invalid: true
      }
      
      expect(() => {
        const chart = new GrowthChart(malformedData)
        chart.renderStatic()
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should render large datasets efficiently', () => {
      const largeData = {
        series: [{
          name: 'Large Dataset',
          data: Array.from({ length: 10000 }, (_, i) => ({ x: i, y: i * 2 }))
        }]
      }
      
      const startTime = performance.now()
      const chart = new GrowthChart(largeData)
      const html = chart.renderStatic()
      const endTime = performance.now()
      
      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      expect(html).toBeTruthy()
    })

    it('should handle many table rows efficiently', () => {
      const manyFiles = Array.from({ length: 1000 }, (_, i) => ({
        path: `file${i}.ts`,
        metric: i * 10,
        secondaryMetric: i
      }))
      
      const largeTableData = {
        tabs: [{
          id: 'large',
          label: 'Large List',
          files: manyFiles
        }]
      }
      
      const startTime = performance.now()
      const table = new TopFilesTable(largeTableData)
      const html = table.renderStatic()
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000)
      expect(html).toBeTruthy()
    })
  })
})