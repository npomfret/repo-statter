import type { PageScriptData } from './page-script.js'
import type { ChartRenderers } from './chart-renderers.js'
import { 
  applyFilters, 
  recalculateData, 
  populateAuthorFilter, 
  populateFileTypeFilter, 
  getDateRange, 
  clearFilters as clearFiltersState, 
  getFilterStatus 
} from '../chart/filter-system.js'

export class EventHandlers {
  constructor(
    private data: PageScriptData,
    private renderers: ChartRenderers
  ) {}

  public setupEventListeners(): void {
    this.setupThemeToggle()
    this.setupXAxisToggle()
    this.setupFilterSystem()
    this.setupClearFiltersButton()
  }

  private setupThemeToggle(): void {
    const themeToggle = document.getElementById('themeToggle')
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme')
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-bs-theme', newTheme)
        
        // Update all charts with new theme
        this.renderers.updateChartsTheme()
      })
    }
  }

  private setupXAxisToggle(): void {
    const chartInstances = this.renderers.getChartInstances()
    
    // Lines of Code chart
    const linesOfCodeRadios = document.querySelectorAll('input[name="linesOfCodeXAxis"]')
    linesOfCodeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const xAxis = target.value as 'date' | 'commit'
        chartInstances.linesOfCode.render(this.data.linearSeries, this.data.timeSeries, xAxis, this.data.commits)
      })
    })
    
    // Repository Size chart
    const repoSizeRadios = document.querySelectorAll('input[name="repoSizeXAxis"]')
    repoSizeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const xAxis = target.value as 'date' | 'commit'
        chartInstances.repositorySize.render(this.data.linearSeries, this.data.timeSeries, xAxis, this.data.commits)
      })
    })
    
  }

  private setupFilterSystem(): void {
    // Initialize filters
    populateAuthorFilter(this.data.commits)
    populateFileTypeFilter(this.data.commits)
    
    // Get date range and populate date filters
    const dateRange = getDateRange(this.data.commits)
    this.populateDateFilter(dateRange)
    
    // Set up filter event listeners
    this.setupAuthorFilter()
    this.setupFileTypeFilter()
    this.setupDateFilter()
  }

  private populateDateFilter(dateRange: { minDate: Date, maxDate: Date }): void {
    const startInput = document.getElementById('dateFromFilter') as HTMLInputElement
    const endInput = document.getElementById('dateToFilter') as HTMLInputElement
    
    startInput.value = dateRange.minDate.toISOString().split('T')[0]!
    startInput.max = dateRange.maxDate.toISOString().split('T')[0]!
    endInput.value = dateRange.maxDate.toISOString().split('T')[0]!
    endInput.min = dateRange.minDate.toISOString().split('T')[0]!
  }

  private setupAuthorFilter(): void {
    const authorSelect = document.getElementById('authorFilter') as HTMLInputElement
    authorSelect.addEventListener('change', () => {
      this.applyFiltersAndUpdate()
    })
  }

  private setupFileTypeFilter(): void {
    const fileTypeSelect = document.getElementById('fileTypeFilter') as HTMLInputElement
    fileTypeSelect.addEventListener('change', () => {
      this.applyFiltersAndUpdate()
    })
  }

  private setupDateFilter(): void {
    const startInput = document.getElementById('dateFromFilter') as HTMLInputElement
    const endInput = document.getElementById('dateToFilter') as HTMLInputElement
    
    startInput.addEventListener('change', () => {
      this.applyFiltersAndUpdate()
    })
    
    endInput.addEventListener('change', () => {
      this.applyFiltersAndUpdate()
    })
  }

  private setupClearFiltersButton(): void {
    const clearButton = document.getElementById('clearFilters')!
    clearButton.addEventListener('click', () => {
      clearFiltersState()
      this.updateFilterUI()
      this.applyFiltersAndUpdate()
    })
  }

  private updateFilterUI(): void {
    const authorSelect = document.getElementById('authorFilter') as HTMLInputElement
    const fileTypeSelect = document.getElementById('fileTypeFilter') as HTMLInputElement
    const startInput = document.getElementById('dateFromFilter') as HTMLInputElement
    const endInput = document.getElementById('dateToFilter') as HTMLInputElement
    
    authorSelect.value = 'all'
    fileTypeSelect.value = 'all'
    
    const dateRange = getDateRange(this.data.commits)
    startInput.value = dateRange.minDate.toISOString().split('T')[0]!
    endInput.value = dateRange.maxDate.toISOString().split('T')[0]!
  }

  private applyFiltersAndUpdate(): void {
    const filters = this.getCurrentFilters()
    const filteredCommits = applyFilters(this.data.commits, filters)
    const recalculatedData = recalculateData(filteredCommits)
    
    // Update all charts with filtered data
    this.renderers.renderAllCharts()
    
    // Update user charts with filtered contributors
    const filteredContributors = recalculatedData.contributors.filter(c => c.commits > 0)
    this.renderers.renderUserCharts(filteredContributors)
    
    // Update filter status
    this.updateFilterStatus(filters)
  }

  private getCurrentFilters() {
    const authorSelect = document.getElementById('authorFilter') as HTMLInputElement
    const fileTypeSelect = document.getElementById('fileTypeFilter') as HTMLInputElement
    const startInput = document.getElementById('dateFromFilter') as HTMLInputElement
    const endInput = document.getElementById('dateToFilter') as HTMLInputElement
    
    return {
      authorFilter: authorSelect.value,
      fileTypeFilter: fileTypeSelect.value,
      dateFromFilter: startInput.value,
      dateToFilter: endInput.value
    }
  }

  private updateFilterStatus(filters: any): void {
    const status = getFilterStatus(filters, this.data.commits)
    const statusElement = document.getElementById('filterStatus')!
    
    statusElement.innerHTML = `
      <div class="alert alert-info">
        <strong>Filters Active:</strong> ${status}
      </div>
    `
  }
}