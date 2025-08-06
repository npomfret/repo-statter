/**
 * @jest-environment jsdom
 */

import { FileTypesPieChart, FileTypeData } from '../FileTypesPieChart.js'

// Mock ApexCharts
jest.mock('apexcharts', () => ({
  default: jest.fn().mockImplementation(() => ({
    render: jest.fn().mockResolvedValue(undefined),
    updateSeries: jest.fn(),
    destroy: jest.fn(),
    addEventListener: jest.fn(),
    toggleSeries: jest.fn()
  }))
}))

describe('FileTypesPieChart', () => {
  const testData: FileTypeData = {
    series: [5420, 3210, 1890, 1240, 890],
    labels: ['TypeScript', 'JavaScript', 'CSS', 'HTML', 'JSON'],
    categories: ['TypeScript', 'JavaScript', 'CSS', 'HTML', 'JSON']
  }

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
  })

  describe('Static rendering', () => {
    it('should render static HTML without JavaScript', () => {
      const chart = new FileTypesPieChart(testData, {
        title: 'File Types Distribution'
      })
      
      const html = chart.renderStatic()
      
      expect(html).toContain('file-types-chart')
      expect(html).toContain('File Types Distribution')
      expect(html).toContain('chart-svg')
      expect(html).toContain('chart-legend')
      expect(html).toContain('<noscript>')
      expect(html).toContain('TypeScript')
      expect(html).toContain('JavaScript')
    })

    it('should generate valid SVG', () => {
      const chart = new FileTypesPieChart(testData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('<path')
      expect(svg).toContain('role="img"')
    })

    it('should handle empty data gracefully', () => {
      const emptyData: FileTypeData = {
        series: [],
        labels: [],
        categories: []
      }
      
      const chart = new FileTypesPieChart(emptyData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('No data available')
    })

    it('should handle zero values', () => {
      const zeroData: FileTypeData = {
        series: [0, 0, 0],
        labels: ['A', 'B', 'C'],
        categories: ['A', 'B', 'C']
      }
      
      const chart = new FileTypesPieChart(zeroData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('No data available')
    })
  })

  describe('Data validation', () => {
    it('should throw error if series and labels length mismatch', () => {
      const invalidData: FileTypeData = {
        series: [100, 200],
        labels: ['TypeScript', 'JavaScript', 'CSS'],
        categories: []
      }
      
      expect(() => {
        new FileTypesPieChart(invalidData)
      }).toThrow('Series and labels arrays must have the same length')
    })

    it('should sanitize data on construction', () => {
      const originalData = testData
      const chart = new FileTypesPieChart(originalData)
      
      // Modify original data
      originalData.series[0] = 9999
      
      // Chart data should be unaffected
      const svg = chart.toSVG()
      expect(svg).not.toContain('9999')
    })
  })

  describe('Legend rendering', () => {
    it('should render legend with correct data', () => {
      const chart = new FileTypesPieChart(testData)
      const html = chart.renderStatic()
      
      expect(html).toContain('TypeScript')
      expect(html).toContain('5,420 lines')
      expect(html).toContain('JavaScript')
      expect(html).toContain('3,210 lines')
      expect(html).toContain('Total: 12,650 lines')
    })

    it('should show percentages correctly', () => {
      const chart = new FileTypesPieChart(testData)
      const html = chart.renderStatic()
      
      // TypeScript should be ~42.8% (5420/12650)
      expect(html).toContain('42.8%')
      // JavaScript should be ~25.4% (3210/12650)
      expect(html).toContain('25.4%')
    })

    it('should use custom colors when provided', () => {
      const dataWithColors: FileTypeData = {
        ...testData,
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
      }
      
      const chart = new FileTypesPieChart(dataWithColors)
      const svg = chart.toSVG()
      
      expect(svg).toContain('#ff0000')
      expect(svg).toContain('#00ff00')
      expect(svg).toContain('#0000ff')
    })
  })

  describe('Accessibility', () => {
    it('should include ARIA attributes', () => {
      const chart = new FileTypesPieChart(testData, {
        title: 'File Types Chart'
      })
      const svg = chart.toSVG()
      
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="File Types Chart"')
    })

    it('should include tooltips for pie slices', () => {
      const chart = new FileTypesPieChart(testData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('<title>')
      expect(svg).toContain('TypeScript: 5,420 lines</title>')
      expect(svg).toContain('JavaScript: 3,210 lines</title>')
    })

    it('should render accessible data table', () => {
      const chart = new FileTypesPieChart(testData, {
        title: 'File Types Distribution'
      })
      const html = chart.renderStatic()
      
      expect(html).toContain('<table')
      expect(html).toContain('role="table"')
      expect(html).toContain('<caption>File Types Distribution</caption>')
      expect(html).toContain('<th>File Type</th>')
      expect(html).toContain('<th>Lines of Code</th>')
      expect(html).toContain('<th>Percentage</th>')
    })
  })

  describe('Client-side hydration', () => {
    it('should hydrate successfully with ApexCharts', async () => {
      const chart = new FileTypesPieChart(testData)
      const container = document.createElement('div')
      container.innerHTML = chart.renderStatic()
      document.body.appendChild(container)
      
      await chart.hydrate(container)
      
      // Should have stored chart reference
      const chartEl = container.querySelector('[data-chart-id]')
      expect((chartEl as any).__chart).toBeDefined()
    })

    it('should handle ApexCharts import failure gracefully', async () => {
      // Mock import failure
      const originalImport = global.import
      ;(global as any).import = jest.fn().mockRejectedValue(new Error('Import failed'))
      
      const chart = new FileTypesPieChart(testData)
      const container = document.createElement('div')
      container.innerHTML = chart.renderStatic()
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      await chart.hydrate(container)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load ApexCharts, using static SVG fallback:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
      ;(global as any).import = originalImport
    })
  })

  describe('Updates and lifecycle', () => {
    it('should update data correctly', () => {
      const chart = new FileTypesPieChart(testData)
      const container = document.createElement('div')
      container.innerHTML = chart.renderStatic()
      
      const newData: FileTypeData = {
        series: [1000, 2000, 3000],
        labels: ['A', 'B', 'C'],
        categories: ['A', 'B', 'C']
      }
      
      chart.update(newData)
      
      // Should update the SVG content
      const svg = container.querySelector('.chart-svg')
      expect(svg?.innerHTML).toContain('6,000') // New total
    })

    it('should destroy chart properly', () => {
      const mockChart = {
        render: jest.fn(),
        destroy: jest.fn(),
        updateSeries: jest.fn(),
        addEventListener: jest.fn(),
        toggleSeries: jest.fn()
      }
      
      const chart = new FileTypesPieChart(testData)
      const container = document.createElement('div')
      container.innerHTML = chart.renderStatic()
      
      // Manually set chart reference
      const chartEl = container.querySelector('[data-chart-id]') as any
      chartEl.__chart = mockChart
      chart.container = chartEl
      
      chart.destroy()
      
      expect(mockChart.destroy).toHaveBeenCalled()
      expect(chartEl.__chart).toBeUndefined()
    })
  })

  describe('Theme support', () => {
    it('should apply light theme colors', () => {
      const chart = new FileTypesPieChart(testData, { theme: 'light' })
      const html = chart.renderStatic()
      
      expect(html).toContain('light-theme')
      expect(html).toContain('#ffffff') // Light background
    })

    it('should apply dark theme colors', () => {
      const chart = new FileTypesPieChart(testData, { theme: 'dark' })
      const html = chart.renderStatic()
      
      expect(html).toContain('dark-theme')
      expect(html).toContain('#1a1a1a') // Dark background
    })
  })
})