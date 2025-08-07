/**
 * Unit tests for ContributorBarChart component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { ContributorBarChart } from '../ContributorBarChart'
import type { ContributorBarData, ContributorData } from '../ContributorBarChart'

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

describe('ContributorBarChart', () => {
  const mockContributors: ContributorData[] = [
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      commits: 342,
      linesAdded: 8745,
      linesDeleted: 2134,
      filesChanged: 156,
      avatar: 'https://example.com/alice.jpg'
    },
    {
      name: 'Bob Smith',
      email: 'bob@example.com',
      commits: 287,
      linesAdded: 6834,
      linesDeleted: 1923,
      filesChanged: 134
    },
    {
      name: 'Carol Davis',
      email: 'carol@example.com',
      commits: 198,
      linesAdded: 4567,
      linesDeleted: 1245,
      filesChanged: 89
    }
  ]

  const testData: ContributorBarData = {
    contributors: mockContributors,
    metrics: [
      { key: 'commits', label: 'Commits', color: '#008FFB' },
      { key: 'linesAdded', label: 'Lines Added', color: '#00E396' },
      { key: 'filesChanged', label: 'Files Changed', color: '#FEB019' }
    ]
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Basic Rendering', () => {
    it('should create instance with data', () => {
      const chart = new ContributorBarChart(testData)
      expect(chart).toBeDefined()
    })

    it('should render static HTML', () => {
      const chart = new ContributorBarChart(testData, { title: 'Test Contributors' })
      const html = chart.renderStatic()
      
      expect(html).toContain('contributor-bar-chart')
      expect(html).toContain('Test Contributors')
      expect(html).toContain('<svg')
      expect(html).toContain('data-chart-id')
      expect(html).toContain('Alice Johnson')
      expect(html).toContain('Bob Smith')
      expect(html).toContain('Carol Davis')
    })

    it('should generate valid SVG', () => {
      const chart = new ContributorBarChart(testData)
      const svg = chart.toSVG()
      
      expect(svg).toContain('<svg')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('width="800"')
      expect(svg).toContain('height="500"')
    })

    it('should include metric selector when enabled', () => {
      const chart = new ContributorBarChart(testData, { showMetricSelector: true })
      const html = chart.renderStatic()
      
      expect(html).toContain('metric-selector')
      expect(html).toContain('Commits')
      expect(html).toContain('Lines Added')
      expect(html).toContain('Files Changed')
    })

    it('should hide metric selector when disabled', () => {
      const chart = new ContributorBarChart(testData, { showMetricSelector: false })
      const html = chart.renderStatic()
      
      expect(html).not.toContain('metric-selector')
    })
  })

  describe('Data Handling', () => {
    it('should sort contributors by default metric (commits)', () => {
      const chart = new ContributorBarChart(testData)
      const svg = chart.toSVG()
      
      // Alice has most commits (342), should appear first
      const aliceIndex = svg.indexOf('Alice Johnson')
      const bobIndex = svg.indexOf('Bob Smith')
      const carolIndex = svg.indexOf('Carol Davis')
      
      expect(aliceIndex).toBeLessThan(bobIndex)
      expect(bobIndex).toBeLessThan(carolIndex)
    })

    it('should limit number of contributors shown', () => {
      const chart = new ContributorBarChart(testData, { maxContributors: 2 })
      const html = chart.renderStatic()
      
      expect(html).toContain('Alice Johnson')
      expect(html).toContain('Bob Smith')
      expect(html).not.toContain('Carol Davis')
    })

    it('should sort by different metrics', () => {
      const chart = new ContributorBarChart(testData, { sortBy: 'linesAdded' })
      const svg = chart.toSVG()
      
      // Alice has most lines added (8745), should appear first
      const aliceIndex = svg.indexOf('Alice Johnson')
      const bobIndex = svg.indexOf('Bob Smith')
      
      expect(aliceIndex).toBeLessThan(bobIndex)
    })

    it('should handle empty contributor data gracefully', () => {
      const emptyData: ContributorBarData = {
        contributors: [],
        metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }]
      }
      
      const chart = new ContributorBarChart(emptyData)
      const html = chart.renderStatic()
      
      expect(html).toBeTruthy()
      expect(html).toContain('contributor-bar-chart')
    })

    it('should handle single contributor', () => {
      const singleData: ContributorBarData = {
        contributors: [mockContributors[0]],
        metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }]
      }
      
      const chart = new ContributorBarChart(singleData)
      const html = chart.renderStatic()
      
      expect(html).toContain('Alice Johnson')
      expect(html).not.toContain('Bob Smith')
    })
  })

  describe('Formatting and Display', () => {
    it('should format large numbers correctly', () => {
      const chart = new ContributorBarChart(testData)
      const html = chart.renderStatic()
      
      // Should format 8745 as "8.7K" or "8,745"
      expect(html).toMatch(/8[,.]?[7\d]K?/)
    })

    it('should truncate long contributor names', () => {
      const longNameData: ContributorBarData = {
        contributors: [{
          name: 'Very Long Contributor Name That Should Be Truncated',
          email: 'long@example.com',
          commits: 100,
          linesAdded: 1000,
          linesDeleted: 100,
          filesChanged: 10
        }],
        metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }]
      }
      
      const chart = new ContributorBarChart(longNameData)
      const html = chart.renderStatic()
      
      // Should be truncated to something shorter
      expect(html).not.toContain('Very Long Contributor Name That Should Be Truncated')
    })

    it('should include avatars when showAvatars is true', () => {
      const chart = new ContributorBarChart(testData, { showAvatars: true })
      const svg = chart.toSVG()
      
      expect(svg).toContain('<image')
      expect(svg).toContain('alice.jpg')
    })

    it('should exclude avatars when showAvatars is false', () => {
      const chart = new ContributorBarChart(testData, { showAvatars: false })
      const svg = chart.toSVG()
      
      expect(svg).not.toContain('<image')
    })
  })

  describe('Accessibility', () => {
    it('should include ARIA labels', () => {
      const chart = new ContributorBarChart(testData, { title: 'Contributors' })
      const html = chart.renderStatic()
      
      expect(html).toContain('role="img"')
      expect(html).toContain('aria-labelledby')
      expect(html).toContain('aria-describedby')
    })

    it('should include accessible table in noscript', () => {
      const chart = new ContributorBarChart(testData)
      const html = chart.renderStatic()
      
      expect(html).toContain('<noscript>')
      expect(html).toContain('<table')
      expect(html).toContain('role="table"')
      expect(html).toContain('<caption>')
      expect(html).toContain('<thead>')
      expect(html).toContain('<tbody>')
    })

    it('should include metric selector with ARIA attributes', () => {
      const chart = new ContributorBarChart(testData, { showMetricSelector: true })
      const html = chart.renderStatic()
      
      expect(html).toContain('role="tablist"')
      expect(html).toContain('aria-label="Select metric to display"')
      expect(html).toContain('role="tab"')
      expect(html).toContain('aria-selected="true"')
      expect(html).toContain('aria-controls="chart-content"')
    })
  })

  describe('Theming', () => {
    it('should apply light theme by default', () => {
      const chart = new ContributorBarChart(testData)
      const html = chart.renderStatic()
      
      expect(html).toContain('data-theme="light"')
    })

    it('should apply dark theme when specified', () => {
      const chart = new ContributorBarChart(testData, { theme: 'dark' })
      const html = chart.renderStatic()
      
      expect(html).toContain('data-theme="dark"')
    })

    it('should use appropriate colors for theme', () => {
      const lightChart = new ContributorBarChart(testData, { theme: 'light' })
      const darkChart = new ContributorBarChart(testData, { theme: 'dark' })
      
      const lightSvg = lightChart.toSVG()
      const darkSvg = darkChart.toSVG()
      
      // Should have different background/text colors
      expect(lightSvg).not.toBe(darkSvg)
    })
  })

  describe('Configuration Options', () => {
    it('should support horizontal orientation (default)', () => {
      const chart = new ContributorBarChart(testData, { orientation: 'horizontal' })
      const html = chart.renderStatic()
      
      expect(html).toContain('contributor-bar-chart')
      // Horizontal bars should position names on the left
    })

    it('should support vertical orientation', () => {
      const chart = new ContributorBarChart(testData, { orientation: 'vertical' })
      const html = chart.renderStatic()
      
      expect(html).toContain('contributor-bar-chart')
    })

    it('should use custom dimensions', () => {
      const chart = new ContributorBarChart(testData, { width: 1000, height: 600 })
      const svg = chart.toSVG()
      
      expect(svg).toContain('width="1000"')
      expect(svg).toContain('height="600"')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = {
        contributors: null as any,
        metrics: []
      }
      
      expect(() => {
        const chart = new ContributorBarChart(malformedData)
        chart.renderStatic()
      }).not.toThrow()
    })

    it('should handle missing metric gracefully', () => {
      const dataWithMissingMetric: ContributorBarData = {
        contributors: mockContributors,
        metrics: []
      }
      
      expect(() => {
        const chart = new ContributorBarChart(dataWithMissingMetric)
        chart.renderStatic()
      }).not.toThrow()
    })

    it('should handle contributors with missing data fields', () => {
      const incompleteContributor = {
        name: 'Incomplete User',
        commits: 50,
        linesAdded: 0, // Missing some fields
        linesDeleted: 0,
        filesChanged: 0
      } as ContributorData
      
      const incompleteData: ContributorBarData = {
        contributors: [incompleteContributor],
        metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }]
      }
      
      expect(() => {
        const chart = new ContributorBarChart(incompleteData)
        chart.renderStatic()
      }).not.toThrow()
    })
  })

  describe('Legend and Statistics', () => {
    it('should include legend with statistics', () => {
      const chart = new ContributorBarChart(testData)
      const html = chart.renderStatic()
      
      expect(html).toContain('chart-legend')
      expect(html).toContain('legend-color')
      expect(html).toContain('total-contributors')
      expect(html).toContain('total-value')
    })

    it('should calculate correct totals', () => {
      const chart = new ContributorBarChart(testData)
      const html = chart.renderStatic()
      
      // Total commits should be 342 + 287 + 198 = 827
      expect(html).toContain('827')
    })
  })

  describe('Performance', () => {
    it('should render many contributors efficiently', () => {
      const manyContributors = Array.from({ length: 100 }, (_, i) => ({
        name: `Contributor ${i + 1}`,
        email: `contributor${i + 1}@example.com`,
        commits: Math.floor(Math.random() * 500),
        linesAdded: Math.floor(Math.random() * 10000),
        linesDeleted: Math.floor(Math.random() * 2000),
        filesChanged: Math.floor(Math.random() * 100)
      }))

      const largeData: ContributorBarData = {
        contributors: manyContributors,
        metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }]
      }

      const startTime = performance.now()
      const chart = new ContributorBarChart(largeData)
      const html = chart.renderStatic()
      const endTime = performance.now()

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
      expect(html).toBeTruthy()
    })

    it('should limit contributors to maxContributors setting', () => {
      const manyContributors = Array.from({ length: 100 }, (_, i) => ({
        name: `Contributor ${i + 1}`,
        email: `contributor${i + 1}@example.com`,
        commits: Math.floor(Math.random() * 500),
        linesAdded: Math.floor(Math.random() * 10000),
        linesDeleted: Math.floor(Math.random() * 2000),
        filesChanged: Math.floor(Math.random() * 100)
      }))

      const largeData: ContributorBarData = {
        contributors: manyContributors,
        metrics: [{ key: 'commits', label: 'Commits', color: '#008FFB' }]
      }

      const chart = new ContributorBarChart(largeData, { maxContributors: 5 })
      const html = chart.renderStatic()

      // Should only contain first 5 contributors (after sorting)
      const contributorMatches = html.match(/Contributor \d+/g) || []
      expect(contributorMatches.length).toBeLessThanOrEqual(5)
    })
  })
})