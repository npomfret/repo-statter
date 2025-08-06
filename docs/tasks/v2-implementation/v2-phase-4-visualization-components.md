# Phase 4: Visualization Components

## Overview
Create all visualization components as isolated, testable web components that can be rendered both server-side and client-side. Each component must work independently in the browser playground.

## Goals
1. Build reusable chart components with server-side rendering
2. Create interactive widgets and controls
3. Implement time-based filtering and chart toggling
4. Ensure accessibility and performance
5. Enable isolated testing of each component

## Implementation Plan Summary

### Architecture Strategy
- **Server-Side First**: HTML/SVG generation for immediate display
- **Progressive Enhancement**: JavaScript hydration for interactivity  
- **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation
- **Performance**: < 100ms render time, < 200ms first paint

### Component Structure
```
packages/visualizations/
├── src/
│   ├── base/                # Enhanced base classes
│   ├── charts/              # Chart components
│   ├── widgets/             # Interactive widgets
│   ├── registry/            # Component registry
│   └── utils/               # SVG, a11y, animation helpers
apps/playground/             # Browser testing environment
```

### Testing Strategy
1. **Unit Tests** - Server-side rendering validation
2. **Visual Tests** - Playwright screenshot comparison
3. **Integration Tests** - Phase 3 data compatibility
4. **E2E Tests** - Browser interaction testing
5. **Accessibility Tests** - WCAG compliance checks

## Tasks

### 4.1 Chart Component Architecture

#### Description
Create base chart component infrastructure that all specific charts will extend.

#### packages/visualizations/src/base/ChartComponent.ts
```typescript
export interface ChartData {
  series: any[]
  categories?: string[]
  metadata?: Record<string, unknown>
}

export interface ChartOptions {
  title?: string
  width?: number
  height?: number
  responsive?: boolean
  theme?: 'light' | 'dark'
}

export abstract class ChartComponent<T extends ChartData = ChartData> {
  protected data: T
  protected options: ChartOptions
  
  constructor(data: T, options: ChartOptions = {}) {
    this.data = data
    this.options = {
      responsive: true,
      theme: 'light',
      ...options
    }
  }
  
  abstract render(): string // Server-side HTML
  abstract hydrate(container: HTMLElement): void // Client-side enhancement
  abstract toSVG(): string // Static SVG export
  
  protected generateId(): string {
    return `chart-${Math.random().toString(36).substr(2, 9)}`
  }
  
  protected sanitizeData(data: T): T {
    // Ensure data is safe for rendering
    return JSON.parse(JSON.stringify(data))
  }
}
```

#### Testing in Playground
```typescript
// apps/playground/src/components/chart-tester.ts
export class ChartTester {
  constructor(private container: HTMLElement) {}
  
  async loadChart(type: string, data: any): Promise<void> {
    const ChartClass = await import(`@repo-statter/visualizations/${type}`)
    const chart = new ChartClass.default(data)
    
    // Render server-side HTML
    this.container.innerHTML = chart.render()
    
    // Hydrate for interactivity
    chart.hydrate(this.container)
  }
  
  updateData(newData: any): void {
    // Live data updates for testing
  }
}
```

### 4.2 Growth Over Time Chart

#### Description
Line chart showing repository growth (commits, LOC, contributors) over time.

