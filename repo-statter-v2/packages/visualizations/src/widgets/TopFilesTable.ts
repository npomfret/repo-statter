/**
 * Top Files Table Widget
 * Interactive table showing top files by various metrics with tabs
 * @module @repo-statter/visualizations/widgets
 */

export interface FileData {
  path: string
  metric: number
  secondaryMetric?: number
  contributors?: string[]
}

export interface TopFilesData {
  tabs: Array<{
    id: string
    label: string
    files: FileData[]
  }>
}

export interface TopFilesTableOptions {
  defaultTab?: string
  maxFiles?: number
  theme?: 'light' | 'dark' | 'auto'
  showFileIcons?: boolean
  pathTruncateLength?: number
}

/**
 * Interactive table component for displaying top files across different metrics
 * Supports tabbed interface, sortable columns, and accessible navigation
 */
export class TopFilesTable {
  private tableId: string
  private currentSortColumn: string | null = null
  private currentSortOrder: 'asc' | 'desc' = 'desc'

  constructor(
    private data: TopFilesData,
    private options: TopFilesTableOptions = {}
  ) {
    this.tableId = `files-table-${Math.random().toString(36).substr(2, 9)}`
    this.options = {
      maxFiles: 20,
      theme: 'auto',
      showFileIcons: true,
      pathTruncateLength: 50,
      ...options
    }
  }

  /**
   * Render the table as static HTML (server-side)
   */
  renderStatic(): string {
    const activeTabId = this.options.defaultTab || this.data.tabs[0]?.id || ''
    const theme = this.detectTheme()

    return `
      <div id="${this.tableId}" class="top-files-table theme-${theme}">
        <div class="table-tabs" role="tablist" aria-label="File metrics categories">
          ${this.data.tabs.map(tab => `
            <button 
              role="tab"
              aria-selected="${tab.id === activeTabId}"
              aria-controls="panel-${tab.id}"
              data-tab="${tab.id}"
              tabindex="${tab.id === activeTabId ? '0' : '-1'}"
              class="tab-button ${tab.id === activeTabId ? 'active' : ''}">
              ${this.escapeHtml(tab.label)}
            </button>
          `).join('')}
        </div>
        
        ${this.data.tabs.map(tab => `
          <div 
            id="panel-${tab.id}"
            role="tabpanel"
            aria-labelledby="tab-${tab.id}"
            class="table-panel ${tab.id === activeTabId ? 'active' : ''}"
            ${tab.id !== activeTabId ? 'hidden' : ''}>
            ${this.renderTable(tab)}
          </div>
        `).join('')}
      </div>
      
      <style>
        ${this.getStyles()}
      </style>
    `
  }

  /**
   * Hydrate server-rendered content with interactivity
   */
  async hydrate(container: HTMLElement): Promise<void> {
    const tableEl = container.querySelector(`#${this.tableId}`)
    if (!tableEl) return

    // Setup tab navigation
    this.setupTabNavigation(tableEl)
    
    // Setup table sorting
    this.setupTableSorting(tableEl)
    
    // Setup keyboard navigation
    this.setupKeyboardNavigation(tableEl)

    // Add accessibility enhancements
    this.enhanceAccessibility(tableEl)
  }

  /**
   * Update table data
   */
  update(newData: TopFilesData): void {
    this.data = newData
    // Re-render would be handled by parent component
  }

  /**
   * Destroy component and clean up
   */
  destroy(): void {
    const tableEl = document.querySelector(`#${this.tableId}`)
    if (tableEl) {
      tableEl.remove()
    }
  }

