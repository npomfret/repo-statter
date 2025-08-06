/**
 * Growth Chart Component - Line chart for repository growth over time
 * @module @repo-statter/visualizations/charts
 */

import { ChartComponent, ChartData } from '../base/ChartComponent.js'
import type { TimeSeriesPoint } from '@repo-statter/core'

export interface GrowthChartData extends ChartData {
  series: Array<{
    name: string
    data: Array<{ x: number; y: number }> | TimeSeriesPoint[]
    color?: string
    type?: 'line' | 'area'
  }>
  interval?: 'day' | 'week' | 'month' | 'year'
}

export class GrowthChart extends ChartComponent<GrowthChartData> {
  private chart?: any // ApexCharts instance
  private currentDataIndex = 0 // For keyboard navigation
  
  /**
   * Render static HTML with SVG chart
   */
  renderStatic(): string {
    const id = this.chartId
    const svg = this.toSVG()
    const config = this.getChartConfig()
    const colors = this.getThemeColors()
    
    return `
      <div id="${id}" class="growth-chart chart-component" 
           data-chart-id="${id}"
           data-chart-type="growth"
           data-chart-config='${JSON.stringify(config)}'
           style="background: ${colors.background}; color: ${colors.text};">
        
        ${this.options.title ? `
          <h3 class="chart-title" style="color: ${colors.text}; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
            ${this.options.title}
          </h3>
        ` : ''}
        
        <div class="chart-content" style="position: relative;">
          ${svg}
          
          <noscript>
            <div class="chart-fallback">
              ${this.renderDataTable()}
            </div>
          </noscript>
        </div>
        
        <div class="chart-legend" style="margin-top: 16px;">
          ${this.renderLegend()}
        </div>
      </div>
    `
  }
  
  /**
   * Hydrate with ApexCharts for interactivity
   */
  async hydrate(container: HTMLElement): Promise<void> {
    const chartEl = container.querySelector(`[data-chart-id="${this.chartId}"]`)
    if (!chartEl) return
    
    // Remove static SVG
    const svgEl = chartEl.querySelector('svg')
    if (svgEl) svgEl.remove()
    
    // Get config from data attribute
    const configStr = chartEl.getAttribute('data-chart-config')
    if (!configStr) return
    
    const config = JSON.parse(configStr)
    
    // Dynamically import ApexCharts
    const ApexChartsModule = await import('apexcharts')
    const ApexCharts = ApexChartsModule.default || ApexChartsModule
    
    // Create chart container
    const chartContainer = chartEl.querySelector('.chart-content') as HTMLElement
    if (!chartContainer) return
    
    // Initialize ApexCharts
    this.chart = new ApexCharts(chartContainer, this.getApexConfig(config));
    await this.chart.render();
    
    // Add accessibility
    this.addAccessibilityAttributes(chartEl as HTMLElement);
    
    // Store chart reference for updates
    (chartEl as any).__chart = this.chart
  }
  