#### packages/visualizations/src/charts/GrowthChart.ts
```typescript
import { ChartComponent, ChartData } from '../base/ChartComponent'

export interface GrowthChartData extends ChartData {
  series: Array<{
    name: string
    data: Array<{ x: number; y: number }>
  }>
}

export class GrowthChart extends ChartComponent<GrowthChartData> {
  render(): string {
    const id = this.generateId()
    const config = this.getApexConfig()
    
    return `
      <div id="${id}" class="growth-chart" data-config='${JSON.stringify(config)}'>
        <noscript>
          ${this.renderStaticTable()}
        </noscript>
      </div>
    `
  }
  
  hydrate(container: HTMLElement): void {
    const chartEl = container.querySelector('.growth-chart')
    if (!chartEl) return
    
    const config = JSON.parse(chartEl.getAttribute('data-config') || '{}')
    
    // Dynamic import of ApexCharts only when needed
    import('apexcharts').then(({ default: ApexCharts }) => {
      const chart = new ApexCharts(chartEl, config)
      chart.render()
      
      // Store reference for updates
      (chartEl as any).__chart = chart
    })
  }
  
  toSVG(): string {
    // Generate static SVG for server-side rendering
    const width = this.options.width || 800
    const height = this.options.height || 400
    const padding = 40
    
    // Calculate scales
    const xScale = this.createTimeScale(width - padding * 2)
    const yScale = this.createLinearScale(height - padding * 2)
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
    
    // Draw axes
    svg += this.drawAxes(xScale, yScale, padding)
    
    // Draw lines
    this.data.series.forEach((series, index) => {
      svg += this.drawLine(series.data, xScale, yScale, padding, index)
    })
    
    // Draw legend
    svg += this.drawLegend(this.data.series, width, padding)
    
    svg += '</svg>'
    return svg
  }
  
  private getApexConfig(): any {
    return {
      chart: {
        type: 'line',
        height: this.options.height || 400,
        animations: {
          enabled: false // Better performance
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true
          }
        }
      },
      series: this.data.series,
      xaxis: {
        type: 'datetime',
        labels: {
          formatter: (value: number) => {
            return new Date(value).toLocaleDateString()
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => {
            return value.toLocaleString()
          }
        }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: {
          formatter: (value: number) => {
            return new Date(value).toLocaleDateString()
          }
        }
      },
      theme: {
        mode: this.options.theme
      }
    }
  }
  
  private renderStaticTable(): string {
    // Accessible fallback table
    return `
      <table class="growth-data">
        <caption>${this.options.title || 'Repository Growth Over Time'}</caption>
        <thead>
          <tr>
            <th>Date</th>
            ${this.data.series.map(s => `<th>${s.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${this.renderTableRows()}
        </tbody>
      </table>
    `
  }
  
  private createTimeScale(width: number): (date: number) => number {
    const dates = this.data.series[0]?.data.map(d => d.x) || []
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    
    return (date: number) => {
      return ((date - min) / (max - min)) * width
    }
  }
  
  private createLinearScale(height: number): (value: number) => number {
    const values = this.data.series.flatMap(s => s.data.map(d => d.y))
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    return (value: number) => {
      return height - ((value - min) / (max - min)) * height
    }
  }
}
```

#### Testing
```typescript
describe('GrowthChart', () => {
  it('should render static HTML', () => {
    const data: GrowthChartData = {
      series: [{
        name: 'Commits',
        data: [
          { x: Date.parse('2024-01-01'), y: 100 },
          { x: Date.parse('2024-02-01'), y: 150 },
          { x: Date.parse('2024-03-01'), y: 200 }
        ]
      }]
    }
    
    const chart = new GrowthChart(data)
    const html = chart.render()
    
    expect(html).toContain('growth-chart')
    expect(html).toContain('data-config')
    expect(html).toContain('<table')
  })
  
  it('should generate valid SVG', () => {
    const chart = new GrowthChart(testData)
    const svg = chart.toSVG()
    
    expect(svg).toContain('<svg')
    expect(svg).toContain('<path')
    expect(svg).toBeValidSVG()
  })
})
```

### 4.3 File Types Distribution

#### Description
Pie/donut chart showing lines of code by file type.

#### packages/visualizations/src/charts/FileTypesPieChart.ts
```typescript
export interface FileTypeData extends ChartData {
  series: number[]
  labels: string[]
  colors?: string[]
}

