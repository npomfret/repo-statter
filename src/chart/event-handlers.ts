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
  private selectedFileType: string | null = null

  constructor(
    private data: PageScriptData,
    private renderers: ChartRenderers
  ) {}

  public setupEventListeners(): void {
    this.setupThemeToggle()
    this.setupXAxisToggle()
    this.setupFilterSystem()
    this.setupClearFiltersButton()
    this.setupTopFilesTabs()
    this.setupFileTypeChartClick()
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
      this.selectedFileType = null
      this.updateFilterUI()
      this.applyFiltersAndUpdate()
      this.updateTopFilesWithFilter()
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
          
          if (tabId === 'largest-tab') {
            topFilesChart.render(this.data.topFilesData!, 'largest', this.data.isLizardInstalled ?? true, this.selectedFileType)
          } else if (tabId === 'churn-tab') {
            topFilesChart.render(this.data.topFilesData!, 'churn', this.data.isLizardInstalled ?? true, this.selectedFileType)
          } else if (tabId === 'complex-tab') {
            topFilesChart.render(this.data.topFilesData!, 'complex', this.data.isLizardInstalled ?? true, this.selectedFileType)
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
        const fileType = this.getFileTypeBrowser(file.fileName)
        return fileType === this.selectedFileType
      })
      
      if (filteredData.length > 0) {
        fileHeatmapChart.render(filteredData)
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
      fileHeatmapChart.render(this.data.fileHeatData)
    }
  }
  
  private getFileTypeBrowser(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) return 'Other'
    
    const ext = fileName.slice(lastDotIndex).toLowerCase()
    
    const FILE_TYPE_MAP: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.cc': 'C++',
      '.cxx': 'C++',
      '.c': 'C',
      '.h': 'C',
      '.hpp': 'C++',
      '.go': 'Go',
      '.rs': 'Rust',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.r': 'R',
      '.lua': 'Lua',
      '.pl': 'Perl',
      '.sh': 'Shell',
      '.bash': 'Shell',
      '.zsh': 'Shell',
      '.fish': 'Shell',
      '.ps1': 'PowerShell',
      '.psm1': 'PowerShell',
      '.psd1': 'PowerShell',
      '.bat': 'Batch',
      '.cmd': 'Batch',
      '.json': 'JSON',
      '.xml': 'XML',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.toml': 'TOML',
      '.ini': 'INI',
      '.cfg': 'Config',
      '.conf': 'Config',
      '.properties': 'Properties',
      '.env': 'Environment',
      '.gitignore': 'Git',
      '.gitattributes': 'Git',
      '.gitmodules': 'Git',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'SCSS',
      '.less': 'CSS',
      '.html': 'HTML',
      '.htm': 'HTML',
      '.xhtml': 'HTML',
      '.vue': 'Vue',
      '.md': 'Markdown',
      '.markdown': 'Markdown',
      '.rst': 'reStructuredText',
      '.tex': 'LaTeX',
      '.sql': 'SQL',
      '.dockerfile': 'Dockerfile',
      '.makefile': 'Makefile',
      '.cmake': 'CMake',
      '.gradle': 'Gradle',
      '.vim': 'VimScript',
      '.vimrc': 'VimScript'
    }
    
    return FILE_TYPE_MAP[ext] || 'Other'
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
      topFilesChart.render(
        this.data.topFilesData, 
        mode, 
        this.data.isLizardInstalled ?? true,
        this.selectedFileType
      )
    }
  }

  public getSelectedFileType(): string | null {
    return this.selectedFileType
  }
}