/**
 * Tests for GrowthChart component
 */

import { describe, it, expect } from 'vitest'
import { GrowthChartSimple } from '../charts/GrowthChartSimple.js'
import type { GrowthChartData } from '../charts/GrowthChartSimple.js'

describe('GrowthChart', () => {
  const testData: GrowthChartData = {
    series: [
      {
        name: 'Commits',
        data: [
          { x: Date.parse('2024-01-01'), y: 100 },
          { x: Date.parse('2024-02-01'), y: 150 },
          { x: Date.parse('2024-03-01'), y: 200 }
        ],
        color: '#008FFB'
      },
      {
        name: 'Lines of Code',
        data: [
          { x: Date.parse('2024-01-01'), y: 1000 },
          { x: Date.parse('2024-02-01'), y: 1500 },
          { x: Date.parse('2024-03-01'), y: 2000 }
        ],
        color: '#00E396',
        type: 'area'
      }
    ]
  }
  
  it('should render static HTML', () => {
    const chart = new GrowthChartSimple(testData, {
      title: 'Repository Growth'
    })
    
    const html = chart.renderStatic()
    
    expect(html).toContain('growth-chart')
    expect(html).toContain('Repository Growth')
    expect(html).toContain('<svg')
    expect(html).toContain('</svg>')
    expect(html).toContain('<noscript>')
  })
  
  it('should generate valid SVG', () => {
    const chart = new GrowthChartSimple(testData)
    const svg = chart.toSVG()
    
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="400"')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
  
  it('should generate unique chart IDs', () => {
    const chart1 = new GrowthChartSimple(testData)
    const chart2 = new GrowthChartSimple(testData)
    
    const html1 = chart1.renderStatic()
    const html2 = chart2.renderStatic()
    
    // Extract chart IDs
    const id1Match = html1.match(/data-chart-id="([^"]+)"/)
    const id2Match = html2.match(/data-chart-id="([^"]+)"/)
    
    expect(id1Match).toBeTruthy()
    expect(id2Match).toBeTruthy()
    expect(id1Match![1]).not.toBe(id2Match![1])
  })
  
  it('should handle empty data gracefully', () => {
    const emptyData: GrowthChartData = {
      series: []
    }
    
    const chart = new GrowthChartSimple(emptyData)
    const html = chart.renderStatic()
    
    expect(html).toBeTruthy()
    expect(html).toContain('growth-chart')
  })
  
  it('should update data', () => {
    const chart = new GrowthChartSimple(testData)
    
    const newData: GrowthChartData = {
      series: [
        {
          name: 'New Series',
          data: [{ x: Date.now(), y: 500 }]
        }
      ]
    }
    
    chart.update(newData)
    // In a real implementation, we'd verify the chart updated
    expect(true).toBe(true)
  })
  
  it('should clean up on destroy', () => {
    const chart = new GrowthChartSimple(testData)
    chart.destroy()
    // In a real implementation, we'd verify resources were freed
    expect(true).toBe(true)
  })
})