export class FileTypesPieChart extends ChartComponent<FileTypeData> {
  private defaultColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#48DBFB', '#1DD1A1', '#FFC048'
  ]
  
  render(): string {
    const id = this.generateId()
    const config = this.getApexConfig()
    
    return `
      <div id="${id}" class="file-types-chart" data-config='${JSON.stringify(config)}'>
        <div class="chart-legend">
          ${this.renderLegend()}
        </div>
        <noscript>
          ${this.renderStaticPie()}
        </noscript>
      </div>
    `
  }
  
  hydrate(container: HTMLElement): void {
    const chartEl = container.querySelector('.file-types-chart')
    if (!chartEl) return
    
    const config = JSON.parse(chartEl.getAttribute('data-config') || '{}')
    
    import('apexcharts').then(({ default: ApexCharts }) => {
      const chart = new ApexCharts(chartEl, config)
      chart.render()
      
      // Add click handlers for interactivity
      this.addInteractivity(chart, chartEl)
    })
  }
  
  toSVG(): string {
    const size = this.options.width || 400
    const center = size / 2
    const radius = size * 0.35
    
    let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
    
    // Calculate angles
    const total = this.data.series.reduce((sum, val) => sum + val, 0)
    let currentAngle = -Math.PI / 2 // Start at top
    
    this.data.series.forEach((value, index) => {
      const percentage = value / total
      const angle = percentage * Math.PI * 2
      
      // Draw pie slice
      svg += this.drawPieSlice(
        center,
        center,
        radius,
        currentAngle,
        currentAngle + angle,
        this.getColor(index)
      )
      
      // Add label
      const labelAngle = currentAngle + angle / 2
      const labelX = center + Math.cos(labelAngle) * (radius * 0.7)
      const labelY = center + Math.sin(labelAngle) * (radius * 0.7)
      
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="white" font-size="12">`
      svg += `${(percentage * 100).toFixed(1)}%`
      svg += `</text>`
      
      currentAngle += angle
    })
    
    svg += '</svg>'
    return svg
  }
  
  private renderLegend(): string {
    return `
      <ul class="pie-legend">
        ${this.data.labels.map((label, index) => `
          <li>
            <span class="color-box" style="background-color: ${this.getColor(index)}"></span>
            <span class="label">${label}</span>
            <span class="value">${this.data.series[index].toLocaleString()} lines</span>
          </li>
        `).join('')}
      </ul>
    `
  }
  
  private drawPieSlice(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string
  ): string {
    const x1 = cx + Math.cos(startAngle) * radius
    const y1 = cy + Math.sin(startAngle) * radius
    const x2 = cx + Math.cos(endAngle) * radius
    const y2 = cy + Math.sin(endAngle) * radius
    
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    
    return `
      <path d="
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      " fill="${color}" stroke="white" stroke-width="2"/>
    `
  }
  
  private getColor(index: number): string {
    if (this.data.colors && this.data.colors[index]) {
      return this.data.colors[index]
    }
    return this.defaultColors[index % this.defaultColors.length]
  }
  
  private addInteractivity(chart: any, container: HTMLElement): void {
    // Add click handler to toggle data series
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const legendItem = target.closest('.pie-legend li')
      
      if (legendItem) {
        const index = Array.from(legendItem.parentElement!.children).indexOf(legendItem)
        chart.toggleSeries(this.data.labels[index])
        legendItem.classList.toggle('inactive')
      }
    })
  }
}
```

### 4.4 Time Range Slider

#### Description
Interactive slider for filtering data by time range.

#### packages/visualizations/src/widgets/TimeRangeSlider.ts
```typescript
export interface TimeRangeData {
  min: Date
  max: Date
  current: {
    start: Date
    end: Date
  }
}

export class TimeRangeSlider {
  private onChange?: (range: { start: Date; end: Date }) => void
  
  constructor(
    private data: TimeRangeData,
    private options: { onChange?: (range: any) => void } = {}
  ) {
    this.onChange = options.onChange
  }
  
  render(): string {
    const minTime = this.data.min.getTime()
    const maxTime = this.data.max.getTime()
    const startTime = this.data.current.start.getTime()
    const endTime = this.data.current.end.getTime()
    
    return `
      <div class="time-range-slider" 
           data-min="${minTime}" 
           data-max="${maxTime}"
           data-start="${startTime}"
           data-end="${endTime}">
        <div class="slider-labels">
          <span class="start-label">${this.formatDate(this.data.current.start)}</span>
          <span class="end-label">${this.formatDate(this.data.current.end)}</span>
        </div>
        <div class="slider-track">
          <div class="slider-range"></div>
          <button class="slider-handle start" 
                  role="slider" 
                  aria-label="Start date"
                  aria-valuemin="${minTime}"
                  aria-valuemax="${maxTime}"
                  aria-valuenow="${startTime}">
          </button>
          <button class="slider-handle end" 
                  role="slider" 
                  aria-label="End date"
                  aria-valuemin="${minTime}"
                  aria-valuemax="${maxTime}"
                  aria-valuenow="${endTime}">
          </button>
        </div>
        <div class="preset-buttons">
          <button data-range="1m">1 Month</button>
          <button data-range="3m">3 Months</button>
          <button data-range="6m">6 Months</button>
          <button data-range="1y">1 Year</button>
          <button data-range="all">All Time</button>
        </div>
      </div>
    `
  }
  
  hydrate(container: HTMLElement): void {
    const slider = container.querySelector('.time-range-slider')
    if (!slider) return
    
    const startHandle = slider.querySelector('.slider-handle.start') as HTMLElement
    const endHandle = slider.querySelector('.slider-handle.end') as HTMLElement
    const range = slider.querySelector('.slider-range') as HTMLElement
    const startLabel = slider.querySelector('.start-label') as HTMLElement
    const endLabel = slider.querySelector('.end-label') as HTMLElement
    
    // Initialize positions
    this.updateSliderPositions(slider, startHandle, endHandle, range)
    
    // Add drag functionality
    this.addDragHandlers(slider, startHandle, endHandle, range, startLabel, endLabel)
    
    // Add preset button handlers
    this.addPresetHandlers(slider)
  }
  
  private addDragHandlers(
    slider: Element,
    startHandle: HTMLElement,
    endHandle: HTMLElement,
    range: HTMLElement,
    startLabel: HTMLElement,
    endLabel: HTMLElement
  ): void {
    let isDragging: 'start' | 'end' | null = null
    
    const handleMouseDown = (handle: 'start' | 'end') => (e: MouseEvent) => {
      e.preventDefault()
      isDragging = handle
      document.body.style.cursor = 'grabbing'
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const rect = slider.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      
      const minTime = parseInt(slider.getAttribute('data-min')!)
      const maxTime = parseInt(slider.getAttribute('data-max')!)
      const newTime = minTime + (maxTime - minTime) * percentage
      
      if (isDragging === 'start') {
        const endTime = parseInt(slider.getAttribute('data-end')!)
        if (newTime < endTime) {
          slider.setAttribute('data-start', newTime.toString())
          this.updateSliderPositions(slider, startHandle, endHandle, range)
          startLabel.textContent = this.formatDate(new Date(newTime))
          this.notifyChange(slider)
        }
      } else {
        const startTime = parseInt(slider.getAttribute('data-start')!)
        if (newTime > startTime) {
          slider.setAttribute('data-end', newTime.toString())
          this.updateSliderPositions(slider, startHandle, endHandle, range)
          endLabel.textContent = this.formatDate(new Date(newTime))
          this.notifyChange(slider)
        }
      }
    }
    
    const handleMouseUp = () => {
      isDragging = null
      document.body.style.cursor = ''
    }
    
    startHandle.addEventListener('mousedown', handleMouseDown('start'))
    endHandle.addEventListener('mousedown', handleMouseDown('end'))
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    // Touch support
    startHandle.addEventListener('touchstart', (e) => {
      handleMouseDown('start')(e as any)
    })
    endHandle.addEventListener('touchstart', (e) => {
      handleMouseDown('end')(e as any)
    })
    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        handleMouseMove({ clientX: e.touches[0].clientX } as any)
      }
    })
    document.addEventListener('touchend', handleMouseUp)
  }
  
  private addPresetHandlers(slider: Element): void {
    const buttons = slider.querySelectorAll('.preset-buttons button')
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const range = button.getAttribute('data-range')!
        const maxTime = parseInt(slider.getAttribute('data-max')!)
        const minTime = parseInt(slider.getAttribute('data-min')!)
        
        let startTime: number
        let endTime = maxTime
        
        switch (range) {
          case '1m':
            startTime = maxTime - 30 * 24 * 60 * 60 * 1000
            break
          case '3m':
            startTime = maxTime - 90 * 24 * 60 * 60 * 1000
            break
          case '6m':
            startTime = maxTime - 180 * 24 * 60 * 60 * 1000
            break
          case '1y':
            startTime = maxTime - 365 * 24 * 60 * 60 * 1000
            break
          case 'all':
          default:
            startTime = minTime
            break
        }
        
        startTime = Math.max(minTime, startTime)
        
        slider.setAttribute('data-start', startTime.toString())
        slider.setAttribute('data-end', endTime.toString())
        
        // Update UI
        const startHandle = slider.querySelector('.slider-handle.start') as HTMLElement
        const endHandle = slider.querySelector('.slider-handle.end') as HTMLElement
        const range = slider.querySelector('.slider-range') as HTMLElement
        const startLabel = slider.querySelector('.start-label') as HTMLElement
        const endLabel = slider.querySelector('.end-label') as HTMLElement
        
        this.updateSliderPositions(slider, startHandle, endHandle, range)
        startLabel.textContent = this.formatDate(new Date(startTime))
        endLabel.textContent = this.formatDate(new Date(endTime))
        
        this.notifyChange(slider)
      })
    })
  }
  
  private updateSliderPositions(
    slider: Element,
    startHandle: HTMLElement,
    endHandle: HTMLElement,
    range: HTMLElement
  ): void {
    const minTime = parseInt(slider.getAttribute('data-min')!)
    const maxTime = parseInt(slider.getAttribute('data-max')!)
    const startTime = parseInt(slider.getAttribute('data-start')!)
    const endTime = parseInt(slider.getAttribute('data-end')!)
    
    const startPercentage = ((startTime - minTime) / (maxTime - minTime)) * 100
    const endPercentage = ((endTime - minTime) / (maxTime - minTime)) * 100
    
    startHandle.style.left = `${startPercentage}%`
    endHandle.style.left = `${endPercentage}%`
    range.style.left = `${startPercentage}%`
    range.style.width = `${endPercentage - startPercentage}%`
  }
  
  private notifyChange(slider: Element): void {
    if (!this.onChange) return
    
    const startTime = parseInt(slider.getAttribute('data-start')!)
    const endTime = parseInt(slider.getAttribute('data-end')!)
    
    this.onChange({
      start: new Date(startTime),
      end: new Date(endTime)
    })
  }
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}
```

#### Testing
```typescript
describe('TimeRangeSlider', () => {
  it('should render with correct initial values', () => {
    const data: TimeRangeData = {
      min: new Date('2023-01-01'),
      max: new Date('2024-01-01'),
      current: {
        start: new Date('2023-06-01'),
        end: new Date('2024-01-01')
      }
    }
    
    const slider = new TimeRangeSlider(data)
    const html = slider.render()
    
    expect(html).toContain('time-range-slider')
    expect(html).toContain('2023-06-01')
    expect(html).toContain('2024-01-01')
  })
  
  it('should handle preset button clicks', () => {
    const onChange = jest.fn()
    const slider = new TimeRangeSlider(testData, { onChange })
    
    const container = document.createElement('div')
    container.innerHTML = slider.render()
    slider.hydrate(container)
    
    const oneMonthButton = container.querySelector('[data-range="1m"]')
    oneMonthButton?.dispatchEvent(new MouseEvent('click'))
    
    expect(onChange).toHaveBeenCalledWith({
      start: expect.any(Date),
      end: expect.any(Date)
    })
  })
})
```

### 4.5 Metric Cards

#### Description
Display key metrics in card format with icons and trends.

#### packages/visualizations/src/widgets/MetricCard.ts
```typescript
export interface MetricData {
  label: string
  value: string | number
  icon?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  description?: string
}

export class MetricCard {
  constructor(
    private data: MetricData,
    private options: { theme?: 'light' | 'dark' } = {}
  ) {}
  
  render(): string {
    const trendClass = this.data.trend?.direction === 'up' ? 'trend-up' : 'trend-down'
    
    return `
      <div class="metric-card ${this.options.theme || 'light'}">
        ${this.data.icon ? `
          <div class="metric-icon">
            ${this.renderIcon(this.data.icon)}
          </div>
        ` : ''}
        <div class="metric-content">
          <h3 class="metric-label">${this.data.label}</h3>
          <div class="metric-value">${this.formatValue(this.data.value)}</div>
          ${this.data.trend ? `
            <div class="metric-trend ${trendClass}">
              ${this.renderTrendArrow(this.data.trend.direction)}
              <span>${Math.abs(this.data.trend.value)}%</span>
            </div>
          ` : ''}
          ${this.data.description ? `
            <p class="metric-description">${this.data.description}</p>
          ` : ''}
        </div>
      </div>
    `
  }
  
  hydrate(container: HTMLElement): void {
    // Add hover effects and animations
    const card = container.querySelector('.metric-card')
    if (!card) return
    
    card.addEventListener('mouseenter', () => {
      card.classList.add('hover')
    })
    
    card.addEventListener('mouseleave', () => {
      card.classList.remove('hover')
    })
    
    // Animate value on first view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateValue(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      })
    })
    
    const valueEl = card.querySelector('.metric-value')
    if (valueEl) {
      observer.observe(valueEl)
    }
  }
  
  private formatValue(value: string | number): string {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
      }
      return value.toLocaleString()
    }
    return value
  }
  
  private renderIcon(iconName: string): string {
    // Map icon names to SVG icons
    const icons: Record<string, string> = {
      commits: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>`,
      users: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>`,
      code: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
      </svg>`,
      files: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/>
      </svg>`
    }
    
    return icons[iconName] || ''
  }
  
  private renderTrendArrow(direction: 'up' | 'down'): string {
    if (direction === 'up') {
      return `<svg class="trend-arrow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14l5-5 5 5z"/>
      </svg>`
    } else {
      return `<svg class="trend-arrow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z"/>
      </svg>`
    }
  }
  
  private animateValue(element: HTMLElement): void {
    const value = element.textContent || ''
    const numMatch = value.match(/[\d.]+/)
    
    if (!numMatch) return
    
    const endValue = parseFloat(numMatch[0])
    const suffix = value.substring(numMatch.index! + numMatch[0].length)
    const duration = 1000
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const currentValue = endValue * this.easeOutQuart(progress)
      element.textContent = currentValue.toFixed(1) + suffix
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }
  
  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4)
  }
}
```

### 4.6 Chart Toggle Component

#### Description
Toggle between different chart views (By Date vs By Commit).

#### packages/visualizations/src/widgets/ChartToggle.ts
```typescript
export interface ToggleOption {
  value: string
  label: string
  icon?: string
}

export class ChartToggle {
  constructor(
    private options: ToggleOption[],
    private config: {
      defaultValue?: string
      onChange?: (value: string) => void
    } = {}
  ) {}
  
  render(): string {
    const currentValue = this.config.defaultValue || this.options[0]?.value
    
    return `
      <div class="chart-toggle" role="radiogroup" aria-label="Chart view options">
        ${this.options.map(option => `
          <button 
            role="radio"
            aria-checked="${option.value === currentValue}"
            data-value="${option.value}"
            class="toggle-option ${option.value === currentValue ? 'active' : ''}">
            ${option.icon ? `<span class="toggle-icon">${option.icon}</span>` : ''}
            <span class="toggle-label">${option.label}</span>
          </button>
        `).join('')}
      </div>
    `
  }
  
  hydrate(container: HTMLElement): void {
    const toggle = container.querySelector('.chart-toggle')
    if (!toggle) return
    
    const buttons = toggle.querySelectorAll('.toggle-option')
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        buttons.forEach(b => {
          b.classList.remove('active')
          b.setAttribute('aria-checked', 'false')
        })
        
        button.classList.add('active')
        button.setAttribute('aria-checked', 'true')
        
        // Notify change
        const value = button.getAttribute('data-value')
        if (value && this.config.onChange) {
          this.config.onChange(value)
        }
      })
    })
  }
}
```

### 4.7 Top Files Table

#### Description
Interactive table showing top files by various metrics with tabs.

#### packages/visualizations/src/widgets/TopFilesTable.ts
```typescript
export interface FileData {
  path: string
  metric: number
  secondaryMetric?: number
  contributors?: string[]
}

export interface TopFilesData {
  tabs: Array<{
    id: string
    label: string
    files: FileData[]
  }>
}

export class TopFilesTable {
  constructor(
    private data: TopFilesData,
    private options: {
      defaultTab?: string
      maxFiles?: number
    } = {}
  ) {}
  
  render(): string {
    const activeTab = this.options.defaultTab || this.data.tabs[0]?.id
    
    return `
      <div class="top-files-table">
        <div class="table-tabs" role="tablist">
          ${this.data.tabs.map(tab => `
            <button 
              role="tab"
              aria-selected="${tab.id === activeTab}"
              aria-controls="panel-${tab.id}"
              data-tab="${tab.id}"
              class="tab-button ${tab.id === activeTab ? 'active' : ''}">
              ${tab.label}
            </button>
          `).join('')}
        </div>
        
        ${this.data.tabs.map(tab => `
          <div 
            id="panel-${tab.id}"
            role="tabpanel"
            class="table-panel ${tab.id === activeTab ? 'active' : ''}"
            ${tab.id !== activeTab ? 'hidden' : ''}>
            ${this.renderTable(tab)}
          </div>
        `).join('')}
      </div>
    `
  }
  
  hydrate(container: HTMLElement): void {
    const tableEl = container.querySelector('.top-files-table')
    if (!tableEl) return
    
    const tabs = tableEl.querySelectorAll('.tab-button')
    const panels = tableEl.querySelectorAll('.table-panel')
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab')
        
        // Update tabs
        tabs.forEach(t => {
          t.classList.remove('active')
          t.setAttribute('aria-selected', 'false')
        })
        tab.classList.add('active')
        tab.setAttribute('aria-selected', 'true')
        
        // Update panels
        panels.forEach(panel => {
          if (panel.id === `panel-${tabId}`) {
            panel.classList.add('active')
            panel.removeAttribute('hidden')
          } else {
            panel.classList.remove('active')
            panel.setAttribute('hidden', '')
          }
        })
      })
    })
    
    // Add sorting functionality
    this.addSortingHandlers(tableEl)
  }
  
  private renderTable(tab: { id: string; label: string; files: FileData[] }): string {
    const files = this.options.maxFiles 
      ? tab.files.slice(0, this.options.maxFiles)
      : tab.files
    
    return `
      <table class="files-table">
        <thead>
          <tr>
            <th class="sortable" data-sort="path">
              File Path
              <span class="sort-indicator"></span>
            </th>
            <th class="sortable" data-sort="metric">
              ${this.getMetricLabel(tab.id)}
              <span class="sort-indicator"></span>
            </th>
            ${tab.files[0]?.secondaryMetric !== undefined ? `
              <th class="sortable" data-sort="secondary">
                ${this.getSecondaryMetricLabel(tab.id)}
                <span class="sort-indicator"></span>
              </th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          ${files.map((file, index) => `
            <tr>
              <td class="file-path" title="${file.path}">
                <span class="file-icon">${this.getFileIcon(file.path)}</span>
                <span class="file-name">${this.truncatePath(file.path)}</span>
              </td>
              <td class="metric-value">
                ${this.formatMetric(file.metric, tab.id)}
              </td>
              ${file.secondaryMetric !== undefined ? `
                <td class="secondary-metric">
                  ${this.formatMetric(file.secondaryMetric, tab.id)}
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  }
  
  private getMetricLabel(tabId: string): string {
    const labels: Record<string, string> = {
      largest: 'Lines of Code',
      churn: 'Total Changes',
      complex: 'Complexity Score',
      hotspots: 'Activity Score'
    }
    return labels[tabId] || 'Metric'
  }
  
  private getSecondaryMetricLabel(tabId: string): string {
    const labels: Record<string, string> = {
      largest: 'Last Modified',
      churn: 'Unique Contributors',
      complex: 'Lines of Code',
      hotspots: 'Recent Changes'
    }
    return labels[tabId] || 'Secondary'
  }
  
  private formatMetric(value: number, tabId: string): string {
    if (tabId === 'largest' || tabId === 'complex') {
      return value.toLocaleString()
    }
    return value.toString()
  }
  
  private truncatePath(path: string): string {
    if (path.length <= 50) return path
    
    const parts = path.split('/')
    if (parts.length <= 2) {
      return '...' + path.slice(-47)
    }
    
    const fileName = parts[parts.length - 1]
    const firstDir = parts[0]
    
    if (fileName.length > 30) {
      return `${firstDir}/.../...${fileName.slice(-20)}`
    }
    
    return `${firstDir}/.../${fileName}`
  }
  
  private getFileIcon(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    
    const iconMap: Record<string, string> = {
      js: '📄',
      ts: '📘',
      jsx: '⚛️',
      tsx: '⚛️',
      py: '🐍',
      java: '☕',
      go: '🐹',
      rs: '🦀',
      rb: '💎',
      php: '🐘',
      cs: '🔷',
      cpp: '🔵',
      c: '🔵',
      h: '📋',
      md: '📝',
      json: '{}',
      xml: '</>',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      yaml: '📋',
      yml: '📋'
    }
    
    return iconMap[ext] || '📄'
  }
  
  private addSortingHandlers(container: Element): void {
    const headers = container.querySelectorAll('th.sortable')
    
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const table = header.closest('table')
        const tbody = table?.querySelector('tbody')
        if (!tbody) return
        
        const sortKey = header.getAttribute('data-sort')!
        const isAscending = header.classList.contains('sort-asc')
        
        // Update header classes
        headers.forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc')
        })
        header.classList.add(isAscending ? 'sort-desc' : 'sort-asc')
        
        // Sort rows
        const rows = Array.from(tbody.querySelectorAll('tr'))
        rows.sort((a, b) => {
          const aValue = this.extractSortValue(a, sortKey)
          const bValue = this.extractSortValue(b, sortKey)
          
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return isAscending ? bValue - aValue : aValue - bValue
          }
          
          const aStr = String(aValue)
          const bStr = String(bValue)
          return isAscending 
            ? bStr.localeCompare(aStr)
            : aStr.localeCompare(bStr)
        })
        
        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row))
      })
    })
  }
  
  private extractSortValue(row: Element, key: string): string | number {
    switch (key) {
      case 'path':
        return row.querySelector('.file-name')?.textContent || ''
      case 'metric':
        const metricText = row.querySelector('.metric-value')?.textContent || '0'
        return parseInt(metricText.replace(/,/g, ''))
      case 'secondary':
        const secondaryText = row.querySelector('.secondary-metric')?.textContent || '0'
        return parseInt(secondaryText.replace(/,/g, ''))
      default:
        return ''
    }
  }
}
```

### 4.8 Component Registry

#### Description
Central registry for all visualization components.

#### packages/visualizations/src/registry.ts
```typescript
import { ChartComponent } from './base/ChartComponent'
import { GrowthChart } from './charts/GrowthChart'
import { FileTypesPieChart } from './charts/FileTypesPieChart'
import { ContributorBarChart } from './charts/ContributorBarChart'
import { FileActivityHeatmap } from './charts/FileActivityHeatmap'
import { TimeRangeSlider } from './widgets/TimeRangeSlider'
import { MetricCard } from './widgets/MetricCard'
import { ChartToggle } from './widgets/ChartToggle'
import { TopFilesTable } from './widgets/TopFilesTable'

export type ComponentType = 
  | 'growth-chart'
  | 'file-types-pie'
  | 'contributor-bars'
  | 'file-activity-heatmap'
  | 'time-slider'
  | 'metric-card'
  | 'chart-toggle'
  | 'top-files-table'

export class ComponentRegistry {
  private static components = new Map<ComponentType, any>([
    ['growth-chart', GrowthChart],
    ['file-types-pie', FileTypesPieChart],
    ['contributor-bars', ContributorBarChart],
    ['file-activity-heatmap', FileActivityHeatmap],
    ['time-slider', TimeRangeSlider],
    ['metric-card', MetricCard],
    ['chart-toggle', ChartToggle],
    ['top-files-table', TopFilesTable]
  ])
  
  static get(type: ComponentType): any {
    const Component = this.components.get(type)
    if (!Component) {
      throw new Error(`Unknown component type: ${type}`)
    }
    return Component
  }
  
  static register(type: ComponentType, component: any): void {
    this.components.set(type, component)
  }
  
  static getAll(): Map<ComponentType, any> {
    return new Map(this.components)
  }
  
  static renderComponent(
    type: ComponentType,
    data: any,
    options?: any
  ): { html: string; component: any } {
    const Component = this.get(type)
    const instance = new Component(data, options)
    
    return {
      html: instance.render(),
      component: instance
    }
  }
}
```

## Testing Strategy

### Component Testing
```typescript
// packages/visualizations/src/__tests__/chart-component.test.ts
describe('Visualization Components', () => {
  describe('Server-side rendering', () => {
    it('should render valid HTML without JavaScript', () => {
      const chart = new GrowthChart(testData)
      const html = chart.render()
      
      // Should include fallback content
      expect(html).toContain('<noscript>')
      expect(html).toContain('<table')
      
      // Should be valid HTML
      expect(validateHTML(html)).toBe(true)
    })
  })
  
  describe('Accessibility', () => {
    it('should include proper ARIA attributes', () => {
      const slider = new TimeRangeSlider(testData)
      const html = slider.render()
      
      expect(html).toContain('role="slider"')
      expect(html).toContain('aria-label')
      expect(html).toContain('aria-valuemin')
      expect(html).toContain('aria-valuemax')
    })
  })
  
  describe('Progressive enhancement', () => {
    it('should enhance with JavaScript when available', () => {
      const chart = new GrowthChart(testData)
      const container = document.createElement('div')
      container.innerHTML = chart.render()
      
      // Before hydration
      expect(container.querySelector('canvas')).toBeNull()
      
      // After hydration
      chart.hydrate(container)
      
      // Chart should be rendered
      expect(container.querySelector('.apexcharts-canvas')).toBeTruthy()
    })
  })
})
```

### Visual Testing
```typescript
// apps/playground/src/visual-tests.ts
import { test, expect } from '@playwright/test'

test.describe('Chart Visual Tests', () => {
  test('Growth chart should match snapshot', async ({ page }) => {
    await page.goto('/playground?component=growth-chart')
    await page.waitForSelector('.growth-chart')
    
    const chart = await page.locator('.growth-chart')
    await expect(chart).toHaveScreenshot('growth-chart.png')
  })
  
  test('Time slider interaction', async ({ page }) => {
    await page.goto('/playground?component=time-slider')
    
    const slider = await page.locator('.time-range-slider')
    const startHandle = await slider.locator('.slider-handle.start')
    
    // Drag handle
    await startHandle.dragTo(await slider.locator('.slider-track'), {
      targetPosition: { x: 100, y: 0 }
    })
    
    // Check value updated
    const startLabel = await slider.locator('.start-label')
    await expect(startLabel).not.toHaveText('Jan 1, 2023')
  })
})
```

## Deliverables

1. **Base Architecture**: Component base class with render/hydrate pattern
2. **Chart Components**: Growth, pie, bar, heatmap charts
3. **Interactive Widgets**: Time slider, toggles, metric cards
4. **Component Registry**: Central component management
5. **Testing Infrastructure**: Unit, visual, and accessibility tests

## Success Criteria

- [ ] All components render without JavaScript
- [ ] Components can be tested in isolation
- [ ] Accessibility standards met (WCAG 2.1 AA)
- [ ] Server-side rendering produces valid HTML
- [ ] Client-side hydration adds interactivity
- [ ] Visual regression tests passing

## Next Phase

With visualization components complete, Phase 5 will focus on assembling these components into complete reports and creating the CLI interface.