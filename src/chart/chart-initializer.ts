import type { PageScriptData } from './page-script.js'
import type { ChartRenderers } from './chart-renderers.js'
import type { EventHandlers } from './event-handlers.js'
import { ViewportChartLoader } from './viewport-chart-loader.js'
import { formatError } from '../utils/errors.js'

export class ChartInitializer {
  private viewportLoader?: ViewportChartLoader

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
    // Wait for chart libraries to load before rendering
    this.waitForChartLibraries().then(() => {
      // Initialize viewport-based chart loading
      this.viewportLoader = new ViewportChartLoader(this.renderers)
      this.viewportLoader.initialize()
      
      // Render user charts for top contributors (always render these)
      const limit = this.data.chartsConfig?.topContributorsLimit ?? 10
      const topContributors = this.data.contributors.slice(0, limit)
      this.renderers.renderUserCharts(topContributors)
      
      // Render awards if available (always render these)
      if (this.data.awards) {
        try {
          this.renderAwards()
        } catch (error) {
          // Client-side error logging - this is acceptable for debugging UI issues
          console.error('Failed to render awards:', formatError(error))
          const container = document.getElementById('awardsContainer')
          if (container) {
            container.innerHTML = `
              <div class="col-12">
                <div class="alert alert-warning d-flex align-items-center" role="alert">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  <div>
                    <h6 class="alert-heading mb-1">Awards Unavailable</h6>
                    <small>Awards section could not be rendered. Please check the console for details.</small>
                  </div>
                </div>
              </div>
            `
          }
        }
      }
    }).catch(error => {
      console.error('Failed to load chart libraries:', formatError(error))
      this.showChartLoadError()
    })
    
    // Setup all event listeners (filters, chart interactions)
    this.eventHandlers.setupEventListeners()
    
    // Listen for theme changes from core
    window.addEventListener('themeChanged', () => {
      this.renderers.updateChartsTheme()
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
          
          const commitLink = this.data.githubUrl ? 
            `<a href="${this.data.githubUrl}/commit/${award.sha}" target="_blank" class="text-decoration-none" title="${award.sha}">
              ${award.sha.substring(0, 7)}
            </a>` :
            `<span title="${award.sha}">${award.sha.substring(0, 7)}</span>`

          meta.innerHTML = `
            ${award.authorName} • 
            ${new Date(award.date).toLocaleDateString()} • 
            ${commitLink}
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


  
  private waitForChartLibraries(): Promise<void> {
    return new Promise((resolve, reject) => {
      let checkCount = 0
      const maxChecks = 100 // 10 seconds max wait
      
      const checkLibraries = () => {
        checkCount++
        
        if (window.ApexCharts && window.d3) {
          resolve()
        } else if (checkCount >= maxChecks) {
          reject(new Error('Chart libraries failed to load within timeout'))
        } else {
          setTimeout(checkLibraries, 100)
        }
      }
      
      checkLibraries()
    })
  }
  
  private showChartLoadError(): void {
    // Show error message in all chart containers
    const chartContainers = [
      'contributorsChart', 'fileTypesChart', 'growthChart',
      'categoryLinesChart', 'commitActivityChart', 'wordCloudChart',
      'fileHeatmapChart', 'topFilesChart', 'timeSliderChart'
    ]
    
    chartContainers.forEach(containerId => {
      const container = document.getElementById(containerId)
      if (container) {
        container.innerHTML = `
          <div class="d-flex align-items-center justify-content-center h-100 text-muted">
            <div class="text-center">
              <i class="bi bi-exclamation-triangle fs-3 mb-2"></i>
              <p class="mb-0">Chart libraries failed to load</p>
              <small>Please refresh the page to try again</small>
            </div>
          </div>
        `
      }
    })
  }
}