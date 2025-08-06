/**
 * File Types Distribution Pie Chart - Shows lines of code by file type
 * @module @repo-statter/visualizations/charts
 */

import { ChartComponent, ChartData, ChartOptions } from '../base/ChartComponent.js'

export interface FileTypeData extends ChartData {
  series: number[]
  labels: string[]
  colors?: string[]
}

export class FileTypesPieChart extends ChartComponent<FileTypeData> {
  private defaultColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#48DBFB', '#1DD1A1', '#FFC048',
    '#C44569', '#F8B500', '#6C7B7F', '#A55EEA', '#26C6DA'
  ]

  constructor(data: FileTypeData, options: ChartOptions = {}) {
    super(data, options)
    
    // Validate data
    if (data.series.length !== data.labels.length) {
      throw new Error('Series and labels arrays must have the same length')
    }
  }

  renderStatic(): string {
    const id = this.generateId()
    const svg = this.toSVG()
    const theme = this.detectTheme()
    const colors = this.getThemeColors()
    
    return `
      <div id="${id}" 
           class="file-types-chart ${theme}-theme" 
           data-chart-id="${this.chartId}"
           style="background: ${colors.background}; border-radius: 8px; padding: 16px;">
        <div class="chart-header" style="margin-bottom: 16px;">
          ${this.options.title ? `
            <h3 style="margin: 0 0 8px 0; color: ${colors.text}; font-size: 18px; font-weight: 600;">
              ${this.options.title}
            </h3>
          ` : ''}
          ${this.options.subtitle ? `
            <p style="margin: 0; color: ${colors.text}; font-size: 14px; opacity: 0.8;">
              ${this.options.subtitle}
            </p>
          ` : ''}
        </div>
        
        <div class="chart-container" style="display: flex; gap: 24px; align-items: flex-start;">
          <div class="chart-svg" style="flex: 1; min-width: 0;">
            ${svg}
          </div>
          
          <div class="chart-legend" style="flex: 0 0 200px;">
            ${this.renderLegend()}
          </div>
        </div>
        
        <noscript>
          <div style="margin-top: 16px;">
            ${this.renderDataTable()}
          </div>
        </noscript>
      </div>
    `
  }

  async hydrate(container: HTMLElement): Promise<void> {
    const chartEl = container.querySelector(`[data-chart-id="${this.chartId}"]`) as HTMLElement
    if (!chartEl) return

    this.container = chartEl
    this.addAccessibilityAttributes(chartEl)
    
    // Dynamic import of ApexCharts only when needed
    try {
      const ApexChartsModule = await import('apexcharts')
      const ApexCharts = ApexChartsModule.default || ApexChartsModule
      
      const config = this.getApexConfig()
      const chart = new ApexCharts(chartEl.querySelector('.chart-svg'), config)
      await chart.render()
      
      // Store reference for updates
      ;(chartEl as any).__chart = chart
      
      // Add interactivity
      this.addInteractivity(chart, chartEl)
    } catch (error) {
      console.warn('Failed to load ApexCharts, using static SVG fallback:', error)
    }
  }

  toSVG(): string {
    const size = typeof this.options.width === 'number' ? this.options.width : 400
    const center = size / 2
    const radius = size * 0.35
    
    // Calculate total for percentages
    const total = this.data.series.reduce((sum, val) => sum + val, 0)
    if (total === 0) {
      return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="${center}" y="${center}" text-anchor="middle" fill="#666">No data available</text>
      </svg>`
    }

    let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.options.title || 'File types distribution chart'}">`
    
    // Background
    const colors = this.getThemeColors()
    svg += `<rect width="${size}" height="${size}" fill="${colors.background}" rx="8"/>`
    
    let currentAngle = -Math.PI / 2 // Start at top

    this.data.series.forEach((value, index) => {
      if (value <= 0) return // Skip zero values
      
      const percentage = value / total
      const angle = percentage * Math.PI * 2
      const color = this.getColor(index)
      
      // Draw pie slice
      svg += this.drawPieSlice(
        center,
        center,
        radius,
        currentAngle,
        currentAngle + angle,
        color,
        index
      )
      
      // Add percentage label for slices > 5%
      if (percentage > 0.05) {
        const labelAngle = currentAngle + angle / 2
        const labelRadius = radius * 0.7
        const labelX = center + Math.cos(labelAngle) * labelRadius
        const labelY = center + Math.sin(labelAngle) * labelRadius
        
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dy="0.35em" 
                      fill="white" font-size="12" font-weight="bold" 
                      style="paint-order: stroke fill; stroke: ${color}; stroke-width: 3px; stroke-linejoin: round;">`
        svg += `${(percentage * 100).toFixed(1)}%`
        svg += `</text>`
      }
      
      currentAngle += angle
    })
    
    // Add title if provided
    if (this.options.title) {
      svg += `<text x="${center}" y="20" text-anchor="middle" fill="${colors.text}" font-size="16" font-weight="bold">`
      svg += `${this.options.title}`
      svg += `</text>`
    }
    
    svg += '</svg>'
    return svg
  }

  update(data: FileTypeData): void {
    this.data = this.sanitizeData(data)
    
    if (this.container && (this.container as any).__chart) {
      const chart = (this.container as any).__chart
      chart.updateSeries(this.data.series)
    } else if (this.container) {
      // Update static content
      const svgContainer = this.container.querySelector('.chart-svg')
      const legendContainer = this.container.querySelector('.chart-legend')
      
      if (svgContainer) {
        svgContainer.innerHTML = this.toSVG()
      }
      
      if (legendContainer) {
        legendContainer.innerHTML = this.renderLegend()
      }
    }
  }

  destroy(): void {
    if (this.container && (this.container as any).__chart) {
      ;(this.container as any).__chart.destroy()
      delete (this.container as any).__chart
    }
  }

  private getApexConfig(): any {
    return {
      chart: {
        type: 'donut',
        height: this.options.height || 400,
        animations: {
          enabled: this.options.animations !== false,
          easing: 'easeinout',
          speed: 800
        },
        toolbar: {
          show: false
        }
      },
      series: this.data.series,
      labels: this.data.labels,
      colors: this.data.colors || this.defaultColors,
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Lines',
                formatter: () => {
                  const total = this.data.series.reduce((sum, val) => sum + val, 0)
                  return total.toLocaleString()
                }
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
        style: {
          fontSize: '12px',
          fontWeight: 'bold',
          colors: ['#fff']
        },
        dropShadow: {
          enabled: true,
          color: '#000',
          top: 1,
          left: 1,
          blur: 1,
          opacity: 0.6
        }
      },
      legend: {
        show: false // We use custom legend
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (value: number) => `${value.toLocaleString()} lines`
        }
      },
      theme: {
        mode: this.detectTheme()
      }
    }
  }

  private renderLegend(): string {
    const colors = this.getThemeColors()
    const total = this.data.series.reduce((sum, val) => sum + val, 0)
    
    return `
      <div class="pie-legend" style="font-family: system-ui, -apple-system, sans-serif;">
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid ${colors.grid};">
          <div style="font-size: 14px; font-weight: 600; color: ${colors.text}; margin-bottom: 4px;">
            File Types
          </div>
          <div style="font-size: 12px; color: ${colors.text}; opacity: 0.7;">
            Total: ${total.toLocaleString()} lines
          </div>
        </div>
        
        <ul style="list-style: none; margin: 0; padding: 0; font-size: 13px;">
          ${this.data.labels.map((label, index) => {
            const value = this.data.series[index] ?? 0
            const percentage = total > 0 ? (value / total) * 100 : 0
            const color = this.getColor(index)
            
            return `
              <li style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer; transition: opacity 0.2s;"
                  data-series-index="${index}"
                  class="legend-item">
                <span class="color-indicator" 
                      style="width: 12px; height: 12px; background-color: ${color}; border-radius: 2px; margin-right: 8px; flex-shrink: 0;"></span>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="file-type" style="color: ${colors.text}; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span>
                    <span style="color: ${colors.text}; opacity: 0.8; font-size: 12px; margin-left: 8px;">${percentage.toFixed(1)}%</span>
                  </div>
                  <div style="color: ${colors.text}; opacity: 0.6; font-size: 11px; margin-top: 2px;">
                    ${value?.toLocaleString() ?? '0'} lines
                  </div>
                </div>
              </li>
            `
          }).join('')}
        </ul>
      </div>
    `
  }

  private drawPieSlice(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string,
    index: number
  ): string {
    const x1 = cx + Math.cos(startAngle) * radius
    const y1 = cy + Math.sin(startAngle) * radius
    const x2 = cx + Math.cos(endAngle) * radius
    const y2 = cy + Math.sin(endAngle) * radius

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')

    return `
      <path d="${pathData}" 
            fill="${color}" 
            stroke="white" 
            stroke-width="2"
            data-series-index="${index}"
            style="cursor: pointer; transition: opacity 0.2s;"
            role="button"
            aria-label="${this.data.labels[index] ?? 'Unknown'}: ${this.data.series[index] ?? 0} lines">
        <title>${this.data.labels[index] ?? 'Unknown'}: ${(this.data.series[index] ?? 0).toLocaleString()} lines</title>
      </path>
    `
  }

  private getColor(index: number): string {
    if (this.data.colors && this.data.colors[index]) {
      return this.data.colors[index]!
    }
    return this.defaultColors[index % this.defaultColors.length] ?? '#666666'
  }

  private addInteractivity(chart: any, container: HTMLElement): void {
    const legend = container.querySelector('.pie-legend')
    if (!legend) return

    // Add click handlers for legend items
    const legendItems = legend.querySelectorAll('.legend-item')
    
    legendItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        // Toggle series visibility
        if (this.data.labels[index]) {
          chart.toggleSeries(this.data.labels[index])
        }
        item.classList.toggle('inactive')
        
        // Update opacity
        const opacity = item.classList.contains('inactive') ? '0.3' : '1'
        ;(item as HTMLElement).style.opacity = opacity
      })

      // Add hover effects
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('inactive')) {
          ;(item as HTMLElement).style.backgroundColor = this.getThemeColors().grid
        }
      })

      item.addEventListener('mouseleave', () => {
        ;(item as HTMLElement).style.backgroundColor = 'transparent'
      })
    })

    // Handle chart click events
    chart.addEventListener('dataPointSelection', (event: any, chartContext: any, config: any) => {
      const dataPointIndex = config.dataPointIndex
      const legendItem = legendItems[dataPointIndex]
      
      if (legendItem) {
        legendItem.classList.toggle('inactive')
        const opacity = legendItem.classList.contains('inactive') ? '0.3' : '1'
        ;(legendItem as HTMLElement).style.opacity = opacity
      }
    })
  }

  protected getTableHeaders(): string {
    return '<th>File Type</th><th>Lines of Code</th><th>Percentage</th>'
  }

  protected getTableRows(): string {
    const total = this.data.series.reduce((sum, val) => sum + val, 0)
    
    return this.data.labels.map((label, index) => {
      const value = this.data.series[index] ?? 0
      const percentage = total > 0 ? (value / total) * 100 : 0
      
      return `
        <tr>
          <td style="display: flex; align-items: center;">
            <span style="width: 12px; height: 12px; background-color: ${this.getColor(index)}; border-radius: 2px; margin-right: 8px; display: inline-block;"></span>
            ${label}
          </td>
          <td>${value?.toLocaleString() ?? '0'}</td>
          <td>${percentage.toFixed(1)}%</td>
        </tr>
      `
    }).join('')
  }
}