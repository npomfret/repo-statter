/**
 * File Activity Heatmap Component
 * Displays file activity as a treemap/heatmap visualization
 * Shows file sizes proportionally with activity intensity as color coding
 */

import { ChartComponent, ChartOptions } from '../base/ChartComponent'

export interface FileActivityData {
  path: string
  size: number
  commits: number
  lastModified: Date
  contributors: string[]
  language?: string
  complexity?: number
  changeFrequency: number // Changes per month
}

export interface FileActivityHeatmapData {
  files: FileActivityData[]
  colorMetric: 'commits' | 'changeFrequency' | 'complexity' | 'contributors'
}

export interface FileActivityHeatmapOptions extends ChartOptions {
  maxFiles?: number
  colorScheme?: 'blue' | 'green' | 'red' | 'rainbow'
  showLabels?: boolean
  minFileSize?: number
  groupByDirectory?: boolean
  interactiveTooltips?: boolean
}

interface TreemapNode {
  name: string
  value: number
  color: number
  data: FileActivityData
  x?: number
  y?: number
  width?: number
  height?: number
  children?: TreemapNode[]
}

export class FileActivityHeatmap extends ChartComponent<FileActivityHeatmapData> {
  protected options: FileActivityHeatmapOptions
  private colorScale: (value: number) => string

  constructor(data: FileActivityHeatmapData, options: FileActivityHeatmapOptions = {}) {
    super(data, options)
    this.options = {
      maxFiles: 50,
      colorScheme: 'blue',
      showLabels: true,
      minFileSize: 0,
      groupByDirectory: false,
      interactiveTooltips: true,
      ...options
    }
    
    this.colorScale = this.createColorScale()
  }

  renderStatic(): string {
    const chartId = this.generateId()
    const filteredFiles = this.getFilteredFiles()
    
    return `
      <div 
        id="${chartId}" 
        class="file-activity-heatmap" 
        data-chart-id="${chartId}"
        data-theme="${this.options.theme}">
        
        <div class="heatmap-header">
          <h3 class="chart-title">${this.options.title || 'File Activity Heatmap'}</h3>
          <div class="heatmap-controls">
            ${this.renderColorMetricSelector()}
            ${this.renderColorLegend()}
          </div>
        </div>
        
        <div class="treemap-container">
          ${this.toSVG()}
          
          <noscript>
            ${this.renderAccessibleTable(filteredFiles)}
          </noscript>
        </div>
        
        <div class="heatmap-info">
          ${this.renderFileStats(filteredFiles)}
        </div>
        
        <!-- Tooltip container -->
        <div id="heatmap-tooltip-${chartId}" class="heatmap-tooltip" aria-live="polite" aria-atomic="true"></div>
      </div>
    `
  }

  async hydrate(container: HTMLElement): Promise<void> {
    const heatmapEl = container.querySelector('.file-activity-heatmap') as HTMLElement
    if (!heatmapEl) return

    try {
      // Add interactive tooltips
      if (this.options.interactiveTooltips) {
        this.addTooltipHandlers(heatmapEl)
      }
      
      // Add color metric selector handlers
      this.addColorMetricHandlers(heatmapEl)
      
      // Add keyboard navigation
      this.addKeyboardNavigation(heatmapEl)
      
      // Try to enhance with D3.js if available
      await this.tryD3Enhancement(heatmapEl)
      
    } catch (error) {
      // Silent fallback to static chart on hydration failure
      // Fallback: basic interactivity works
    }
  }