  /**
   * Generate static SVG representation
   */
  toSVG(): string {
    const width = typeof this.options.width === 'number' 
      ? this.options.width 
      : 800
    const height = typeof this.options.height === 'number'
      ? this.options.height
      : 400
    const padding = { top: 20, right: 20, bottom: 60, left: 60 }
    const colors = this.getThemeColors()
    
    // Calculate drawing area
    const drawWidth = width - padding.left - padding.right
    const drawHeight = height - padding.top - padding.bottom
    
    // Calculate scales
    const { xScale, yScale, xDomain, yDomain } = this.calculateScales(drawWidth, drawHeight)
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.options.title || 'Growth Chart'}">`
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="${colors.background}"/>`
    
    // Grid lines
    svg += this.drawGrid(padding, drawWidth, drawHeight, xScale, yScale, colors.grid)
    
    // Axes
    svg += this.drawAxes(padding, drawWidth, drawHeight, xScale, yScale, xDomain, yDomain, colors.text)
    
    // Plot lines
    this.data.series.forEach((series, index) => {
      svg += this.drawLine(series, padding, xScale, yScale, series.color || this.getSeriesColor(index))
    })
    
    svg += '</svg>'
    return svg
  }
  
  /**
   * Calculate scales for SVG rendering
   */
  private calculateScales(width: number, height: number) {
    // Flatten all data points
    const allPoints: Array<{ x: number; y: number }> = []
    
    this.data.series.forEach(series => {
      series.data.forEach((point: any) => {
        if ('date' in point && 'value' in point) {
          // TimeSeriesPoint
          allPoints.push({
            x: new Date(point.date).getTime(),
            y: point.value
          })
        } else if ('x' in point && 'y' in point) {
          allPoints.push(point)
        }
      })
    })
    
    const xDomain = [
      Math.min(...allPoints.map(p => p.x)),
      Math.max(...allPoints.map(p => p.x))
    ]
    
    const yDomain = [
      0,
      Math.max(...allPoints.map(p => p.y)) * 1.1 // Add 10% padding
    ]
    
    const xScale = (value: number) => {
      return ((value - (xDomain[0] ?? 0)) / ((xDomain[1] ?? 1) - (xDomain[0] ?? 0))) * width
    }
    
    const yScale = (value: number) => {
      return height - ((value - (yDomain[0] ?? 0)) / ((yDomain[1] ?? 1) - (yDomain[0] ?? 0))) * height
    }
    
    return { xScale, yScale, xDomain, yDomain }
  }
  
  /**
   * Draw grid lines
   */
  private drawGrid(
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    xScale: (value: number) => number,
    yScale: (value: number) => number,
    color: string
  ): string {
    let grid = `<g class="chart-grid" opacity="0.1">`
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (height / 5) * i
      grid += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + width}" y2="${y}" stroke="${color}" stroke-width="1"/>`
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (width / 6) * i
      grid += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + height}" stroke="${color}" stroke-width="1"/>`
    }
    
    grid += '</g>'
    return grid
  }
  
  /**
   * Draw axes with labels
   */
  private drawAxes(
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    xScale: (value: number) => number,
    yScale: (value: number) => number,
    xDomain: number[],
    yDomain: number[],
    color: string
  ): string {
    let axes = `<g class="chart-axes">`
    
    // X-axis
    axes += `<line x1="${padding.left}" y1="${padding.top + height}" x2="${padding.left + width}" y2="${padding.top + height}" stroke="${color}" stroke-width="2"/>`
    
    // Y-axis
    axes += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + height}" stroke="${color}" stroke-width="2"/>`
    
    // X-axis labels (dates)
    for (let i = 0; i <= 6; i++) {
      const value = (xDomain[0] ?? 0) + ((xDomain[1] ?? 1) - (xDomain[0] ?? 0)) * (i / 6)
      const x = padding.left + (width / 6) * i
      const date = new Date(value)
      const label = `${date.getMonth() + 1}/${date.getDate()}`
      
      axes += `<text x="${x}" y="${padding.top + height + 20}" fill="${color}" font-size="12" text-anchor="middle">${label}</text>`
    }
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = (yDomain[0] ?? 0) + ((yDomain[1] ?? 1) - (yDomain[0] ?? 0)) * (1 - i / 5)
      const y = padding.top + (height / 5) * i
      const label = this.formatValue(value)
      
      axes += `<text x="${padding.left - 10}" y="${y + 5}" fill="${color}" font-size="12" text-anchor="end">${label}</text>`
    }
    
    axes += '</g>'
    return axes
  }
  
  /**
   * Draw a data line
   */
  private drawLine(
    series: any,
    padding: { top: number; right: number; bottom: number; left: number },
    xScale: (value: number) => number,
    yScale: (value: number) => number,
    color: string
  ): string {
    const points: Array<{ x: number; y: number }> = []
    
    series.data.forEach((point: any) => {
      if ('date' in point && 'value' in point) {
        points.push({
          x: new Date(point.date).getTime(),
          y: point.value
        })
      } else if ('x' in point && 'y' in point) {
        points.push(point)
      }
    })
    
    if (points.length === 0) return ''
    
    // Create path
    let path = `M ${padding.left + xScale(points[0]?.x ?? 0)} ${padding.top + yScale(points[0]?.y ?? 0)}`
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${padding.left + xScale(points[i]?.x ?? 0)} ${padding.top + yScale(points[i]?.y ?? 0)}`
    }
    
    let line = `<g class="chart-series" data-series="${series.name}">`
    
    // Draw area if specified
    if (series.type === 'area') {
      let areaPath = path
      areaPath += ` L ${padding.left + xScale(points[points.length - 1]?.x ?? 0)} ${padding.top + yScale(0)}`
      areaPath += ` L ${padding.left + xScale(points[0]?.x ?? 0)} ${padding.top + yScale(0)}`
      areaPath += ' Z'
      
      line += `<path d="${areaPath}" fill="${color}" opacity="0.1"/>`
    }
    
    // Draw line
    line += `<path d="${path}" stroke="${color}" stroke-width="2" fill="none"/>`
    
    // Draw points
    points.forEach(point => {
      const cx = padding.left + xScale(point.x)
      const cy = padding.top + yScale(point.y)
      line += `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>`
    })
    
    line += '</g>'
    return line
  }
  
  /**
   * Render legend
   */
  private renderLegend(): string {
    return `
      <div class="chart-legend-items" style="display: flex; gap: 16px; flex-wrap: wrap;">
        ${this.data.series.map((series, index) => {
          const color = series.color || this.getSeriesColor(index)
          return `
            <div class="legend-item" style="display: flex; align-items: center; gap: 8px;">
              <span class="legend-marker" style="display: inline-block; width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></span>
              <span class="legend-label" style="font-size: 14px;">${series.name}</span>
            </div>
          `
        }).join('')}
      </div>
    `
  }
  
  /**
   * Get ApexCharts configuration
   */
  private getApexConfig(baseConfig?: any): any {
    const colors = this.getThemeColors()
    
    return {
      chart: {
        type: 'line',
        height: this.options.height || 400,
        background: colors.background,
        foreColor: colors.text,
        animations: {
          enabled: this.options.animations !== false,
          speed: 750
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        }
      },
      series: this.data.series.map(series => ({
        name: series.name,
        type: series.type || 'line',
        data: this.normalizeSeriesData(series.data),
        color: series.color
      })),
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          style: { colors: colors.text }
        }
      },
      yaxis: {
        labels: {
          style: { colors: colors.text },
          formatter: (value: number) => this.formatValue(value)
        }
      },
      grid: {
        borderColor: colors.grid,
        strokeDashArray: 0
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: { colors: colors.text }
      },
      tooltip: {
        theme: this.detectTheme(),
        x: {
          format: 'dd MMM yyyy'
        },
        y: {
          formatter: (value: number) => this.formatValue(value)
        }
      },
      ...baseConfig
    }
  }
  
  /**
   * Normalize series data for ApexCharts
   */
  private normalizeSeriesData(data: any[]): Array<{ x: number; y: number }> {
    return data.map(point => {
      if ('date' in point && 'value' in point) {
        // TimeSeriesPoint
        return {
          x: new Date(point.date).getTime(),
          y: point.value
        }
      }
      return point
    })
  }
  
  /**
   * Get chart configuration for hydration
   */
  private getChartConfig(): any {
    return {
      series: this.data.series,
      options: this.options,
      theme: this.detectTheme()
    }
  }
  
  /**
   * Format numeric values
   */
  private formatValue(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toFixed(0)
  }
  
  /**
   * Get color for series by index
   */
  private getSeriesColor(index: number): string {
    const colors = [
      '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
      '#546E7A', '#26A69A', '#D10CE8', '#F86624', '#A5978B'
    ]
    return colors[index % colors.length] ?? '#666666'
  }
  
  /**
   * Update chart data
   */
  update(data: GrowthChartData): void {
    this.data = data
    
    if (this.chart) {
      this.chart.updateSeries(data.series.map(series => ({
        name: series.name,
        data: this.normalizeSeriesData(series.data)
      })))
    }
  }
  
  /**
   * Destroy the chart
   */
  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = undefined
    }
  }
  
  /**
   * Override navigation for data points
   */
  protected navigatePrevious(): void {
    if (this.currentDataIndex > 0) {
      this.currentDataIndex--
      this.announceDataPoint()
    }
  }
  
  protected navigateNext(): void {
    const maxIndex = Math.max(...this.data.series.map(s => s.data.length)) - 1
    if (this.currentDataIndex < maxIndex) {
      this.currentDataIndex++
      this.announceDataPoint()
    }
  }
  
  private announceDataPoint(): void {
    const messages: string[] = []
    
    this.data.series.forEach(series => {
      const point = series.data[this.currentDataIndex]
      if (point) {
        const value = 'value' in point ? point.value : point.y
        const date = 'date' in point 
          ? new Date(point.date).toLocaleDateString()
          : new Date(point.x).toLocaleDateString()
        
        messages.push(`${series.name}: ${this.formatValue(value)} on ${date}`)
      }
    })
    
    if (messages.length > 0) {
      this.announceToScreenReader(messages.join(', '))
    }
  }
  
  /**
   * Override table generation for growth data
   */
  protected getTableHeaders(): string {
    return `
      <th>Date</th>
      ${this.data.series.map(s => `<th>${s.name}</th>`).join('')}
    `
  }
  
  protected getTableRows(): string {
    // Get all unique dates
    const dateMap = new Map<number, Record<string, number>>()
    
    this.data.series.forEach(series => {
      series.data.forEach((point: any) => {
        const timestamp = 'date' in point 
          ? new Date(point.date).getTime()
          : point.x
        
        if (!dateMap.has(timestamp)) {
          dateMap.set(timestamp, {})
        }
        
        const value = 'value' in point ? point.value : point.y
        const dataObj = dateMap.get(timestamp)
        if (dataObj) {
          dataObj[series.name] = value
        }
      })
    })
    
    // Sort dates and generate rows
    const sortedDates = Array.from(dateMap.keys()).sort()
    
    return sortedDates.map(timestamp => {
      const data = dateMap.get(timestamp) || {}
      const date = new Date(timestamp).toLocaleDateString()
      
      return `
        <tr>
          <td>${date}</td>
          ${this.data.series.map(s => 
            `<td>${data[s.name] !== undefined ? this.formatValue(data[s.name]!) : '-'}</td>`
          ).join('')}
        </tr>
      `
    }).join('')
  }
}