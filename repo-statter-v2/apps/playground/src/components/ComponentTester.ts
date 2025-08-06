/**
 * Component testing utility for the playground
 */
import { ComponentRegistry } from '@repo-statter/visualizations'

export class ComponentTester {
  private loadedComponents: Map<string, any> = new Map()

  /**
   * Load and render a component with sample data
   */
  async loadComponent(
    componentType: string,
    data: any,
    container: HTMLElement
  ): Promise<void> {
    try {
      // Clear previous content
      container.innerHTML = ''

      // Create wrapper for the component
      const wrapper = document.createElement('div')
      wrapper.className = 'component-demo'
      wrapper.style.cssText = `
        padding: 1rem;
        border: 1px dashed #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
        margin-bottom: 1rem;
      `

      // Handle different component types
      switch (componentType) {
        case 'growth-chart':
          await this.renderGrowthChart(wrapper, data)
          break
        case 'file-types-pie':
          await this.renderFileTypesPie(wrapper, data)
          break
        case 'top-files-table':
          await this.renderTopFilesTable(wrapper, data)
          break
        case 'time-range-slider':
          await this.renderTimeRangeSlider(wrapper, data)
          break
        case 'metric-card':
          await this.renderMetricCard(wrapper, data)
          break
        case 'chart-toggle':
          await this.renderChartToggle(wrapper, data)
          break
        default:
          throw new Error(`Unknown component type: ${componentType}`)
      }

      // Add wrapper to container
      container.appendChild(wrapper)

      // Add component info
      this.addComponentInfo(container, componentType, data)

    } catch (error) {
      console.error(`Error loading ${componentType}:`, error)
      container.innerHTML = `
        <div class="error">
          <strong>Failed to load ${componentType}:</strong><br>
          ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
      `
    }
  }

  private async renderGrowthChart(container: HTMLElement, data: any): Promise<void> {
    const { GrowthChart } = await import('@repo-statter/visualizations')
    
    const chart = new GrowthChart(data, { 
      height: 400,
      theme: this.getCurrentTheme()
    })
    
    container.innerHTML = chart.renderStatic()
    await chart.hydrate(container)
    
    this.loadedComponents.set('growth-chart', chart)
  }

  private async renderFileTypesPie(container: HTMLElement, data: any): Promise<void> {
    const { FileTypesPieChart } = await import('@repo-statter/visualizations')
    
    const chart = new FileTypesPieChart(data, {
      width: 400,
      height: 400,
      theme: this.getCurrentTheme()
    })
    
    container.innerHTML = chart.renderStatic()
    await chart.hydrate(container)
    
    this.loadedComponents.set('file-types-pie', chart)
  }

  private async renderTopFilesTable(container: HTMLElement, data: any): Promise<void> {
    const { TopFilesTable } = await import('@repo-statter/visualizations')
    
    const table = new TopFilesTable(data, {
      maxFiles: 20,
      theme: this.getCurrentTheme(),
      showFileIcons: true
    })
    
    container.innerHTML = table.renderStatic()
    await table.hydrate(container)
    
    this.loadedComponents.set('top-files-table', table)
  }

  private async renderTimeRangeSlider(container: HTMLElement, data: any): Promise<void> {
    const { TimeRangeSlider } = await import('@repo-statter/visualizations')
    
    const slider = new TimeRangeSlider(data, {
      onChange: (range) => {
        console.log('Date range changed:', range)
        this.showRangeInfo(container, range)
      }
    })
    
    container.innerHTML = slider.render()
    await slider.hydrate(container)
    
    this.loadedComponents.set('time-range-slider', slider)
  }

  private async renderMetricCard(container: HTMLElement, data: any): Promise<void> {
    const { MetricCard } = await import('@repo-statter/visualizations')
    
    const cards = Array.isArray(data) ? data : [data]
    const cardContainer = document.createElement('div')
    cardContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 1rem;'
    
    for (const cardData of cards) {
      const cardWrapper = document.createElement('div')
      cardWrapper.style.cssText = 'flex: 1; min-width: 200px;'
      
      const card = new MetricCard(cardData, {
        theme: this.getCurrentTheme()
      })
      
      cardWrapper.innerHTML = card.render()
      await card.hydrate(cardWrapper)
      cardContainer.appendChild(cardWrapper)
    }
    
    container.appendChild(cardContainer)
    this.loadedComponents.set('metric-card', cards)
  }

  private async renderChartToggle(container: HTMLElement, data: any): Promise<void> {
    const { ChartToggle } = await import('@repo-statter/visualizations')
    
    const toggle = new ChartToggle(data.options, {
      defaultValue: data.defaultValue,
      onChange: (value) => {
        console.log('Toggle changed:', value)
        this.showToggleInfo(container, value)
      }
    })
    
    const toggleWrapper = document.createElement('div')
    toggleWrapper.style.cssText = 'margin-bottom: 1rem;'
    toggleWrapper.innerHTML = toggle.render()
    await toggle.hydrate(toggleWrapper)
    
    container.appendChild(toggleWrapper)
    this.loadedComponents.set('chart-toggle', toggle)
  }

  private addComponentInfo(
    container: HTMLElement,
    componentType: string,
    data: any
  ): void {
    const infoSection = document.createElement('div')
    infoSection.className = 'component-info'
    infoSection.style.cssText = `
      margin-top: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #666;
    `
    
    const dataPreview = document.createElement('details')
    dataPreview.innerHTML = `
      <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem;">
        Sample Data Structure
      </summary>
      <pre style="background: white; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.8rem;">${JSON.stringify(data, null, 2)}</pre>
    `
    
    infoSection.appendChild(dataPreview)
    container.appendChild(infoSection)
  }

  private showRangeInfo(container: HTMLElement, range: { start: Date; end: Date }): void {
    let infoEl = container.querySelector('.range-info') as HTMLElement
    if (!infoEl) {
      infoEl = document.createElement('div')
      infoEl.className = 'range-info'
      infoEl.style.cssText = `
        margin-top: 1rem;
        padding: 0.75rem;
        background: #e3f2fd;
        border-radius: 4px;
        font-size: 0.9rem;
        color: #1976d2;
      `
      container.appendChild(infoEl)
    }
    
    infoEl.innerHTML = `
      <strong>Selected Range:</strong><br>
      From: ${range.start.toLocaleDateString()}<br>
      To: ${range.end.toLocaleDateString()}<br>
      Duration: ${Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))} days
    `
  }

  private showToggleInfo(container: HTMLElement, value: string): void {
    let infoEl = container.querySelector('.toggle-info') as HTMLElement
    if (!infoEl) {
      infoEl = document.createElement('div')
      infoEl.className = 'toggle-info'
      infoEl.style.cssText = `
        margin-top: 1rem;
        padding: 0.75rem;
        background: #e8f5e8;
        border-radius: 4px;
        font-size: 0.9rem;
        color: #2e7d32;
      `
      container.appendChild(infoEl)
    }
    
    infoEl.innerHTML = `<strong>Selected:</strong> ${value}`
  }

  private getCurrentTheme(): 'light' | 'dark' {
    return document.body.classList.contains('dark-theme') ? 'dark' : 'light'
  }

  /**
   * Update all loaded components with new theme
   */
  updateTheme(): void {
    // Implementation would reload components with new theme
    // This is a placeholder for theme updates
    console.log('Theme updated for loaded components')
  }

  /**
   * Clean up loaded components
   */
  cleanup(): void {
    this.loadedComponents.forEach((component, type) => {
      if (component && typeof component.destroy === 'function') {
        component.destroy()
      }
    })
    this.loadedComponents.clear()
  }
}