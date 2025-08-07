/**
 * Contributor Bar Chart Component
 * Displays contributor statistics as horizontal bar chart
 * Supports server-side SVG rendering and client-side ApexCharts hydration
 */

import { ChartComponent, ChartOptions } from '../base/ChartComponent'

export interface ContributorData {
  name: string
  email?: string
  commits: number
  linesAdded: number
  linesDeleted: number
  filesChanged: number
  avatar?: string
}

export interface ContributorBarData {
  contributors: ContributorData[]
  metrics: Array<{
    key: keyof ContributorData
    label: string
    color: string
  }>
}

export interface ContributorBarOptions extends ChartOptions {
  maxContributors?: number
  sortBy?: keyof ContributorData
  orientation?: 'horizontal' | 'vertical'
  showAvatars?: boolean
  showMetricSelector?: boolean
}

export class ContributorBarChart extends ChartComponent<ContributorBarData> {
  protected options: ContributorBarOptions

  constructor(data: ContributorBarData, options: ContributorBarOptions = {}) {
    super(data, options)
    this.options = {
      maxContributors: 10,
      sortBy: 'commits',
      orientation: 'horizontal',
      showAvatars: true,
      showMetricSelector: true,
      ...options
    }
  }

  renderStatic(): string {
    const chartId = this.generateId()
    const config = this.getApexConfig()
    const contributors = this.getTopContributors()
    
    return `
      <div 
        id="${chartId}" 
        class="contributor-bar-chart" 
        data-chart-id="${chartId}"
        data-config='${JSON.stringify(config)}'
        data-theme="${this.options.theme}">
        
        ${this.options.showMetricSelector ? this.renderMetricSelector() : ''}
        
        <div class="chart-container">
          <div class="chart-content">
            ${this.toSVG()}
          </div>
          
          <noscript>
            ${this.renderAccessibleTable(contributors)}
          </noscript>
        </div>
        
        ${this.renderLegend(contributors)}
      </div>
    `
  }

  async hydrate(container: HTMLElement): Promise<void> {
    const chartEl = container.querySelector('.contributor-bar-chart') as HTMLElement
    if (!chartEl) return

    const chartId = chartEl.getAttribute('data-chart-id')!
    const configAttr = chartEl.getAttribute('data-config')
    
    if (!configAttr) return

    try {
      const config = JSON.parse(configAttr)
      
      // Dynamic import for client-side
      const { default: ApexCharts } = await import('apexcharts')
      
      const chartContent = chartEl.querySelector('.chart-content')
      if (!chartContent) return

      // Clear SVG and create chart
      chartContent.innerHTML = `<div id="apex-${chartId}"></div>`
      
      const chart = new ApexCharts(
        chartContent.querySelector(`#apex-${chartId}`),
        config
      )
      
      await chart.render()
      
      // Store reference for cleanup
      ;(chartEl as any).__chart = chart
      
      // Add metric selector functionality
      if (this.options.showMetricSelector) {
        this.addMetricSelectorHandlers(chartEl, chart)
      }
      
    } catch (error) {
      console.warn('Failed to hydrate ContributorBarChart:', error)
      // Fallback: keep the SVG version
    }
  }