  private renderTable(tab: { id: string; label: string; files: FileData[] }): string {
    const files = this.options.maxFiles 
      ? tab.files.slice(0, this.options.maxFiles)
      : tab.files

    if (files.length === 0) {
      return `
        <div class="no-data" role="status" aria-live="polite">
          <p>No files to display for ${this.escapeHtml(tab.label)}</p>
        </div>
      `
    }

    const hasSecondaryMetric = files.some(file => file.secondaryMetric !== undefined)

    return `
      <div class="table-wrapper">
        <table class="files-table" role="table" aria-label="${this.escapeHtml(tab.label)} files">
          <thead>
            <tr role="row">
              <th class="sortable" 
                  data-sort="path"
                  role="columnheader"
                  aria-sort="none"
                  tabindex="0">
                <span class="header-content">
                  File Path
                  <span class="sort-indicator" aria-hidden="true">
                    <svg class="sort-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </span>
                </span>
              </th>
              <th class="sortable" 
                  data-sort="metric"
                  role="columnheader"
                  aria-sort="none"
                  tabindex="0">
                <span class="header-content">
                  ${this.getMetricLabel(tab.id)}
                  <span class="sort-indicator" aria-hidden="true">
                    <svg class="sort-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </span>
                </span>
              </th>
              ${hasSecondaryMetric ? `
                <th class="sortable" 
                    data-sort="secondary"
                    role="columnheader"
                    aria-sort="none"
                    tabindex="0">
                  <span class="header-content">
                    ${this.getSecondaryMetricLabel(tab.id)}
                    <span class="sort-indicator" aria-hidden="true">
                      <svg class="sort-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </span>
                  </span>
                </th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${files.map((file, index) => `
              <tr role="row" ${index === 0 ? 'aria-current="row"' : ''}>
                <td class="file-path" role="gridcell" title="${this.escapeHtml(file.path)}">
                  ${this.options.showFileIcons ? `
                    <span class="file-icon" aria-hidden="true">${this.getFileIcon(file.path)}</span>
                  ` : ''}
                  <span class="file-name">${this.escapeHtml(this.truncatePath(file.path))}</span>
                </td>
                <td class="metric-value" role="gridcell">
                  ${this.formatMetric(file.metric, tab.id)}
                </td>
                ${hasSecondaryMetric ? `
                  <td class="secondary-metric" role="gridcell">
                    ${file.secondaryMetric !== undefined ? this.formatMetric(file.secondaryMetric, tab.id) : '—'}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  private setupTabNavigation(container: Element): void {
    const tabs = container.querySelectorAll('.tab-button')
    const panels = container.querySelectorAll('.table-panel')

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab')
        this.switchTab(tabId!, tabs, panels)
      })
    })
  }

  private setupTableSorting(container: Element): void {
    const sortableHeaders = container.querySelectorAll('th.sortable')

    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        this.handleSort(header as HTMLElement, container)
      })

      header.addEventListener('keydown', (e) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.handleSort(header as HTMLElement, container)
        }
      })
    })
  }

  private setupKeyboardNavigation(container: Element): void {
    const tabs = container.querySelectorAll('.tab-button')
    
    tabs.forEach((tab, index) => {
      tab.addEventListener('keydown', (e) => {
        const keyEvent = e as KeyboardEvent
        switch (keyEvent.key) {
          case 'ArrowRight':
            keyEvent.preventDefault()
            const nextTab = tabs[index + 1] || tabs[0]
            ;(nextTab as HTMLElement).focus()
            break
          case 'ArrowLeft':
            keyEvent.preventDefault()
            const prevTab = tabs[index - 1] || tabs[tabs.length - 1]
            ;(prevTab as HTMLElement).focus()
            break
          case 'Home':
            keyEvent.preventDefault()
            ;(tabs[0] as HTMLElement).focus()
            break
          case 'End':
            keyEvent.preventDefault()
            ;(tabs[tabs.length - 1] as HTMLElement).focus()
            break
        }
      })
    })
  }

  private enhanceAccessibility(container: Element): void {
    // Add live region for sort announcements
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.id = `${this.tableId}-announcements`
    container.appendChild(liveRegion)

    // Announce tab changes
    const tabs = container.querySelectorAll('.tab-button')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.textContent?.trim()
        this.announceToScreenReader(`Switched to ${tabName} tab`)
      })
    })
  }

  private switchTab(tabId: string, tabs: NodeListOf<Element>, panels: NodeListOf<Element>): void {
    // Update tab states
    tabs.forEach(tab => {
      const isActive = tab.getAttribute('data-tab') === tabId
      tab.classList.toggle('active', isActive)
      tab.setAttribute('aria-selected', isActive.toString())
      tab.setAttribute('tabindex', isActive ? '0' : '-1')
    })

    // Update panel states
    panels.forEach(panel => {
      const isActive = panel.id === `panel-${tabId}`
      panel.classList.toggle('active', isActive)
      if (isActive) {
        panel.removeAttribute('hidden')
      } else {
        panel.setAttribute('hidden', '')
      }
    })
  }

  private handleSort(header: HTMLElement, container: Element): void {
    const sortKey = header.getAttribute('data-sort')!
    const table = header.closest('table')
    const tbody = table?.querySelector('tbody')
    if (!tbody) return

    // Determine sort order
    const currentSort = header.getAttribute('aria-sort')
    let newOrder: 'asc' | 'desc' = 'desc'
    
    if (currentSort === 'none' || currentSort === 'ascending') {
      newOrder = 'desc'
    } else {
      newOrder = 'asc'
    }

    // Update header states
    container.querySelectorAll('th.sortable').forEach(h => {
      h.setAttribute('aria-sort', 'none')
      h.classList.remove('sort-asc', 'sort-desc')
    })
    
    header.setAttribute('aria-sort', newOrder === 'asc' ? 'ascending' : 'descending')
    header.classList.add(`sort-${newOrder}`)

    // Sort rows
    const rows = Array.from(tbody.querySelectorAll('tr'))
    rows.sort((a, b) => {
      const aValue = this.extractSortValue(a, sortKey)
      const bValue = this.extractSortValue(b, sortKey)
      
      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return newOrder === 'asc' ? comparison : -comparison
    })

    // Update row positions
    rows.forEach((row, index) => {
      tbody.appendChild(row)
      // Update aria-current for first row
      if (index === 0) {
        row.setAttribute('aria-current', 'row')
      } else {
        row.removeAttribute('aria-current')
      }
    })

    // Announce sort change
    const headerText = header.querySelector('.header-content')?.textContent?.trim()
    const orderText = newOrder === 'asc' ? 'ascending' : 'descending'
    this.announceToScreenReader(`Table sorted by ${headerText} in ${orderText} order`)

    this.currentSortColumn = sortKey
    this.currentSortOrder = newOrder
  }

  private extractSortValue(row: Element, key: string): string | number {
    switch (key) {
      case 'path':
        return row.querySelector('.file-name')?.textContent?.trim() || ''
      case 'metric':
        const metricText = row.querySelector('.metric-value')?.textContent?.trim() || '0'
        return this.parseNumericValue(metricText)
      case 'secondary':
        const secondaryText = row.querySelector('.secondary-metric')?.textContent?.trim() || '0'
        return this.parseNumericValue(secondaryText)
      default:
        return ''
    }
  }

  private parseNumericValue(text: string): number {
    // Remove commas, spaces, and other formatting
    const cleaned = text.replace(/[,\s]/g, '')
    const number = parseFloat(cleaned)
    return isNaN(number) ? 0 : number
  }

  private getMetricLabel(tabId: string): string {
    const labels: Record<string, string> = {
      largest: 'Lines of Code',
      churn: 'Total Changes',
      complex: 'Complexity Score',
      hotspots: 'Activity Score',
      recent: 'Recent Activity',
      contributors: 'Contributors'
    }
    return labels[tabId] || 'Metric'
  }

  private getSecondaryMetricLabel(tabId: string): string {
    const labels: Record<string, string> = {
      largest: 'Last Modified',
      churn: 'Unique Contributors',
      complex: 'Lines of Code',
      hotspots: 'Recent Changes',
      recent: 'Lines of Code',
      contributors: 'Activity Score'
    }
    return labels[tabId] || 'Secondary'
  }

  private formatMetric(value: number, tabId: string): string {
    if (tabId === 'largest' || tabId === 'complex' || tabId === 'recent') {
      return value.toLocaleString()
    }
    
    if (tabId === 'contributors') {
      return value === 1 ? '1 contributor' : `${value} contributors`
    }
    
    return value.toString()
  }

  private truncatePath(path: string): string {
    const maxLength = this.options.pathTruncateLength || 50
    if (path.length <= maxLength) return path
    
    const parts = path.split('/')
    if (parts.length <= 2) {
      return '...' + path.slice(-(maxLength - 3))
    }
    
    const fileName = parts[parts.length - 1] || ''
    const firstDir = parts[0] || ''
    
    if (fileName.length > maxLength - 10) {
      return `${firstDir}/.../...${fileName.slice(-(maxLength - firstDir.length - 10))}`
    }
    
    return `${firstDir}/.../${fileName}`
  }

  private getFileIcon(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    
    const iconMap: Record<string, string> = {
      js: '📄',
      ts: '📘',
      jsx: '⚛️',
      tsx: '⚛️',
      vue: '💚',
      py: '🐍',
      java: '☕',
      go: '🐹',
      rs: '🦀',
      rb: '💎',
      php: '🐘',
      cs: '🔷',
      cpp: '🔵',
      c: '🔵',
      h: '📋',
      hpp: '📋',
      md: '📝',
      json: '{}',
      xml: '</>',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      sass: '🎨',
      less: '🎨',
      yaml: '📋',
      yml: '📋',
      toml: '⚙️',
      ini: '⚙️',
      cfg: '⚙️',
      conf: '⚙️'
    }
    
    return iconMap[ext] || '📄'
  }

  private detectTheme(): 'light' | 'dark' {
    if (this.options.theme === 'light' || this.options.theme === 'dark') {
      return this.options.theme
    }
    
    // Auto-detect from environment
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    
    return 'light'
  }

  private announceToScreenReader(message: string): void {
    const liveRegion = document.querySelector(`#${this.tableId}-announcements`)
    if (liveRegion) {
      liveRegion.textContent = message
      // Clear after a short delay
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private getStyles(): string {
    return `
      .top-files-table {
        width: 100%;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .table-tabs {
        display: flex;
        border-bottom: 1px solid #e0e0e0;
        margin-bottom: 1rem;
        overflow-x: auto;
      }

      .theme-dark .table-tabs {
        border-bottom-color: #404040;
      }

      .tab-button {
        padding: 0.75rem 1rem;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #666;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .tab-button:hover {
        color: #333;
        background-color: #f5f5f5;
      }

      .tab-button.active {
        color: #0066cc;
        border-bottom-color: #0066cc;
      }

      .tab-button:focus {
        outline: 2px solid #0066cc;
        outline-offset: -2px;
      }

      .theme-dark .tab-button {
        color: #ccc;
      }

      .theme-dark .tab-button:hover {
        color: #fff;
        background-color: #333;
      }

      .theme-dark .tab-button.active {
        color: #66b3ff;
        border-bottom-color: #66b3ff;
      }

      .table-panel {
        display: none;
      }

      .table-panel.active {
        display: block;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .files-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      .files-table th {
        padding: 0.75rem;
        text-align: left;
        font-weight: 600;
        color: #333;
        border-bottom: 2px solid #e0e0e0;
        background-color: #f8f9fa;
        position: sticky;
        top: 0;
      }

      .theme-dark .files-table th {
        color: #e0e0e0;
        border-bottom-color: #404040;
        background-color: #2a2a2a;
      }

      .files-table th.sortable {
        cursor: pointer;
        user-select: none;
      }

      .files-table th.sortable:hover {
        background-color: #e9ecef;
      }

      .theme-dark .files-table th.sortable:hover {
        background-color: #333;
      }

      .files-table th.sortable:focus {
        outline: 2px solid #0066cc;
        outline-offset: -2px;
      }

      .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .sort-indicator {
        margin-left: 0.5rem;
        opacity: 0.3;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .sort-icon {
        width: 1rem;
        height: 1rem;
      }

      .sortable:hover .sort-indicator,
      .sortable.sort-asc .sort-indicator,
      .sortable.sort-desc .sort-indicator {
        opacity: 1;
      }

      .sortable.sort-asc .sort-indicator {
        transform: rotate(180deg);
      }

      .files-table td {
        padding: 0.75rem;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: middle;
      }

      .theme-dark .files-table td {
        border-bottom-color: #333;
      }

      .files-table tr:hover td {
        background-color: #f8f9fa;
      }

      .theme-dark .files-table tr:hover td {
        background-color: #2a2a2a;
      }

      .files-table tr[aria-current="row"] td {
        background-color: #e3f2fd;
      }

      .theme-dark .files-table tr[aria-current="row"] td {
        background-color: #1a3d5c;
      }

      .file-path {
        display: flex;
        align-items: center;
        min-width: 200px;
      }

      .file-icon {
        margin-right: 0.5rem;
        font-size: 1rem;
      }

      .file-name {
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 0.8rem;
      }

      .metric-value,
      .secondary-metric {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 500;
      }

      .no-data {
        padding: 2rem;
        text-align: center;
        color: #666;
      }

      .theme-dark .no-data {
        color: #ccc;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @media (max-width: 768px) {
        .files-table {
          font-size: 0.8rem;
        }

        .files-table th,
        .files-table td {
          padding: 0.5rem 0.25rem;
        }

        .file-path {
          min-width: 150px;
        }

        .file-name {
          font-size: 0.75rem;
        }
      }
    `
  }
}