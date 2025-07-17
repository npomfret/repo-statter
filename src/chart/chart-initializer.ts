import type { PageScriptData } from './page-script.js'
import type { ChartRenderers } from './chart-renderers.js'
import type { EventHandlers } from './event-handlers.js'

export class ChartInitializer {
  constructor(
    private data: PageScriptData,
    private renderers: ChartRenderers,
    private eventHandlers: EventHandlers
  ) {}

  public initialize(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeCharts())
    } else {
      this.initializeCharts()
    }
  }

  private initializeCharts(): void {
    // Render all main charts
    this.renderers.renderAllCharts()
    
    // Render user charts for top contributors
    const topContributors = this.data.contributors.slice(0, 10)
    this.renderers.renderUserCharts(topContributors)
    
    // Setup all event listeners
    this.eventHandlers.setupEventListeners()
    
    // Initialize theme based on user preference or system preference
    this.initializeTheme()
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    let theme = savedTheme || (systemPrefersDark ? 'dark' : 'light')
    
    document.documentElement.setAttribute('data-bs-theme', theme)
    
    // Update theme toggle button state
    const themeToggle = document.getElementById('theme-toggle')
    if (themeToggle) {
      const icon = themeToggle.querySelector('i')
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'
      }
    }
    
    // Save theme preference
    localStorage.setItem('theme', theme)
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-bs-theme', newTheme)
        this.renderers.updateChartsTheme()
      }
    })
  }
}