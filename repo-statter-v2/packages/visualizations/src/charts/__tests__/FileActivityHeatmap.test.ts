/**
 * Unit tests for FileActivityHeatmap component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { FileActivityHeatmap } from '../FileActivityHeatmap'
import type { FileActivityHeatmapData, FileActivityData } from '../FileActivityHeatmap'

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
global.performance = { now: vi.fn(() => Date.now()) } as any

describe('FileActivityHeatmap', () => {
  const mockFiles: FileActivityData[] = [
    {
      path: 'src/components/Dashboard.tsx',
      size: 15420,
      commits: 45,
      lastModified: new Date('2023-12-29'),
      contributors: ['alice', 'bob', 'carol'],
      language: 'TypeScript',
      complexity: 78,
      changeFrequency: 8.2
    },
    {
      path: 'src/utils/helpers.ts',
      size: 8934,
      commits: 28,
      lastModified: new Date('2023-12-25'),
      contributors: ['alice', 'bob'],
      language: 'TypeScript',
      complexity: 45,
      changeFrequency: 5.1
    },
    {
      path: 'src/api/client.js',
      size: 6754,
      commits: 32,
      lastModified: new Date('2023-12-20'),
      contributors: ['bob', 'david'],
      language: 'JavaScript',
      complexity: 62,
      changeFrequency: 6.8
    },
    {
      path: 'README.md',
      size: 2145,
      commits: 18,
      lastModified: new Date('2023-12-15'),
      contributors: ['alice', 'bob', 'carol', 'david'],
      language: 'Markdown',
      changeFrequency: 3.2
    }
  ]

  const testData: FileActivityHeatmapData = {
    files: mockFiles,
    colorMetric: 'commits'
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
      const heatmap = new FileActivityHeatmap(testData)
      expect(heatmap).toBeDefined()
    })

    it('should render static HTML', () => {
      const heatmap = new FileActivityHeatmap(testData, { title: 'File Activity' })
      const html = heatmap.renderStatic()
      
      expect(html).toContain('file-activity-heatmap')
      expect(html).toContain('File Activity')
      expect(html).toContain('<svg')
      expect(html).toContain('data-chart-id')
      expect(html).toContain('heatmap-container')
    })

    it('should generate valid SVG', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('<svg')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-labelledby="heatmap-title"')
    })

    it('should include color metric selector', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('color-metric-selector')
      expect(html).toContain('Commits')
      expect(html).toContain('Change Frequency')
      expect(html).toContain('Complexity')
      expect(html).toContain('Contributors')
    })

    it('should include color legend', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('color-legend')
      expect(html).toContain('legend-scale')
      expect(html).toContain('legend-value')
    })
  })

  describe('File Rectangles', () => {
    it('should render file rectangles in SVG', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('<rect') // File rectangles
      expect(svg).toContain('class="file-rect"')
      expect(svg).toContain('tabindex="0"') // Keyboard accessible
      expect(svg).toContain('Dashboard.tsx')
    })

    it('should size rectangles proportionally to file size', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      // Dashboard.tsx is the largest file (15420 bytes), should have largest rectangle
      expect(svg).toContain('Dashboard.tsx')
      expect(svg).toMatch(/width="\d+".*Dashboard\.tsx|Dashboard\.tsx.*width="\d+"/)
    })

    it('should color rectangles according to selected metric', () => {
      const heatmap = new FileActivityHeatmap(testData, { colorScheme: 'blue' })
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('fill="#') // Should have fill colors
      expect(svg).toContain('<rect') // File rectangles with colors
    })

    it('should include file labels when showLabels is true', () => {
      const heatmap = new FileActivityHeatmap(testData, { showLabels: true })
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('<text') // File name labels
      expect(svg).toContain('class="file-label"')
    })

    it('should hide file labels when showLabels is false', () => {
      const heatmap = new FileActivityHeatmap(testData, { showLabels: false })
      const svg = heatmap.toSVG()
      
      // Should have fewer text elements (just title, no file labels)
      const textMatches = svg.match(/<text/g) || []
      expect(textMatches.length).toBeLessThan(5) // Only title and minimal labels
    })
  })

  describe('Data Filtering and Sorting', () => {
    it('should filter files by minimum size', () => {
      const heatmap = new FileActivityHeatmap(testData, { minFileSize: 7000 })
      const svg = heatmap.toSVG()
      
      // Should include Dashboard.tsx (15420) and helpers.ts (8934)
      expect(svg).toContain('Dashboard.tsx')
      expect(svg).toContain('helpers.ts')
      
      // Should exclude README.md (2145) and maybe client.js (6754)
      expect(svg).not.toContain('README.md')
    })

    it('should limit number of files shown', () => {
      const heatmap = new FileActivityHeatmap(testData, { maxFiles: 2 })
      const svg = heatmap.toSVG()
      
      // Should only show 2 largest files
      expect(svg).toContain('Dashboard.tsx')
      expect(svg).toContain('helpers.ts')
      expect(svg).not.toContain('README.md')
    })

    it('should sort files by size (largest first)', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      // Dashboard.tsx (15420) should appear before helpers.ts (8934)
      const dashboardIndex = svg.indexOf('Dashboard.tsx')
      const helpersIndex = svg.indexOf('helpers.ts')
      
      expect(dashboardIndex).toBeLessThan(helpersIndex)
    })
  })

  describe('Color Metrics', () => {
    it('should handle commits color metric', () => {
      const data = { ...testData, colorMetric: 'commits' as const }
      const heatmap = new FileActivityHeatmap(data)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('Commits')
      expect(html).toContain('data-metric="commits"')
    })

    it('should handle changeFrequency color metric', () => {
      const data = { ...testData, colorMetric: 'changeFrequency' as const }
      const heatmap = new FileActivityHeatmap(data)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('Change Frequency')
      expect(html).toContain('Changes/Month')
    })

    it('should handle complexity color metric', () => {
      const data = { ...testData, colorMetric: 'complexity' as const }
      const heatmap = new FileActivityHeatmap(data)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('Complexity')
    })

    it('should handle contributors color metric', () => {
      const data = { ...testData, colorMetric: 'contributors' as const }
      const heatmap = new FileActivityHeatmap(data)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('Contributors')
    })
  })

  describe('Color Schemes', () => {
    it('should apply blue color scheme', () => {
      const heatmap = new FileActivityHeatmap(testData, { colorScheme: 'blue' })
      const svg = heatmap.toSVG()
      
      // Should contain blue-ish colors
      expect(svg).toMatch(/#[0-9a-f]{6}/i) // Has hex colors
    })

    it('should apply green color scheme', () => {
      const heatmap = new FileActivityHeatmap(testData, { colorScheme: 'green' })
      const svg = heatmap.toSVG()
      
      expect(svg).toMatch(/#[0-9a-f]{6}/i)
    })

    it('should apply red color scheme', () => {
      const heatmap = new FileActivityHeatmap(testData, { colorScheme: 'red' })
      const svg = heatmap.toSVG()
      
      expect(svg).toMatch(/#[0-9a-f]{6}/i)
    })

    it('should apply rainbow color scheme', () => {
      const heatmap = new FileActivityHeatmap(testData, { colorScheme: 'rainbow' })
      const svg = heatmap.toSVG()
      
      expect(svg).toMatch(/#[0-9a-f]{6}/i)
    })
  })

  describe('Accessibility', () => {
    it('should include proper ARIA attributes', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('role="img"')
      expect(html).toContain('aria-labelledby')
      expect(html).toContain('aria-describedby')
      expect(html).toContain('tabindex="0"')
    })

    it('should include accessible table fallback', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('<noscript>')
      expect(html).toContain('<table')
      expect(html).toContain('role="table"')
      expect(html).toContain('<caption>')
      expect(html).toContain('<thead>')
      expect(html).toContain('<tbody>')
    })

    it('should provide meaningful ARIA labels for file rectangles', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('aria-label=')
      expect(svg).toMatch(/aria-label="[^"]*Dashboard\.tsx[^"]*"/)
    })

    it('should include tooltip text in title elements', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('<title>')
      expect(svg).toContain('Dashboard.tsx')
      expect(svg).toContain('commits')
    })

    it('should provide keyboard navigation attributes', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('tabindex="0"')
      expect(svg).toContain('role="button"')
    })
  })

  describe('File Statistics', () => {
    it('should display file statistics', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('file-stats')
      expect(html).toContain('4') // 4 files
      expect(html).toContain('Files')
      expect(html).toContain('Total Size')
      expect(html).toContain('Total Commits')
    })

    it('should calculate correct totals', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      // Total commits: 45 + 28 + 32 + 18 = 123
      expect(html).toContain('123')
      
      // Total size should be formatted (15420 + 8934 + 6754 + 2145 = 33253)
      expect(html).toMatch(/3[23]\.\d+\s*KB/) // Formatted file size
    })

    it('should show unique contributors count', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      // Unique contributors: alice, bob, carol, david = 4
      expect(html).toContain('4')
      expect(html).toContain('Contributors')
    })
  })

  describe('Theming', () => {
    it('should apply light theme by default', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('data-theme="light"')
    })

    it('should apply dark theme when specified', () => {
      const heatmap = new FileActivityHeatmap(testData, { theme: 'dark' })
      const html = heatmap.renderStatic()
      
      expect(html).toContain('data-theme="dark"')
    })

    it('should use appropriate colors for theme in SVG', () => {
      const lightHeatmap = new FileActivityHeatmap(testData, { theme: 'light' })
      const darkHeatmap = new FileActivityHeatmap(testData, { theme: 'dark' })
      
      const lightSvg = lightHeatmap.toSVG()
      const darkSvg = darkHeatmap.toSVG()
      
      // Should have different background colors
      expect(lightSvg).not.toBe(darkSvg)
      expect(lightSvg).toContain('#ffffff')
      expect(darkSvg).toContain('#1a1a1a')
    })
  })

  describe('Empty State', () => {
    it('should handle empty file list', () => {
      const emptyData: FileActivityHeatmapData = {
        files: [],
        colorMetric: 'commits'
      }
      
      const heatmap = new FileActivityHeatmap(emptyData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('file-activity-heatmap')
      
      const svg = heatmap.toSVG()
      expect(svg).toContain('No File Data Available')
    })

    it('should handle files filtered out by minimum size', () => {
      const heatmap = new FileActivityHeatmap(testData, { minFileSize: 100000 })
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('No files match the current filters')
    })
  })

  describe('Tooltip Content', () => {
    it('should include tooltip container', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const html = heatmap.renderStatic()
      
      expect(html).toContain('heatmap-tooltip')
      expect(html).toContain('aria-live="polite"')
      expect(html).toContain('aria-atomic="true"')
    })

    it('should disable tooltips when interactiveTooltips is false', () => {
      const heatmap = new FileActivityHeatmap(testData, { interactiveTooltips: false })
      const html = heatmap.renderStatic()
      
      expect(html).toContain('file-activity-heatmap')
      // Should still have tooltip container but it won't be used
    })
  })

  describe('File Name Handling', () => {
    it('should extract filename from path', () => {
      const heatmap = new FileActivityHeatmap(testData)
      const svg = heatmap.toSVG()
      
      expect(svg).toContain('Dashboard.tsx')
      expect(svg).toContain('helpers.ts')
      expect(svg).toContain('client.js')
      expect(svg).toContain('README.md')
    })

    it('should truncate long filenames', () => {
      const longFilenameData: FileActivityHeatmapData = {
        files: [{
          path: 'src/components/VeryLongComponentNameThatShouldBeTruncated.tsx',
          size: 10000,
          commits: 20,
          lastModified: new Date(),
          contributors: ['alice'],
          changeFrequency: 1.0
        }],
        colorMetric: 'commits'
      }
      
      const heatmap = new FileActivityHeatmap(longFilenameData)
      const svg = heatmap.toSVG()
      
      // Should be truncated
      expect(svg).not.toContain('VeryLongComponentNameThatShouldBeTruncated.tsx')
      expect(svg).toMatch(/VeryLong\.\.\.tsx|VeryLong\.\.\./)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed file data', () => {
      const malformedData = {
        files: null as any,
        colorMetric: 'commits' as const
      }
      
      expect(() => {
        const heatmap = new FileActivityHeatmap(malformedData)
        heatmap.renderStatic()
      }).not.toThrow()
    })

    it('should handle missing file properties', () => {
      const incompleteFile = {
        path: 'incomplete.js',
        size: 1000,
        commits: 5,
        lastModified: new Date(),
        contributors: [],
        changeFrequency: 1.0
        // Missing complexity
      } as FileActivityData
      
      const incompleteData: FileActivityHeatmapData = {
        files: [incompleteFile],
        colorMetric: 'complexity'
      }
      
      expect(() => {
        const heatmap = new FileActivityHeatmap(incompleteData)
        heatmap.renderStatic()
      }).not.toThrow()
    })

    it('should handle invalid color metric values', () => {
      const fileWithNaN: FileActivityData = {
        path: 'test.js',
        size: 1000,
        commits: NaN,
        lastModified: new Date(),
        contributors: [],
        changeFrequency: NaN
      }
      
      const data: FileActivityHeatmapData = {
        files: [fileWithNaN],
        colorMetric: 'commits'
      }
      
      expect(() => {
        const heatmap = new FileActivityHeatmap(data)
        heatmap.renderStatic()
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should render large number of files efficiently', () => {
      const manyFiles = Array.from({ length: 200 }, (_, i) => ({
        path: `src/file${i}.ts`,
        size: Math.floor(Math.random() * 20000),
        commits: Math.floor(Math.random() * 100),
        lastModified: new Date(),
        contributors: ['user1', 'user2'],
        changeFrequency: Math.random() * 10
      }))

      const largeData: FileActivityHeatmapData = {
        files: manyFiles,
        colorMetric: 'commits'
      }

      const startTime = performance.now()
      const heatmap = new FileActivityHeatmap(largeData, { maxFiles: 50 })
      const html = heatmap.renderStatic()
      const endTime = performance.now()

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(2000)
      expect(html).toBeTruthy()
    })
  })
})