  toSVG(): string {
    const width = this.options.width || 800
    const height = this.options.height || 500
    const padding = { top: 60, right: 80, bottom: 60, left: 200 }
    
    const contributors = this.getTopContributors()
    const currentMetric = this.getCurrentMetric()
    
    if (contributors.length === 0) {
      return this.renderEmptyState(width, height)
    }

    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    const barHeight = Math.max(20, chartHeight / contributors.length - 10)
    
    // Calculate scales
    const maxValue = Math.max(...contributors.map(c => c[currentMetric.key] as number))
    const xScale = (value: number) => (value / maxValue) * chartWidth
    
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img" 
           aria-labelledby="chart-title" aria-describedby="chart-desc">
        
        <title id="chart-title">Contributor Statistics - ${currentMetric.label}</title>
        <desc id="chart-desc">Bar chart showing ${currentMetric.label.toLowerCase()} for top contributors</desc>
        
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${currentMetric.color};stop-opacity:0.8"/>
            <stop offset="100%" style="stop-color:${currentMetric.color};stop-opacity:1"/>
          </linearGradient>
          
          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" flood-color="rgba(0,0,0,0.1)" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="${this.getBackgroundColor()}" rx="8"/>
        
        <!-- Chart Title -->
        <text x="${width / 2}" y="30" text-anchor="middle" 
              class="chart-title" 
              style="font-size: 18px; font-weight: 600; fill: ${this.getTextColor()}">
          ${this.options.title || `Top Contributors by ${currentMetric.label}`}
        </text>
        
        <!-- Bars and Labels -->
        ${contributors.map((contributor, index) => {
          const value = contributor[currentMetric.key] as number
          const barWidth = xScale(value)
          const y = padding.top + index * (barHeight + 10)
          
          return `
            <g class="contributor-bar" data-contributor="${contributor.name}">
              <!-- Contributor Name -->
              <text x="${padding.left - 10}" y="${y + barHeight / 2 + 4}" 
                    text-anchor="end" 
                    class="contributor-name"
                    style="font-size: 14px; font-weight: 500; fill: ${this.getTextColor()}">
                ${this.truncateName(contributor.name)}
              </text>
              
              ${this.options.showAvatars && contributor.avatar ? `
                <image x="${padding.left - 35}" y="${y + 2}" width="20" height="20" 
                       href="${contributor.avatar}" rx="10" ry="10"/>
              ` : ''}
              
              <!-- Bar -->
              <rect x="${padding.left}" y="${y}" 
                    width="${barWidth}" height="${barHeight}" 
                    fill="url(#barGradient)"
                    filter="url(#barShadow)"
                    rx="4" ry="4"/>
              
              <!-- Value Label -->
              <text x="${padding.left + barWidth + 8}" y="${y + barHeight / 2 + 4}" 
                    class="bar-value"
                    style="font-size: 12px; fill: ${this.getTextColor()}">
                ${this.formatValue(value, currentMetric.key)}
              </text>
            </g>
          `
        }).join('')}
        
        <!-- Y-axis line -->
        <line x1="${padding.left}" y1="${padding.top}" 
              x2="${padding.left}" y2="${height - padding.bottom}" 
              stroke="${this.getGridColor()}" stroke-width="1"/>
        
        <!-- X-axis ticks -->
        ${this.renderXAxisTicks(padding, chartWidth, maxValue)}
        
      </svg>
    `
    
    return svg
  }

  private getApexConfig(): any {
    const contributors = this.getTopContributors()
    const currentMetric = this.getCurrentMetric()
    
    return {
      chart: {
        type: 'bar',
        height: this.options.height || 500,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false
          }
        },
        background: 'transparent'
      },
      
      plotOptions: {
        bar: {
          horizontal: this.options.orientation === 'horizontal',
          borderRadius: 4,
          dataLabels: {
            position: 'right'
          }
        }
      },
      
      series: [{
        name: currentMetric.label,
        data: contributors.map(c => c[currentMetric.key] as number),
        color: currentMetric.color
      }],
      
      xaxis: {
        categories: contributors.map(c => this.truncateName(c.name)),
        labels: {
          style: {
            colors: this.getTextColor(),
            fontSize: '12px'
          }
        }
      },
      
      yaxis: {
        labels: {
          style: {
            colors: this.getTextColor(),
            fontSize: '12px'
          },
          formatter: (value: number) => this.formatValue(value, currentMetric.key)
        }
      },
      
      dataLabels: {
        enabled: true,
        formatter: (value: number) => this.formatValue(value, currentMetric.key),
        style: {
          colors: ['#fff'],
          fontSize: '11px'
        }
      },
      
      tooltip: {
        theme: this.options.theme === 'dark' ? 'dark' : 'light',
        y: {
          formatter: (value: number) => this.formatValue(value, currentMetric.key)
        },
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const contributor = contributors[dataPointIndex]
          return this.renderTooltip(contributor, currentMetric)
        }
      },
      
      grid: {
        borderColor: this.getGridColor(),
        strokeDashArray: 2
      },
      
      theme: {
        mode: this.options.theme || 'light'
      }
    }
  }

  private getTopContributors(): ContributorData[] {
    const sortBy = this.options.sortBy || 'commits'
    
    return [...this.data.contributors]
      .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))
      .slice(0, this.options.maxContributors || 10)
  }

  private getCurrentMetric() {
    return this.data.metrics[0] || {
      key: 'commits' as keyof ContributorData,
      label: 'Commits',
      color: '#008FFB'
    }
  }

  private renderMetricSelector(): string {
    return `
      <div class="metric-selector" role="tablist" aria-label="Select metric to display">
        ${this.data.metrics.map((metric, index) => `
          <button 
            role="tab"
            aria-selected="${index === 0}"
            aria-controls="chart-content"
            data-metric="${metric.key}"
            class="metric-button ${index === 0 ? 'active' : ''}"
            style="border-left: 3px solid ${metric.color}">
            ${metric.label}
          </button>
        `).join('')}
      </div>
    `
  }

  private renderAccessibleTable(contributors: ContributorData[]): string {
    const currentMetric = this.getCurrentMetric()
    
    return `
      <table class="contributor-data" role="table" aria-label="Contributor statistics">
        <caption>Top Contributors by ${currentMetric.label}</caption>
        <thead>
          <tr>
            <th scope="col">Contributor</th>
            <th scope="col">Commits</th>
            <th scope="col">Lines Added</th>
            <th scope="col">Lines Deleted</th>
            <th scope="col">Files Changed</th>
          </tr>
        </thead>
        <tbody>
          ${contributors.map(contributor => `
            <tr>
              <td>
                <strong>${contributor.name}</strong>
                ${contributor.email ? `<br><small>${contributor.email}</small>` : ''}
              </td>
              <td>${this.formatValue(contributor.commits, 'commits')}</td>
              <td>${this.formatValue(contributor.linesAdded, 'linesAdded')}</td>
              <td>${this.formatValue(contributor.linesDeleted, 'linesDeleted')}</td>
              <td>${this.formatValue(contributor.filesChanged, 'filesChanged')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }

  private renderLegend(contributors: ContributorData[]): string {
    const currentMetric = this.getCurrentMetric()
    
    return `
      <div class="chart-legend" role="region" aria-label="Chart information">
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${currentMetric.color}"></div>
          <span class="legend-label">${currentMetric.label}</span>
        </div>
        <div class="legend-stats">
          <span class="total-contributors">${contributors.length} contributors shown</span>
          <span class="total-value">
            Total: ${this.formatValue(
              contributors.reduce((sum, c) => sum + (c[currentMetric.key] as number), 0),
              currentMetric.key
            )}
          </span>
        </div>
      </div>
    `
  }

  private renderTooltip(contributor: ContributorData, metric: typeof this.data.metrics[0]): string {
    return `
      <div class="contributor-tooltip">
        <div class="tooltip-header">
          ${this.options.showAvatars && contributor.avatar ? 
            `<img src="${contributor.avatar}" alt="${contributor.name}" width="24" height="24" style="border-radius: 50%; margin-right: 8px;">` : ''}
          <strong>${contributor.name}</strong>
        </div>
        
        <div class="tooltip-content">
          <div class="tooltip-row highlight">
            <span>${metric.label}:</span>
            <strong>${this.formatValue(contributor[metric.key] as number, metric.key)}</strong>
          </div>
          
          <div class="tooltip-divider"></div>
          
          <div class="tooltip-row">
            <span>Commits:</span>
            <span>${this.formatValue(contributor.commits, 'commits')}</span>
          </div>
          <div class="tooltip-row">
            <span>Lines Added:</span>
            <span>${this.formatValue(contributor.linesAdded, 'linesAdded')}</span>
          </div>
          <div class="tooltip-row">
            <span>Lines Deleted:</span>
            <span>${this.formatValue(contributor.linesDeleted, 'linesDeleted')}</span>
          </div>
          <div class="tooltip-row">
            <span>Files Changed:</span>
            <span>${this.formatValue(contributor.filesChanged, 'filesChanged')}</span>
          </div>
        </div>
      </div>
    `
  }

  private addMetricSelectorHandlers(container: HTMLElement, chart: any): void {
    const buttons = container.querySelectorAll('.metric-button')
    
    buttons.forEach(button => {
      button.addEventListener('click', async () => {
        const metricKey = button.getAttribute('data-metric') as keyof ContributorData
        const metric = this.data.metrics.find(m => m.key === metricKey)
        
        if (!metric) return
        
        // Update active state
        buttons.forEach(b => {
          b.classList.remove('active')
          b.setAttribute('aria-selected', 'false')
        })
        button.classList.add('active')
        button.setAttribute('aria-selected', 'true')
        
        // Update chart data
        const contributors = this.getTopContributors()
        const newSeries = [{
          name: metric.label,
          data: contributors.map(c => c[metric.key] as number),
          color: metric.color
        }]
        
        await chart.updateSeries(newSeries)
        
        // Announce change to screen readers
        this.announceMetricChange(metric.label)
      })
    })
  }

  private announceMetricChange(metricLabel: string): void {
    // Create or update live region for screen readers
    let liveRegion = document.querySelector('#chart-live-region')
    
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'chart-live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
      document.body.appendChild(liveRegion)
    }
    
    liveRegion.textContent = `Chart updated to show ${metricLabel}`
  }

  private formatValue(value: number, metric: keyof ContributorData): string {
    if (typeof value !== 'number' || isNaN(value)) return '0'
    
    if (metric === 'linesAdded' || metric === 'linesDeleted') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    }
    
    return value.toLocaleString()
  }

  private truncateName(name: string): string {
    if (name.length <= 20) return name
    
    const parts = name.split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 18) + '...'
    }
    
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
  }

  private renderXAxisTicks(padding: any, chartWidth: number, maxValue: number): string {
    const tickCount = 5
    const ticks = []
    
    for (let i = 0; i <= tickCount; i++) {
      const value = (maxValue / tickCount) * i
      const x = padding.left + (chartWidth / tickCount) * i
      
      ticks.push(`
        <g class="x-tick">
          <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top - 5}" 
                stroke="${this.getGridColor()}" stroke-width="1"/>
          <text x="${x}" y="${padding.top - 10}" text-anchor="middle" 
                style="font-size: 10px; fill: ${this.getTextColor()}">
            ${this.formatValue(value, this.getCurrentMetric().key)}
          </text>
        </g>
      `)
    }
    
    return ticks.join('')
  }

  private renderEmptyState(width: number, height: number): string {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${this.getBackgroundColor()}" rx="8"/>
        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" 
              style="font-size: 16px; fill: ${this.getTextColor()}; opacity: 0.6;">
          No contributor data available
        </text>
      </svg>
    `
  }

  private getBackgroundColor(): string {
    return this.options.theme === 'dark' ? '#1a1a1a' : '#ffffff'
  }

  private getTextColor(): string {
    return this.options.theme === 'dark' ? '#ffffff' : '#333333'
  }

  private getGridColor(): string {
    return this.options.theme === 'dark' ? '#404040' : '#e0e0e0'
  }

  destroy(): void {
    const chartEl = document.querySelector(`[data-chart-id="${this.generateId()}"]`)
    if (chartEl) {
      const chart = (chartEl as any).__chart
      if (chart && chart.destroy) {
        chart.destroy()
      }
    }
  }
}