  toSVG(): string {
    const width = this.options.width || 900
    const height = this.options.height || 600
    const padding = 20
    
    const files = this.getFilteredFiles()
    if (files.length === 0) {
      return this.renderEmptyState(width, height)
    }

    // Create treemap layout
    const treemapData = this.createTreemapLayout(files, width - 2 * padding, height - 2 * padding)
    
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" 
           role="img" aria-labelledby="heatmap-title" aria-describedby="heatmap-desc">
        
        <title id="heatmap-title">File Activity Heatmap</title>
        <desc id="heatmap-desc">
          Treemap showing ${files.length} files sized by file size and colored by ${this.data.colorMetric}
        </desc>
        
        <defs>
          ${this.renderGradientDefinitions()}
          <filter id="fileHover" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" flood-color="rgba(0,0,0,0.3)" flood-opacity="0.5"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="${this.getBackgroundColor()}" rx="8"/>
        
        <!-- File rectangles -->
        <g transform="translate(${padding}, ${padding})">
          ${treemapData.map((node, index) => this.renderFileRect(node, index)).join('')}
        </g>
        
        <!-- Border -->
        <rect x="1" y="1" width="${width - 2}" height="${height - 2}" 
              fill="none" stroke="${this.getBorderColor()}" stroke-width="1" rx="8"/>
      </svg>
    `
    
    return svg
  }

  private createTreemapLayout(files: FileActivityData[], width: number, height: number): TreemapNode[] {
    // Simple squarified treemap algorithm
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const nodes: TreemapNode[] = files.map(file => ({
      name: this.getFileName(file.path),
      value: file.size,
      color: this.getColorValue(file),
      data: file
    }))
    
    // Sort by size descending
    nodes.sort((a, b) => b.value - a.value)
    
    // Simple row-based layout (simplified treemap)
    let currentX = 0
    let currentY = 0
    let rowHeight = 0
    let rowWidth = 0
    
    const targetAspectRatio = width / height
    
    nodes.forEach((node, index) => {
      const area = (node.value / totalSize) * width * height
      const nodeWidth = Math.sqrt(area * targetAspectRatio)
      const nodeHeight = area / nodeWidth
      
      // Check if we need a new row
      if (currentX + nodeWidth > width && currentX > 0) {
        currentX = 0
        currentY += rowHeight
        rowHeight = 0
      }
      
      node.x = currentX
      node.y = currentY
      node.width = Math.min(nodeWidth, width - currentX)
      node.height = Math.max(20, nodeHeight) // Minimum height
      
      currentX += node.width
      rowHeight = Math.max(rowHeight, node.height)
    })
    
    return nodes
  }

  private renderFileRect(node: TreemapNode, index: number): string {
    const color = this.colorScale(node.color)
    const textColor = this.getContrastColor(color)
    const fileName = this.truncateFileName(node.name)
    const showLabel = this.options.showLabels && node.width! > 60 && node.height! > 25
    
    return `
      <g class="file-node" data-file-index="${index}" data-file-path="${node.data.path}">
        <!-- File rectangle -->
        <rect 
          x="${node.x}" y="${node.y}" 
          width="${node.width}" height="${node.height}"
          fill="${color}"
          stroke="${this.getBorderColor()}"
          stroke-width="0.5"
          rx="2" ry="2"
          class="file-rect"
          tabindex="0"
          role="button"
          aria-label="${this.getFileAriaLabel(node.data)}"
          data-size="${node.value}"
          data-activity="${node.color}">
          
          <title>${this.getFileTooltipText(node.data)}</title>
        </rect>
        
        ${showLabel ? `
          <!-- File name label -->
          <text 
            x="${node.x! + node.width! / 2}" 
            y="${node.y! + node.height! / 2}" 
            text-anchor="middle" 
            dominant-baseline="central"
            style="font-size: 11px; font-weight: 500; fill: ${textColor}; pointer-events: none;"
            class="file-label">
            ${fileName}
          </text>
          
          <!-- File size label -->
          ${node.height! > 40 ? `
            <text 
              x="${node.x! + node.width! / 2}" 
              y="${node.y! + node.height! / 2 + 14}" 
              text-anchor="middle" 
              dominant-baseline="central"
              style="font-size: 9px; fill: ${textColor}; opacity: 0.8; pointer-events: none;"
              class="file-size">
              ${this.formatFileSize(node.value)}
            </text>
          ` : ''}
        ` : ''}
      </g>
    `
  }

  private renderColorMetricSelector(): string {
    const metrics = [
      { key: 'commits', label: 'Commits', description: 'Total number of commits' },
      { key: 'changeFrequency', label: 'Change Frequency', description: 'Changes per month' },
      { key: 'complexity', label: 'Complexity', description: 'Code complexity score' },
      { key: 'contributors', label: 'Contributors', description: 'Number of contributors' }
    ]
    
    return `
      <div class="color-metric-selector" role="tablist" aria-label="Select color metric">
        ${metrics.map(metric => `
          <button 
            role="tab"
            aria-selected="${metric.key === this.data.colorMetric}"
            data-metric="${metric.key}"
            class="metric-button ${metric.key === this.data.colorMetric ? 'active' : ''}"
            title="${metric.description}">
            ${metric.label}
          </button>
        `).join('')}
      </div>
    `
  }

  private renderColorLegend(): string {
    const files = this.getFilteredFiles()
    if (files.length === 0) return ''
    
    const colorValues = files.map(f => this.getColorValue(f)).filter(v => !isNaN(v))
    const minValue = Math.min(...colorValues)
    const maxValue = Math.max(...colorValues)
    
    const steps = 5
    const legendItems = []
    
    for (let i = 0; i < steps; i++) {
      const value = minValue + (maxValue - minValue) * (i / (steps - 1))
      const color = this.colorScale(value)
      legendItems.push({ value, color })
    }
    
    return `
      <div class="color-legend" role="region" aria-label="Color scale legend">
        <span class="legend-title">${this.getColorMetricLabel()}</span>
        <div class="legend-scale">
          ${legendItems.map((item, index) => `
            <div class="legend-item">
              <div class="legend-color" style="background-color: ${item.color}"></div>
              ${index === 0 || index === legendItems.length - 1 ? `
                <span class="legend-value">${this.formatColorValue(item.value)}</span>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  private renderAccessibleTable(files: FileActivityData[]): string {
    return `
      <table class="file-activity-data" role="table" aria-label="File activity data">
        <caption>File Activity Data - ${files.length} files</caption>
        <thead>
          <tr>
            <th scope="col">File Path</th>
            <th scope="col">Size</th>
            <th scope="col">Commits</th>
            <th scope="col">Change Frequency</th>
            <th scope="col">Contributors</th>
            <th scope="col">Last Modified</th>
          </tr>
        </thead>
        <tbody>
          ${files.slice(0, 20).map(file => `
            <tr>
              <td>
                <code class="file-path">${file.path}</code>
                ${file.language ? `<span class="file-language">(${file.language})</span>` : ''}
              </td>
              <td>${this.formatFileSize(file.size)}</td>
              <td>${file.commits.toLocaleString()}</td>
              <td>${file.changeFrequency.toFixed(1)}/month</td>
              <td>${file.contributors.length}</td>
              <td>${new Date(file.lastModified).toLocaleDateString()}</td>
            </tr>
          `).join('')}
          ${files.length > 20 ? `
            <tr>
              <td colspan="6">
                <em>... and ${files.length - 20} more files</em>
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    `
  }

  private renderFileStats(files: FileActivityData[]): string {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    const totalCommits = files.reduce((sum, f) => sum + f.commits, 0)
    const avgChangeFreq = files.reduce((sum, f) => sum + f.changeFrequency, 0) / files.length
    const uniqueContributors = new Set(files.flatMap(f => f.contributors)).size
    
    return `
      <div class="file-stats">
        <div class="stat-item">
          <span class="stat-value">${files.length}</span>
          <span class="stat-label">Files</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.formatFileSize(totalSize)}</span>
          <span class="stat-label">Total Size</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalCommits.toLocaleString()}</span>
          <span class="stat-label">Total Commits</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${avgChangeFreq.toFixed(1)}</span>
          <span class="stat-label">Avg Changes/Month</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${uniqueContributors}</span>
          <span class="stat-label">Contributors</span>
        </div>
      </div>
    `
  }

  private addTooltipHandlers(container: HTMLElement): void {
    const tooltip = container.querySelector('.heatmap-tooltip') as HTMLElement
    const fileRects = container.querySelectorAll('.file-rect')
    
    fileRects.forEach(rect => {
      rect.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement
        const fileIndex = target.closest('.file-node')?.getAttribute('data-file-index')
        if (fileIndex) {
          const file = this.getFilteredFiles()[parseInt(fileIndex)]
          this.showTooltip(tooltip, file, e as MouseEvent)
        }
      })
      
      rect.addEventListener('mousemove', (e) => {
        this.updateTooltipPosition(tooltip, e as MouseEvent)
      })
      
      rect.addEventListener('mouseleave', () => {
        this.hideTooltip(tooltip)
      })
      
      // Touch support
      rect.addEventListener('touchstart', (e) => {
        const target = e.target as HTMLElement
        const fileIndex = target.closest('.file-node')?.getAttribute('data-file-index')
        if (fileIndex) {
          const file = this.getFilteredFiles()[parseInt(fileIndex)]
          this.showTooltip(tooltip, file, e.touches[0] as any)
          e.preventDefault()
        }
      })
    })
  }

  private addColorMetricHandlers(container: HTMLElement): void {
    const buttons = container.querySelectorAll('.metric-button')
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const metric = button.getAttribute('data-metric') as typeof this.data.colorMetric
        
        // Update data and color scale
        this.data.colorMetric = metric
        this.colorScale = this.createColorScale()
        
        // Update active state
        buttons.forEach(b => {
          b.classList.remove('active')
          b.setAttribute('aria-selected', 'false')
        })
        button.classList.add('active')
        button.setAttribute('aria-selected', 'true')
        
        // Re-render SVG
        const svgContainer = container.querySelector('.heatmap-container')
        if (svgContainer) {
          svgContainer.innerHTML = this.toSVG()
          // Re-add tooltip handlers to new elements
          setTimeout(() => this.addTooltipHandlers(container), 0)
        }
        
        // Update legend
        const legend = container.querySelector('.color-legend')
        if (legend) {
          legend.outerHTML = this.renderColorLegend()
        }
        
        // Announce change
        this.announceMetricChange(button.textContent || metric)
      })
    })
  }

  private addKeyboardNavigation(container: HTMLElement): void {
    const fileRects = container.querySelectorAll('.file-rect')
    
    fileRects.forEach((rect, index) => {
      rect.addEventListener('keydown', (e) => {
        const event = e as KeyboardEvent
        let targetIndex = index
        
        switch (event.key) {
          case 'ArrowRight':
            targetIndex = Math.min(fileRects.length - 1, index + 1)
            break
          case 'ArrowLeft':
            targetIndex = Math.max(0, index - 1)
            break
          case 'ArrowDown':
            targetIndex = Math.min(fileRects.length - 1, index + 5) // Approximate row
            break
          case 'ArrowUp':
            targetIndex = Math.max(0, index - 5) // Approximate row
            break
          case 'Home':
            targetIndex = 0
            break
          case 'End':
            targetIndex = fileRects.length - 1
            break
          case 'Enter':
          case ' ':
            // Show detailed info
            const fileIndex = rect.closest('.file-node')?.getAttribute('data-file-index')
            if (fileIndex) {
              const file = this.getFilteredFiles()[parseInt(fileIndex)]
              this.showFileDetails(file)
            }
            event.preventDefault()
            return
          default:
            return
        }
        
        if (targetIndex !== index) {
          (fileRects[targetIndex] as HTMLElement).focus()
          event.preventDefault()
        }
      })
    })
  }

  private async tryD3Enhancement(container: HTMLElement): Promise<void> {
    try {
      // Try to load D3.js for better treemap layout
      const d3 = await import('d3')
      
      // Enhanced treemap with D3
      const svg = container.querySelector('svg')
      if (svg) {
        // D3 enhancement would go here
        // For now, we'll keep the existing SVG-based implementation
      }
    } catch {
      // D3 not available, use fallback SVG implementation
    }
  }

  private getFilteredFiles(): FileActivityData[] {
    return this.data.files
      .filter(file => file.size >= (this.options.minFileSize || 0))
      .sort((a, b) => b.size - a.size)
      .slice(0, this.options.maxFiles || 50)
  }

  private getColorValue(file: FileActivityData): number {
    switch (this.data.colorMetric) {
      case 'commits':
        return file.commits
      case 'changeFrequency':
        return file.changeFrequency
      case 'complexity':
        return file.complexity || 0
      case 'contributors':
        return file.contributors.length
      default:
        return file.commits
    }
  }

  private createColorScale(): (value: number) => string {
    const files = this.getFilteredFiles()
    const colorValues = files.map(f => this.getColorValue(f)).filter(v => !isNaN(v))
    
    if (colorValues.length === 0) {
      return () => '#cccccc'
    }
    
    const minValue = Math.min(...colorValues)
    const maxValue = Math.max(...colorValues)
    
    const scheme = this.options.colorScheme || 'blue'
    
    return (value: number) => {
      const normalizedValue = maxValue > minValue ? (value - minValue) / (maxValue - minValue) : 0
      return this.interpolateColor(normalizedValue, scheme)
    }
  }

  private interpolateColor(t: number, scheme: string): string {
    t = Math.max(0, Math.min(1, t)) // Clamp to 0-1
    
    const schemes = {
      blue: ['#f0f9ff', '#0ea5e9', '#0f172a'],
      green: ['#f0fdf4', '#22c55e', '#0f172a'],
      red: ['#fef2f2', '#ef4444', '#0f172a'],
      rainbow: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
    }
    
    const colors = schemes[scheme as keyof typeof schemes] || schemes.blue
    
    if (colors.length === 2) {
      return this.mixColors(colors[0], colors[1], t)
    } else if (colors.length === 3) {
      if (t < 0.5) {
        return this.mixColors(colors[0], colors[1], t * 2)
      } else {
        return this.mixColors(colors[1], colors[2], (t - 0.5) * 2)
      }
    } else {
      // Multi-color scheme
      const segmentSize = 1 / (colors.length - 1)
      const segment = Math.floor(t / segmentSize)
      const segmentT = (t % segmentSize) / segmentSize
      
      const fromColor = colors[Math.min(segment, colors.length - 2)]
      const toColor = colors[Math.min(segment + 1, colors.length - 1)]
      
      return this.mixColors(fromColor, toColor, segmentT)
    }
  }

  private mixColors(color1: string, color2: string, t: number): string {
    // Simple color mixing (could be enhanced with better color space)
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')
    
    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)
    
    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)
    
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  // Helper methods continue...
  private getFileName(path: string): string {
    return path.split('/').pop() || path
  }

  private truncateFileName(name: string): string {
    if (name.length <= 12) return name
    
    const ext = name.split('.').pop()
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'))
    
    if (ext && nameWithoutExt.length > 8) {
      return `${nameWithoutExt.substring(0, 8)}...${ext}`
    }
    
    return `${name.substring(0, 9)}...`
  }

  private getContrastColor(backgroundColor: string): string {
    // Simple contrast calculation
    const hex = backgroundColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  private getColorMetricLabel(): string {
    const labels = {
      commits: 'Commits',
      changeFrequency: 'Changes/Month',
      complexity: 'Complexity',
      contributors: 'Contributors'
    }
    return labels[this.data.colorMetric]
  }

  private formatColorValue(value: number): string {
    if (this.data.colorMetric === 'changeFrequency') {
      return value.toFixed(1)
    }
    return Math.round(value).toString()
  }

  private getFileAriaLabel(file: FileActivityData): string {
    return `File ${file.path}, size ${this.formatFileSize(file.size)}, ${this.getColorMetricLabel().toLowerCase()} ${this.getColorValue(file)}`
  }

  private getFileTooltipText(file: FileActivityData): string {
    return `${file.path} - ${this.formatFileSize(file.size)} - ${file.commits} commits`
  }

  private showTooltip(tooltip: HTMLElement, file: FileActivityData, event: MouseEvent): void {
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <strong class="file-name">${this.getFileName(file.path)}</strong>
        <span class="file-path">${file.path}</span>
      </div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span>Size:</span>
          <strong>${this.formatFileSize(file.size)}</strong>
        </div>
        <div class="tooltip-row">
          <span>Commits:</span>
          <strong>${file.commits.toLocaleString()}</strong>
        </div>
        <div class="tooltip-row">
          <span>Change Frequency:</span>
          <strong>${file.changeFrequency.toFixed(1)}/month</strong>
        </div>
        <div class="tooltip-row">
          <span>Contributors:</span>
          <strong>${file.contributors.length}</strong>
        </div>
        <div class="tooltip-row">
          <span>Last Modified:</span>
          <strong>${new Date(file.lastModified).toLocaleDateString()}</strong>
        </div>
        ${file.complexity ? `
          <div class="tooltip-row">
            <span>Complexity:</span>
            <strong>${file.complexity}</strong>
          </div>
        ` : ''}
      </div>
    `
    
    tooltip.style.display = 'block'
    this.updateTooltipPosition(tooltip, event)
  }

  private updateTooltipPosition(tooltip: HTMLElement, event: MouseEvent): void {
    const rect = tooltip.getBoundingClientRect()
    const x = event.clientX + 10
    const y = event.clientY - rect.height - 10
    
    tooltip.style.left = `${x}px`
    tooltip.style.top = `${y}px`
  }

  private hideTooltip(tooltip: HTMLElement): void {
    tooltip.style.display = 'none'
  }

  private showFileDetails(file: FileActivityData): void {
    // Could open a modal or navigate to file details
    // File interaction: would trigger detail view for file
  }

  private announceMetricChange(metricLabel: string): void {
    let liveRegion = document.querySelector('#heatmap-live-region')
    
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'heatmap-live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
      document.body.appendChild(liveRegion)
    }
    
    liveRegion.textContent = `Heatmap updated to show ${metricLabel}`
  }

