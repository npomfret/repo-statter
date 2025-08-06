/**
 * Main entry point for the visualization components playground
 */
import { ComponentRegistry } from '@repo-statter/visualizations'
import { ComponentTester } from './components/ComponentTester'
import { ThemeManager } from './utils/ThemeManager'
import { SampleData } from './data/SampleData'

class PlaygroundApp {
  private tester: ComponentTester
  private themeManager: ThemeManager
  private currentComponent: string | null = null

  constructor() {
    this.tester = new ComponentTester()
    this.themeManager = new ThemeManager()
  }

  async init(): Promise<void> {
    // Initialize theme
    this.themeManager.init()
    this.setupThemeToggle()

    // Populate component list
    this.populateComponentList()

    // Handle URL parameters for direct linking
    this.handleUrlParams()

    console.log('🚀 Playground initialized!')
  }

  private populateComponentList(): void {
    const componentList = document.getElementById('componentList')
    if (!componentList) return

    const components = [
      {
        id: 'growth-chart',
        name: 'Growth Chart',
        description: 'Line chart showing repository growth over time'
      },
      {
        id: 'file-types-pie',
        name: 'File Types Pie Chart',
        description: 'Distribution of code by file types'
      },
      {
        id: 'top-files-table',
        name: 'Top Files Table',
        description: 'Interactive table of files by metrics'
      },
      {
        id: 'time-range-slider',
        name: 'Time Range Slider',
        description: 'Interactive date range picker'
      },
      {
        id: 'metric-card',
        name: 'Metric Card',
        description: 'Animated metric display with trends'
      },
      {
        id: 'chart-toggle',
        name: 'Chart Toggle',
        description: 'Multi-option toggle control'
      }
    ]

    components.forEach(component => {
      const li = document.createElement('li')
      li.className = 'component-item'
      
      const button = document.createElement('button')
      button.className = 'component-button'
      button.dataset.component = component.id
      button.innerHTML = `
        <span class="component-name">${component.name}</span>
        <span class="component-description">${component.description}</span>
      `
      
      button.addEventListener('click', () => {
        this.selectComponent(component.id)
      })
      
      li.appendChild(button)
      componentList.appendChild(li)
    })
  }

  private async selectComponent(componentId: string): Promise<void> {
    // Update active button
    document.querySelectorAll('.component-button').forEach(btn => {
      btn.classList.remove('active')
    })
    document.querySelector(`[data-component="${componentId}"]`)?.classList.add('active')

    // Update URL without reload
    const url = new URL(window.location.href)
    url.searchParams.set('component', componentId)
    window.history.pushState({ component: componentId }, '', url.toString())

    this.currentComponent = componentId
    await this.loadComponent(componentId)
  }

  private async loadComponent(componentId: string): Promise<void> {
    const demoTitle = document.getElementById('demoTitle')
    const demoContent = document.getElementById('demoContent')
    
    if (!demoTitle || !demoContent) return

    try {
      // Show loading state
      demoTitle.textContent = `Loading ${componentId}...`
      demoContent.innerHTML = '<div class="loading">Loading component...</div>'

      // Get sample data for the component
      const sampleData = SampleData.getForComponent(componentId)
      
      if (!sampleData) {
        throw new Error(`No sample data available for ${componentId}`)
      }

      // Load and render component
      await this.tester.loadComponent(componentId, sampleData, demoContent)
      
      // Update title
      const componentName = this.getComponentDisplayName(componentId)
      demoTitle.textContent = componentName
      
    } catch (error) {
      console.error('Failed to load component:', error)
      demoContent.innerHTML = `
        <div class="error">
          <strong>Failed to load component:</strong><br>
          ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
      `
      demoTitle.textContent = `Error loading ${componentId}`
    }
  }

  private getComponentDisplayName(componentId: string): string {
    const names: Record<string, string> = {
      'growth-chart': 'Growth Chart',
      'file-types-pie': 'File Types Pie Chart',
      'top-files-table': 'Top Files Table',
      'time-range-slider': 'Time Range Slider',
      'metric-card': 'Metric Card',
      'chart-toggle': 'Chart Toggle'
    }
    return names[componentId] || componentId
  }

  private setupThemeToggle(): void {
    const themeToggle = document.getElementById('themeToggle')
    if (!themeToggle) return

    themeToggle.addEventListener('click', () => {
      this.themeManager.toggle()
      
      // Reload current component to apply theme
      if (this.currentComponent) {
        this.loadComponent(this.currentComponent)
      }
    })
  }

  private handleUrlParams(): void {
    const url = new URL(window.location.href)
    const component = url.searchParams.get('component')
    
    if (component) {
      this.selectComponent(component)
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new PlaygroundApp()
    await app.init()
  } catch (error) {
    console.error('Failed to initialize playground:', error)
  }
})