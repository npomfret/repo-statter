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
    
    // Render awards if available
    if (this.data.awards) {
      this.renderAwards()
    }
    
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
  
  private renderAwards(): void {
    const container = document.getElementById('awardsContainer')
    if (!container || !this.data.awards) return
    
    const awards = this.data.awards
    
    const awardCategories = [
      { title: 'Most Files Modified', data: awards.filesModified, icon: '📁', color: 'primary', type: 'commit' },
      { title: 'Most Bytes Added', data: awards.bytesAdded, icon: '➕', color: 'success', type: 'commit' },
      { title: 'Most Bytes Removed', data: awards.bytesRemoved, icon: '➖', color: 'danger', type: 'commit' },
      { title: 'Most Lines Added', data: awards.linesAdded, icon: '📈', color: 'info', type: 'commit' },
      { title: 'Most Lines Removed', data: awards.linesRemoved, icon: '📉', color: 'warning', type: 'commit' },
      { title: 'Lowest Average Lines Changed', data: awards.lowestAverage, icon: '🎯', color: 'secondary', type: 'contributor' },
      { title: 'Highest Average Lines Changed', data: awards.highestAverage, icon: '💥', color: 'dark', type: 'contributor' }
    ]
    
    container.innerHTML = ''
    
    awardCategories.forEach(category => {
      if (category.data.length === 0) return
      
      const col = document.createElement('div')
      col.className = 'col-lg-4 col-md-6 mb-4'
      
      const card = document.createElement('div')
      card.className = 'card h-100'
      
      const cardHeader = document.createElement('div')
      cardHeader.className = `card-header bg-${category.color} text-white`
      cardHeader.innerHTML = `
        <h6 class="mb-0">
          <span class="me-2" style="font-size: 1.2em;">${category.icon}</span>
          ${category.title}
        </h6>
      `
      
      const cardBody = document.createElement('div')
      cardBody.className = 'card-body'
      
      const list = document.createElement('ol')
      list.className = 'list-group list-group-flush'
      
      category.data.forEach((award: any) => {
        const item = document.createElement('li')
        item.className = 'list-group-item d-flex justify-content-between align-items-start'
        
        const content = document.createElement('div')
        content.className = 'ms-2 me-auto'
        
        const header = document.createElement('div')
        header.className = 'fw-bold'
        
        const meta = document.createElement('small')
        meta.className = 'text-muted'
        
        const badge = document.createElement('span')
        badge.className = `badge bg-${category.color} rounded-pill`
        
        if (category.type === 'commit') {
          // CommitAward type
          header.textContent = award.message.length > 50 ? 
            award.message.substring(0, 50) + '...' : 
            award.message
          
          meta.innerHTML = `
            ${award.authorName} • 
            ${new Date(award.date).toLocaleDateString()} • 
            <a href="#" class="text-decoration-none" onclick="return false;" title="${award.sha}">
              ${award.sha.substring(0, 7)}
            </a>
          `
          
          badge.textContent = award.value.toLocaleString()
        } else {
          // ContributorAward type
          header.textContent = award.name
          
          meta.innerHTML = `
            ${award.commits} commits • 
            ${award.averageLinesChanged.toFixed(1)} avg lines/commit
          `
          
          badge.textContent = award.averageLinesChanged.toFixed(1)
        }
        
        content.appendChild(header)
        content.appendChild(meta)
        
        item.appendChild(content)
        item.appendChild(badge)
        list.appendChild(item)
      })
      
      cardBody.appendChild(list)
      card.appendChild(cardHeader)
      card.appendChild(cardBody)
      col.appendChild(card)
      container.appendChild(col)
    })
  }
}