  private renderGradientDefinitions(): string {
    return `
      <defs>
        <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="m0,4 l4,-4 m-1,1 l2,-2 m-1,5 l2,-2" stroke="${this.getGridColor()}" stroke-width="0.5"/>
        </pattern>
      </defs>
    `
  }

  private renderEmptyState(width: number, height: number): string {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${this.getBackgroundColor()}" rx="8"/>
        <text x="${width / 2}" y="${height / 2 - 10}" text-anchor="middle" 
              style="font-size: 18px; font-weight: 600; fill: ${this.getTextColor()};">
          No File Data Available
        </text>
        <text x="${width / 2}" y="${height / 2 + 20}" text-anchor="middle" 
              style="font-size: 14px; fill: ${this.getTextColor()}; opacity: 0.6;">
          No files match the current filters
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

  private getBorderColor(): string {
    return this.options.theme === 'dark' ? '#404040' : '#e0e0e0'
  }

  private getGridColor(): string {
    return this.options.theme === 'dark' ? '#404040' : '#e0e0e0'
  }

  destroy(): void {
    const chartEl = document.querySelector(`[data-chart-id="${this.generateId()}"]`)
    if (chartEl) {
      // Remove event listeners
      const fileRects = chartEl.querySelectorAll('.file-rect')
      fileRects.forEach(rect => {
        rect.removeEventListener('mouseenter', () => {})
        rect.removeEventListener('mouseleave', () => {})
        rect.removeEventListener('keydown', () => {})
      })
    }
    
    // Remove live region
    const liveRegion = document.querySelector('#heatmap-live-region')
    if (liveRegion) {
      liveRegion.remove()
    }
  }
}