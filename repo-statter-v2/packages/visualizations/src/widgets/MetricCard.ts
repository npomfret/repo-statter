/**
 * Metric Card Widget - Display key metrics with icons and trends
 * @module @repo-statter/visualizations/widgets
 */

export interface MetricData {
  label: string
  value: string | number
  icon?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
    label?: string
  }
  description?: string
  color?: string
  format?: 'number' | 'percent' | 'bytes' | 'duration' | 'custom'
}

export interface MetricCardOptions {
  theme?: 'light' | 'dark' | 'auto'
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
  clickable?: boolean
  onClick?: () => void
}

export class MetricCard {
  private cardId: string
  private observer?: IntersectionObserver

  constructor(
    private data: MetricData,
    private options: MetricCardOptions = {}
  ) {
    this.cardId = `metric-${Math.random().toString(36).substr(2, 9)}`
    this.options = {
      theme: 'auto',
      size: 'medium',
      animated: true,
      clickable: false,
      ...options
    }
  }

  render(): string {
    const theme = this.detectTheme()
    const colors = this.getThemeColors(theme)
    const size = this.getSizeConfig()
    
    return `
      <div id="${this.cardId}" 
           class="metric-card ${theme}-theme ${this.options.size}-size ${this.options.clickable ? 'clickable' : ''}"
           style="
             background: ${colors.cardBackground};
             border: 1px solid ${colors.border};
             border-radius: ${size.borderRadius};
             padding: ${size.padding};
             box-shadow: ${colors.shadow};
             transition: all 0.2s ease;
             cursor: ${this.options.clickable ? 'pointer' : 'default'};
             font-family: system-ui, -apple-system, sans-serif;
           "
           ${this.options.clickable ? 'role="button" tabindex="0"' : ''}
           ${this.options.clickable ? `aria-label="Click to view details for ${this.data.label}"` : ''}>
        
        <div class="metric-header" 
             style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${size.headerMargin};">
          
          <div class="metric-info" style="display: flex; align-items: center; flex: 1; min-width: 0;">
            ${this.data.icon ? `
              <div class="metric-icon" 
                   style="
                     width: ${size.iconSize}; 
                     height: ${size.iconSize}; 
                     margin-right: ${size.iconMargin}; 
                     flex-shrink: 0;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     background: ${this.data.color ? `${this.data.color}20` : colors.iconBackground};
                     border-radius: ${size.iconRadius};
                     color: ${this.data.color || colors.accent};
                   ">
                ${this.renderIcon(this.data.icon, size.iconInnerSize)}
              </div>
            ` : ''}
            
            <div class="metric-label-container" style="min-width: 0; flex: 1;">
              <h3 class="metric-label" 
                  style="
                    margin: 0; 
                    font-size: ${size.labelFontSize}; 
                    font-weight: 600; 
                    color: ${colors.text}; 
                    line-height: 1.2;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  " 
                  title="${this.data.label}">
                ${this.data.label}
              </h3>
            </div>
          </div>
          
          ${this.data.trend ? `
            <div class="metric-trend ${this.data.trend.direction}" 
                 style="
                   display: flex; 
                   align-items: center; 
                   font-size: ${size.trendFontSize}; 
                   font-weight: 600;
                   color: ${this.getTrendColor(this.data.trend.direction, colors)};
                   margin-left: 8px;
                   flex-shrink: 0;
                 "
                 title="${this.data.trend.label || `${this.data.trend.direction === 'up' ? 'Increased' : 'Decreased'} by ${Math.abs(this.data.trend.value)}%`}">
              ${this.renderTrendArrow(this.data.trend.direction, size.trendArrowSize)}
              <span style="margin-left: 4px;">${Math.abs(this.data.trend.value)}%</span>
            </div>
          ` : ''}
        </div>
        
        <div class="metric-content">
          <div class="metric-value-container" 
               style="margin-bottom: ${this.data.description ? size.valueMargin : '0'};">
            <div class="metric-value" 
                 style="
                   font-size: ${size.valueFontSize}; 
                   font-weight: 700; 
                   color: ${this.data.color || colors.accent}; 
                   line-height: 1;
                   word-break: break-all;
                 "
                 data-original-value="${this.data.value}">
              ${this.formatValue(this.data.value)}
            </div>
          </div>
          
          ${this.data.description ? `
            <p class="metric-description" 
               style="
                 margin: 0; 
                 font-size: ${size.descriptionFontSize}; 
                 color: ${colors.textSecondary}; 
                 line-height: 1.3;
                 opacity: 0.8;
               ">
              ${this.data.description}
            </p>
          ` : ''}
        </div>
      </div>
    `
  }

  hydrate(container: HTMLElement): void {
    const card = container.querySelector(`#${this.cardId}`) as HTMLElement
    if (!card) return

    // Add hover effects
    if (this.options.clickable || this.options.animated) {
      this.addHoverEffects(card)
    }

    // Add click handler
    if (this.options.clickable && this.options.onClick) {
      this.addClickHandlers(card)
    }

    // Add keyboard support
    if (this.options.clickable) {
      this.addKeyboardSupport(card)
    }

    // Animate value on first view
    if (this.options.animated) {
      this.setupValueAnimation(card)
    }
  }

  private detectTheme(): 'light' | 'dark' {
    if (this.options.theme === 'light' || this.options.theme === 'dark') {
      return this.options.theme
    }
    
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    }
    
