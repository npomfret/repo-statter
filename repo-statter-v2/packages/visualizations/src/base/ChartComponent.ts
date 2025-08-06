/**
 * Base Chart Component with server-side rendering support
 * @module @repo-statter/visualizations/base
 */

export interface ChartData {
  series: any[]
  categories?: string[]
  metadata?: Record<string, unknown>
}

export interface ChartOptions {
  title?: string
  subtitle?: string
  width?: number | string
  height?: number | string
  responsive?: boolean
  theme?: 'light' | 'dark' | 'auto'
  animations?: boolean
  accessibility?: ChartAccessibilityOptions
}

export interface ChartAccessibilityOptions {
  enabled?: boolean
  description?: string
  announceNewData?: boolean
  keyboardNavigation?: boolean
  linkedDescription?: string
}

export interface RenderOptions {
  container?: HTMLElement
  mode?: 'server' | 'client'
  hydrationData?: any
}

/**
 * Abstract base class for all chart components
 * Supports both server-side rendering and client-side hydration
 */
export abstract class ChartComponent<T extends ChartData = ChartData> {
  protected data: T
  protected options: ChartOptions
  protected chartId: string
  protected container?: HTMLElement
  
  constructor(data: T, options: ChartOptions = {}) {
    this.data = this.sanitizeData(data)
    this.options = {
      responsive: true,
      theme: 'auto',
      animations: true,
      height: 400,
      accessibility: {
        enabled: true,
        keyboardNavigation: true
      },
      ...options
    }
    this.chartId = this.generateId()
  }
  
  /**
   * Render the chart as HTML (server-side)
   * Returns HTML string that can be rendered without JavaScript
   */
  abstract renderStatic(): string
  
  /**
   * Hydrate a server-rendered chart with interactivity (client-side)
   * @param container The container element with server-rendered content
   */
  abstract hydrate(container: HTMLElement): Promise<void>
  
  /**
   * Generate static SVG representation of the chart
   * Used for exports and fallbacks
   */
  abstract toSVG(): string
  
  /**
   * Update chart data dynamically
   */
  abstract update(data: T): void
  
  /**
   * Destroy the chart and clean up resources
   */
  abstract destroy(): void
  
  /**
   * Render the chart (unified method)
   * Detects environment and calls appropriate method
   */
  render(options: RenderOptions = {}): string | HTMLElement {
    // Server-side rendering
    if (typeof window === 'undefined' || options.mode === 'server') {
      return this.renderStatic()
    }
    
    // Client-side rendering
    const container = options.container || this.createContainer()
    this.container = container
    
    // If hydrating server-rendered content
    if (container.querySelector(`[data-chart-id="${this.chartId}"]`)) {
      this.hydrate(container)
    } else {
      // Fresh client-side render
      container.innerHTML = this.renderStatic()
      this.hydrate(container)
    }
    
    return container
  }
  
