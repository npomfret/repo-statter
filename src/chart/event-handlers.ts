import type { PageScriptData } from './page-script.js'
import type { ChartRenderers } from './chart-renderers.js'
import { 
  applyFilters, 
  recalculateData, 
  populateAuthorFilter, 
  populateFileTypeFilter, 
  getDateRange, 
  clearFilters as clearFiltersState
} from '../chart/filter-system.js'

export class EventHandlers {
  private selectedFileType: string | null = null

  constructor(
    private data: PageScriptData,
    private renderers: ChartRenderers
  ) {}

  public setupEventListeners(): void {
    this.setupXAxisToggle()
    this.setupFilterSystem()
    this.setupClearFiltersButton()
    this.setupTopFilesTabs()
    this.setupFileTypeChartClick()
  }

  private setupXAxisToggle(): void {
    const chartInstances = this.renderers.getChartInstances()
    
    // Growth chart (merged Lines of Code and Repository Size)
    const growthRadios = document.querySelectorAll('input[name="growthXAxis"]')
    growthRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const xAxis = target.value as 'date' | 'commit'
        chartInstances.growth.render(this.data.linearSeries, this.data.timeSeries, xAxis, this.data.commits)
      })
    })
    
  }

  private setupFilterSystem(): void {
    // Initialize filters
    this.populateAuthorDropdown()
    this.populateFileTypeCheckboxes()
    
    // Get date range and populate date filters
    const dateRange = getDateRange(this.data.commits)
    this.populateDateFilter(dateRange)
    
    // Set up filter event listeners
    this.setupAuthorFilter()
    this.setupFileTypeFilter()
    this.setupDateFilter()
  }

  private populateAuthorDropdown(): void {
    const authorSelect = document.getElementById('authorFilter') as HTMLSelectElement
    if (!authorSelect) return
    
    const authors = populateAuthorFilter(this.data.commits)
    
    // Keep the "All Authors" option and add the rest
    authorSelect.innerHTML = '<option value="">All Authors</option>'
    authors.forEach(author => {
      const option = document.createElement('option')
      option.value = author
      option.textContent = author
      authorSelect.appendChild(option)
    })
  }

  private populateFileTypeCheckboxes(): void {
    const container = document.getElementById('fileTypeFilterContainer')
    if (!container) return
    
    const fileTypes = populateFileTypeFilter(this.data.commits)
    container.innerHTML = ''
    
    fileTypes.forEach(fileType => {
      const checkboxDiv = document.createElement('div')
      checkboxDiv.className = 'form-check'
      
      const checkbox = document.createElement('input')
      checkbox.className = 'form-check-input file-type-checkbox'
      checkbox.type = 'checkbox'
      checkbox.id = `fileType_${fileType}`
      checkbox.value = fileType
      checkbox.checked = true // Start with all selected
      
      const label = document.createElement('label')
      label.className = 'form-check-label'
      label.htmlFor = checkbox.id
      label.textContent = fileType
      
      checkboxDiv.appendChild(checkbox)
      checkboxDiv.appendChild(label)
      container.appendChild(checkboxDiv)
    })
    
    // Setup select all checkbox
    const selectAll = document.getElementById('fileTypeSelectAll') as HTMLInputElement
    if (selectAll) {
      selectAll.checked = true
      selectAll.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked
        const checkboxes = container.querySelectorAll('.file-type-checkbox') as NodeListOf<HTMLInputElement>
        checkboxes.forEach(cb => cb.checked = isChecked)
        this.applyFiltersAndUpdate()
      })
    }
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
    const container = document.getElementById('fileTypeFilterContainer')
    if (!container) return
    
    // Add event listener to the container for delegation
    container.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.classList.contains('file-type-checkbox')) {
        // Update select all checkbox state
        const checkboxes = container.querySelectorAll('.file-type-checkbox') as NodeListOf<HTMLInputElement>
        const selectAll = document.getElementById('fileTypeSelectAll') as HTMLInputElement
        if (selectAll) {
          const allChecked = Array.from(checkboxes).every(cb => cb.checked)
          const someChecked = Array.from(checkboxes).some(cb => cb.checked)
          selectAll.checked = allChecked
          selectAll.indeterminate = someChecked && !allChecked
        }
        this.applyFiltersAndUpdate()
      }
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
      this.selectedFileType = null
      this.updateFilterUI()
      this.applyFiltersAndUpdate()
      this.updateTopFilesWithFilter()
    })
  }

  private updateFilterUI(): void {
    const authorSelect = document.getElementById('authorFilter') as HTMLInputElement
    const startInput = document.getElementById('dateFromFilter') as HTMLInputElement
    const endInput = document.getElementById('dateToFilter') as HTMLInputElement
    
    authorSelect.value = ''
    
    // Reset all file type checkboxes to checked
    const fileTypeCheckboxes = document.querySelectorAll('.file-type-checkbox') as NodeListOf<HTMLInputElement>
    fileTypeCheckboxes.forEach(cb => cb.checked = true)
    
    // Reset select all checkbox
    const selectAll = document.getElementById('fileTypeSelectAll') as HTMLInputElement
    if (selectAll) {
      selectAll.checked = true
      selectAll.indeterminate = false
    }
    
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
    const startInput = document.getElementById('dateFromFilter') as HTMLInputElement
    const endInput = document.getElementById('dateToFilter') as HTMLInputElement
    
    // Get selected file types from checkboxes
    const fileTypeCheckboxes = document.querySelectorAll('.file-type-checkbox:checked') as NodeListOf<HTMLInputElement>
    const selectedFileTypes = Array.from(fileTypeCheckboxes).map(cb => cb.value)
    
    return {
      authorFilter: authorSelect.value,
      fileTypeFilter: selectedFileTypes,
      dateFromFilter: startInput.value,
      dateToFilter: endInput.value
    }
  }

  private updateFilterStatus(filters: any): void {
    const filteredCommits = applyFilters(this.data.commits, filters)
    const statusElement = document.getElementById('filterStatus')!
    
    let statusText = `Showing ${filteredCommits.length} of ${this.data.commits.length} commits`
    
    // Add details about active filters
    const activeFilters = []
    if (filters.authorFilter) {
      activeFilters.push(`Author: ${filters.authorFilter}`)
    }
    if (filters.fileTypeFilter && filters.fileTypeFilter.length > 0 && filters.fileTypeFilter.length < populateFileTypeFilter(this.data.commits).length) {
      activeFilters.push(`File types: ${filters.fileTypeFilter.length} selected`)
    }
    if (filters.dateFromFilter || filters.dateToFilter) {
      const dateRange = getDateRange(this.data.commits)
      if (filters.dateFromFilter !== dateRange.minDate.toISOString().split('T')[0] || 
          filters.dateToFilter !== dateRange.maxDate.toISOString().split('T')[0]) {
        activeFilters.push('Date range')
      }
    }
    
    if (activeFilters.length > 0) {
      statusText += ` (${activeFilters.join(', ')})`
    }
    
    statusElement.textContent = statusText
  }

  private setupTopFilesTabs(): void {
    const tabElement = document.querySelector('#largest-tab')
    
    if (tabElement && this.data.topFilesData) {
      const topFilesChart = this.renderers.getTopFilesChart()
      
      // Listen for Bootstrap tab events
      const tabTriggers = document.querySelectorAll('button[data-bs-toggle="tab"]')
      tabTriggers.forEach(trigger => {
        trigger.addEventListener('shown.bs.tab', (event) => {
          const target = event.target as HTMLElement
          const tabId = target.id
          
          const height = this.data.chartsConfig?.topFilesChartHeight ?? 400
          if (tabId === 'largest-tab') {
            topFilesChart.render(this.data.topFilesData!, 'largest', this.data.isLizardInstalled ?? true, this.selectedFileType, height)
          } else if (tabId === 'churn-tab') {
            topFilesChart.render(this.data.topFilesData!, 'churn', this.data.isLizardInstalled ?? true, this.selectedFileType, height)
          } else if (tabId === 'complex-tab') {
            topFilesChart.render(this.data.topFilesData!, 'complex', this.data.isLizardInstalled ?? true, this.selectedFileType, height)
          }
        })
      })
    }
  }

  private setupFileTypeChartClick(): void {
    const fileTypesChart = this.renderers.getFileTypesChart()
    fileTypesChart.setClickHandler((fileType: string | null) => {
      this.selectedFileType = fileType
      this.updateTopFilesWithFilter()
      this.updateFileHeatmapWithFilter()
      this.updateFileTypeIndicator()
    })
    
    // Handle clear button
    const clearButton = document.getElementById('clearFileTypeFilter')
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.selectedFileType = null
        this.updateTopFilesWithFilter()
        this.updateFileHeatmapWithFilter()
        this.updateFileTypeIndicator()
      })
    }
  }

  private updateFileTypeIndicator(): void {
    const indicator = document.getElementById('fileTypeFilterIndicator')
    const typeSpan = document.getElementById('selectedFileType')
    
    if (indicator && typeSpan) {
      if (this.selectedFileType) {
        indicator.classList.remove('d-none')
        typeSpan.textContent = this.selectedFileType
      } else {
        indicator.classList.add('d-none')
      }
    }
  }

  private updateFileHeatmapWithFilter(): void {
    const fileHeatmapChart = this.renderers.getChartInstances().fileHeatmap
    
    if (this.selectedFileType && fileHeatmapChart) {
      // Filter file heat data by file type
      const filteredData = this.data.fileHeatData.filter(file => {
        return file.fileType === this.selectedFileType
      })
      
      if (filteredData.length > 0) {
        const height = this.data.chartsConfig?.fileHeatmapHeight ?? 400
        const maxFiles = this.data.chartsConfig?.fileHeatmapMaxFiles ?? 100
        fileHeatmapChart.render(filteredData, height, maxFiles)
      } else {
        // Show empty state
        const container = document.querySelector('#fileHeatmapChart')
        if (container) {
          container.innerHTML = `
            <div class="text-center text-muted">
              <i class="fas fa-filter fa-3x mb-3"></i>
              <p>No files with type "${this.selectedFileType}" found</p>
            </div>
          `
        }
      }
    } else if (fileHeatmapChart) {
      // No filter, show all files
      const height = this.data.chartsConfig?.fileHeatmapHeight ?? 400
      const maxFiles = this.data.chartsConfig?.fileHeatmapMaxFiles ?? 100
      fileHeatmapChart.render(this.data.fileHeatData, height, maxFiles)
    }
  }
  
  private updateTopFilesWithFilter(): void {
    const topFilesChart = this.renderers.getTopFilesChart()
    
    // Get current active tab
    const activeTab = document.querySelector('.nav-link.active[data-bs-toggle="tab"]') as HTMLElement
    let mode: 'largest' | 'churn' | 'complex' = 'largest'
    
    if (activeTab) {
      const tabId = activeTab.id
      if (tabId === 'churn-tab') mode = 'churn'
      else if (tabId === 'complex-tab') mode = 'complex'
    }
    
    // Re-render with file type filter
    if (this.data.topFilesData) {
      const height = this.data.chartsConfig?.topFilesChartHeight ?? 400
      topFilesChart.render(
        this.data.topFilesData, 
        mode, 
        this.data.isLizardInstalled ?? true,
        this.selectedFileType,
        height
      )
    }
  }

  public getSelectedFileType(): string | null {
    return this.selectedFileType
  }
}