    return 'light'
  }

  private getThemeColors(theme: 'light' | 'dark') {
    if (theme === 'dark') {
      return {
        cardBackground: '#2a2a2a',
        background: '#1a1a1a',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        accent: '#66b3ff',
        border: '#444444',
        iconBackground: '#3a3a3a',
        shadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        hoverShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
      }
    }
    
    return {
      cardBackground: '#ffffff',
      background: '#f8f9fa',
      text: '#333333',
      textSecondary: '#666666',
      accent: '#0066cc',
      border: '#e0e0e0',
      iconBackground: '#f0f0f0',
      shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      hoverShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
    }
  }

  private getSizeConfig() {
    const sizes = {
      small: {
        padding: '12px',
        borderRadius: '6px',
        headerMargin: '8px',
        valueMargin: '6px',
        iconSize: '24px',
        iconInnerSize: '16px',
        iconMargin: '8px',
        iconRadius: '4px',
        labelFontSize: '12px',
        valueFontSize: '20px',
        descriptionFontSize: '11px',
        trendFontSize: '11px',
        trendArrowSize: '12px'
      },
      medium: {
        padding: '16px',
        borderRadius: '8px',
        headerMargin: '12px',
        valueMargin: '8px',
        iconSize: '32px',
        iconInnerSize: '20px',
        iconMargin: '12px',
        iconRadius: '6px',
        labelFontSize: '14px',
        valueFontSize: '24px',
        descriptionFontSize: '12px',
        trendFontSize: '12px',
        trendArrowSize: '14px'
      },
      large: {
        padding: '20px',
        borderRadius: '10px',
        headerMargin: '16px',
        valueMargin: '12px',
        iconSize: '40px',
        iconInnerSize: '24px',
        iconMargin: '16px',
        iconRadius: '8px',
        labelFontSize: '16px',
        valueFontSize: '28px',
        descriptionFontSize: '14px',
        trendFontSize: '14px',
        trendArrowSize: '16px'
      }
    }
    
    return sizes[this.options.size!] || sizes.medium
  }

  private formatValue(value: string | number): string {
    if (typeof value === 'string') {
      return value
    }

    switch (this.data.format) {
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'bytes':
        return this.formatBytes(value)
      case 'duration':
        return this.formatDuration(value)
      case 'number':
      default:
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`
        }
        return value.toLocaleString()
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  private getTrendColor(direction: 'up' | 'down', colors: any): string {
    return direction === 'up' ? '#22c55e' : '#ef4444'
  }

  private renderIcon(iconName: string, size: string): string {
    // Map icon names to SVG icons
    const icons: Record<string, string> = {
      commits: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>`,
      users: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>`,
      code: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
      </svg>`,
      files: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/>
      </svg>`,
      activity: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.5 5.5H23V20H2V4h1.5v12.5z"/>
      </svg>`,
      time: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>`
    }
    
    return icons[iconName] || `<div style="width: ${size}; height: ${size}; background: currentColor; border-radius: 2px;"></div>`
  }

  private renderTrendArrow(direction: 'up' | 'down', size: string): string {
    const color = direction === 'up' ? '#22c55e' : '#ef4444'
    
    if (direction === 'up') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
        <path d="M7 14l5-5 5 5z"/>
      </svg>`
    } else {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
        <path d="M7 10l5 5 5-5z"/>
      </svg>`
    }
  }

  private addHoverEffects(card: HTMLElement): void {
    const colors = this.getThemeColors(this.detectTheme())
    
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = colors.hoverShadow
      card.style.transform = 'translateY(-2px)'
    })
    
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = colors.shadow
      card.style.transform = 'translateY(0)'
    })
  }

  private addClickHandlers(card: HTMLElement): void {
    card.addEventListener('click', () => {
      if (this.options.onClick) {
        this.options.onClick()
      }
    })
  }

  private addKeyboardSupport(card: HTMLElement): void {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (this.options.onClick) {
          this.options.onClick()
        }
      }
    })
  }

  private setupValueAnimation(card: HTMLElement): void {
    const valueEl = card.querySelector('.metric-value') as HTMLElement
    if (!valueEl) return

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateValue(valueEl)
          this.observer?.unobserve(entry.target)
        }
      })
    }, { threshold: 0.5 })

    this.observer.observe(valueEl)
  }

  private animateValue(element: HTMLElement): void {
    const originalValue = element.getAttribute('data-original-value')
    if (!originalValue || typeof this.data.value !== 'number') return

    const endValue = this.data.value
    const duration = 1500
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const currentValue = endValue * this.easeOutQuart(progress)
      element.textContent = this.formatValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    element.textContent = this.formatValue(0)
    requestAnimationFrame(animate)
  }

  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4)
  }

  updateData(newData: Partial<MetricData>): void {
    this.data = { ...this.data, ...newData }
    
    // Find the card in the DOM and update it
    const card = document.querySelector(`#${this.cardId}`) as HTMLElement
    if (card) {
      // Update the entire card content
      const container = card.parentElement
      if (container) {
        container.innerHTML = this.render()
        this.hydrate(container)
      }
    }
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    
    const card = document.querySelector(`#${this.cardId}`)
    if (card) {
      card.remove()
    }
  }
}