  /**
   * Generate a unique chart ID
   */
  protected generateId(): string {
    return `chart-${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Sanitize and validate chart data
   */
  protected sanitizeData(data: T): T {
    // Deep clone to prevent mutations
    return JSON.parse(JSON.stringify(data))
  }
  
  /**
   * Create a container element for the chart
   */
  protected createContainer(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'chart-container'
    container.setAttribute('data-chart-id', this.chartId)
    
    // Apply responsive styles
    if (this.options.responsive) {
      container.style.width = '100%'
      container.style.position = 'relative'
    } else {
      container.style.width = typeof this.options.width === 'number' 
        ? `${this.options.width}px` 
        : this.options.width || '100%'
    }
    
    container.style.height = typeof this.options.height === 'number'
      ? `${this.options.height}px`
      : this.options.height || '400px'
    
    return container
  }
  
  /**
   * Get theme-aware colors
   */
  protected getThemeColors(): { 
    background: string
    text: string
    grid: string
    accent: string 
  } {
    const theme = this.detectTheme()
    
    if (theme === 'dark') {
      return {
        background: '#1a1a1a',
        text: '#e0e0e0',
        grid: '#333333',
        accent: '#66b3ff'
      }
    }
    
    return {
      background: '#ffffff',
      text: '#333333', 
      grid: '#e0e0e0',
      accent: '#0066cc'
    }
  }
  
  /**
   * Detect current theme preference
   */
  protected detectTheme(): 'light' | 'dark' {
    if (this.options.theme === 'light' || this.options.theme === 'dark') {
      return this.options.theme
    }
    
    // Auto-detect from environment
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    }
    
    return 'light'
  }
  
  /**
   * Render an accessible data table as fallback
   */
  protected renderDataTable(): string {
    const caption = this.options.title || 'Chart Data'
    const description = this.options.accessibility?.description || ''
    
    return `
      <table class="chart-data-table" role="table" aria-label="${caption}">
        <caption>${caption}</caption>
        ${description ? `<desc>${description}</desc>` : ''}
        <thead>
          <tr>
            ${this.getTableHeaders()}
          </tr>
        </thead>
        <tbody>
          ${this.getTableRows()}
        </tbody>
      </table>
    `
  }
  
  /**
   * Get table headers for accessible data table
   * Override in subclasses for specific implementations
   */
  protected getTableHeaders(): string {
    return '<th>Category</th><th>Value</th>'
  }
  
  /**
   * Get table rows for accessible data table
   * Override in subclasses for specific implementations
   */
  protected getTableRows(): string {
    return this.data.series.map((item: any, index: number) => `
      <tr>
        <td>${this.data.categories?.[index] || `Item ${index + 1}`}</td>
        <td>${item}</td>
      </tr>
    `).join('')
  }
  
  /**
   * Add ARIA attributes for accessibility
   */
  protected addAccessibilityAttributes(element: HTMLElement): void {
    if (!this.options.accessibility?.enabled) return
    
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', this.options.title || 'Chart')
    
    if (this.options.accessibility.description) {
      element.setAttribute('aria-describedby', `${this.chartId}-desc`)
      
      const descEl = document.createElement('div')
      descEl.id = `${this.chartId}-desc`
      descEl.className = 'sr-only'
      descEl.textContent = this.options.accessibility.description
      element.appendChild(descEl)
    }
    
    if (this.options.accessibility.keyboardNavigation) {
      element.setAttribute('tabindex', '0')
      this.setupKeyboardNavigation(element)
    }
  }
  
  /**
   * Setup keyboard navigation for the chart
   */
  protected setupKeyboardNavigation(element: HTMLElement): void {
    element.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          this.handleActivation()
          break
        case 'ArrowLeft':
          this.navigatePrevious()
          break
        case 'ArrowRight':
          this.navigateNext()
          break
        case 'Escape':
          this.handleEscape()
          break
      }
    })
  }
  
  /**
   * Handle chart activation (Enter/Space key)
   * Override in subclasses for specific behavior
   */
  protected handleActivation(): void {
    // Default: announce chart title
    this.announceToScreenReader(this.options.title || 'Chart activated')
  }
  
  /**
   * Navigate to previous data point
   * Override in subclasses for specific behavior
   */
  protected navigatePrevious(): void {
    // Implement in subclasses
  }
  
  /**
   * Navigate to next data point
   * Override in subclasses for specific behavior
   */
  protected navigateNext(): void {
    // Implement in subclasses
  }
  
  /**
   * Handle escape key
   */
  protected handleEscape(): void {
    // Default: blur the element
    if (this.container) {
      (this.container as HTMLElement).blur()
    }
  }
  
  /**
   * Announce message to screen readers
   */
  protected announceToScreenReader(message: string): void {
    if (typeof document === 'undefined') return
    
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }
  
  /**
   * Export chart as image
   */
  async exportAsImage(format: 'png' | 'svg' = 'png'): Promise<Blob> {
    if (format === 'svg') {
      const svg = this.toSVG()
      return new Blob([svg], { type: 'image/svg+xml' })
    }
    
    // Convert SVG to PNG using canvas
    const svg = this.toSVG()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    const img = new Image()
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        }, 'image/png')
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG image'))
      }
      
      img.src = url
    })
  }
}