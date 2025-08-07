/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileTypesPieChart, FileTypeData } from '../FileTypesPieChart'

// Mock ApexCharts
vi.mock('apexcharts', () => ({
  default: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockResolvedValue(undefined),
    updateSeries: vi.fn(),
    destroy: vi.fn(),
    addEventListener: vi.fn(),
    toggleSeries: vi.fn()
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

  describe('Basic functionality', () => {
    it('should create chart instance without errors', () => {
      expect(() => {
        new FileTypesPieChart(testData, {
          title: 'File Types Distribution'
        })
      }).not.toThrow()
    })

    it('should generate valid SVG', () => {
      const chart = new FileTypesPieChart(testData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
    })

    it('should handle empty data gracefully', () => {
      const emptyData: FileTypeData = {
        series: [],
        labels: [],
        categories: []
      }
      
      const chart = new FileTypesPieChart(emptyData)
      const svg = chart.toSVG()
      
      expect(svg).toBeTruthy()
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
  })
})
EOF < /dev/null