/**
 * Simplified chart rendering module
 * All chart rendering logic in one place, no complex abstractions
 */

import type { CommitData } from '../git/parser.js'
import type { WordFrequency } from '../text/processor.js'
import type { SimplifiedConfig } from '../config/simplified-schema.js'
import type {
  ContributorStats,
  FileTypeStats,
  FileHeatData,
  TimeSeriesPoint,
  LinearSeriesPoint,
  TopFilesData
} from '../data/types.js'

import { renderAwards, type AwardsData } from './awards-renderer.js'
import { renderTimeSlider, resetTimeSlider } from './time-slider-renderer.js'

// Import shared utilities
import { showChartError } from './charts/chart-utils.js'

// New chart system imports
import { ChartManager } from './charts/index.js'
import { setupAllChartToggles } from './charts/index.js'

// Module-level storage for allData until full migration is complete
let allData: ChartData | null = null

// Store manager reference for file type filtering
let globalManager: ChartManager | null = null

export interface ChartData {
  commits: CommitData[]
  contributors: ContributorStats[]
  fileTypes: FileTypeStats[]
  timeSeries: TimeSeriesPoint[]
  linearSeries: LinearSeriesPoint[]
  wordCloudData: WordFrequency[]
  fileHeatData: FileHeatData[]
  topFilesData?: TopFilesData
  awards?: AwardsData
  githubUrl?: string
  chartsConfig?: SimplifiedConfig['charts']
}

export function renderAllCharts(data: ChartData): void {
  // Store all data for filtering access
  allData = data

  // Create chart manager for new system
  const manager = new ChartManager()
  globalManager = manager
  
  // Build file type map from commits data for filtering
  if (data.commits) {
    manager.buildFileTypeMap(data.commits)
  }

  // Render all charts in the correct order
  // Time slider must be last so it can reference other charts

  // NEW SYSTEM: Contributors chart
  try {
    manager.create('contributors', data.contributors, { 
      limit: data.chartsConfig?.topContributorsLimit ?? 10 
    })
  } catch (error) {
    console.error('Failed to render contributors chart:', error)
    showChartError('contributorsChart', 'Contributors chart failed to load')
  }

  // NEW SYSTEM: File types chart
  try {
    manager.create('fileTypes', data.fileTypes, { manager })
  } catch (error) {
    console.error('Failed to render file types chart:', error)
    showChartError('fileTypesChart', 'File types chart failed to load')
  }

  // NEW SYSTEM: Growth chart
  try {
    const savedMode = localStorage.getItem('growthChartXAxis') as 'date' | 'commit' | null
    const axisMode = savedMode || 'commit'
    const chart = manager.create('growth', { linearSeries: data.linearSeries, timeSeries: data.timeSeries, commits: data.commits }, { axisMode })
    if (chart) {
      
      // Set initial button state
      const dateBtn = document.getElementById('growthXAxisDate') as HTMLInputElement
      const commitBtn = document.getElementById('growthXAxisCommit') as HTMLInputElement
      if (axisMode === 'date' && dateBtn && commitBtn) {
        dateBtn.checked = true
        commitBtn.checked = false
      } else if (dateBtn && commitBtn) {
        dateBtn.checked = false
        commitBtn.checked = true
      }
    }
  } catch (error) {
    console.error('Failed to render growth chart:', error)
    showChartError('growthChart', 'Growth chart failed to load')
  }

  // NEW SYSTEM: Category lines chart
  try {
    const savedMode = localStorage.getItem('categoryChartXAxis') as 'date' | 'commit' | null
    const axisMode = savedMode || 'commit'
    const chart = manager.create('categoryLines', { timeSeries: data.timeSeries, commits: data.commits }, { axisMode })
    if (chart) {
      
      // Set initial button state
      const dateBtn = document.getElementById('categoryXAxisDate') as HTMLInputElement
      const commitBtn = document.getElementById('categoryXAxisCommit') as HTMLInputElement
      if (axisMode === 'date' && dateBtn && commitBtn) {
        dateBtn.checked = true
        commitBtn.checked = false
      } else if (dateBtn && commitBtn) {
        dateBtn.checked = false
        commitBtn.checked = true
      }
    }
  } catch (error) {
    console.error('Failed to render category lines chart:', error)
    showChartError('categoryLinesChart', 'Category lines chart failed to load')
  }

  // NEW SYSTEM: Commit activity chart
  try {
    manager.create('commitActivity', data.timeSeries)
  } catch (error) {
    console.error('Failed to render commit activity chart:', error)
    showChartError('commitActivityChart', 'Commit activity chart failed to load')
  }

  // NEW SYSTEM: Word cloud chart
  try {
    manager.create('wordCloud', data.wordCloudData, {
      height: data.chartsConfig?.wordCloudHeight ?? 400
    })
  } catch (error) {
    console.error('Failed to render word cloud:', error)
    showChartError('wordCloudChart', 'Word cloud failed to load')
  }

  // NEW SYSTEM: File heatmap chart
  try {
    manager.create('fileHeatmap', data.fileHeatData, {
      height: data.chartsConfig?.fileHeatmapHeight ?? 400,
      maxFiles: data.chartsConfig?.fileHeatmapMaxFiles ?? 100,
      manager
    })
  } catch (error : any) {
    console.error('Failed to render file heatmap:', error)
    console.error('Error stack:', error.stack)
    showChartError('fileHeatmapChart', 'File heatmap failed to load')
  }

  if (data.topFilesData) {
    try {
      // Use ChartManager for top files charts
      manager.create('topFilesSize', data.topFilesData)
      manager.create('topFilesChurn', data.topFilesData)
      manager.create('topFilesComplex', data.topFilesData)
    } catch (error) {
      console.error('Failed to render top files chart:', error)
      showChartError('topFilesChart', 'Top files chart failed to load')
    }
  }

  // Render time slider last so all target charts exist
  try {
    renderTimeSlider(data.timeSeries, data.linearSeries, {
      onRangeChange: (startDate, endDate, minDate, maxDate, totalCommits) => {
        // Delay the initial call to ensure charts are ready
        setTimeout(() => {
          updateTargetCharts(startDate, endDate, minDate, maxDate, totalCommits)
        }, 0)
      }
    })
  } catch (error) {
    console.error('Failed to render time slider:', error)
    showChartError('timeSliderChart', 'Time slider failed to load')
  }

  // Render user charts for top contributors
  const limit = data.chartsConfig?.topContributorsLimit ?? 10
  const topContributors = data.contributors.slice(0, limit)
  renderUserCharts(topContributors, data.commits, data.linearSeries, data.timeSeries)

  // Render awards if available
  if (data.awards) {
    renderAwards(data.awards, data.githubUrl)
  }

  // Set up chart toggles using the new system
  setupAllChartToggles(manager)
  
  // Clear Filters button
  const clearFiltersBtn = document.getElementById('clearFilters')
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Reset time slider to full range
      resetTimeSlider()
    })
  }
}

function updateTargetCharts(min: number, max: number, minDate: number, maxDate: number, totalCommits: number): void {
  // Calculate filtered commit count
  let filteredCommitCount = totalCommits
  
  if (allData && allData.commits) {
    // Count commits within the selected date range
    filteredCommitCount = allData.commits.filter((commit: any) => {
      const commitTime = new Date(commit.date).getTime()
      return commitTime >= min && commitTime <= max
    }).length
  }
  
  // Update filter status display
  const filterStatus = document.getElementById('filterStatus')
  if (filterStatus) {
    filterStatus.textContent = `Showing ${filteredCommitCount}/${totalCommits} commits`
  }

  // Only attempt to zoom charts if ApexCharts is loaded and manager is available
  if ((window as any).ApexCharts && globalManager) {
    // Zoom the commit activity chart (always date-based)
    const commitChart = globalManager.getChart('commitActivity')
    if (commitChart && typeof commitChart.zoomX === 'function') {
      try {
        commitChart.zoomX(min, max)
      } catch (e) {
        console.warn('Failed to zoom commit activity chart:', e)
      }
    }

    // Zoom the category lines chart (check if it's in date or commit mode)
    const categoryChartData = globalManager.get('categoryLines')
    if (categoryChartData && categoryChartData.instance) {
      const chart = categoryChartData.instance
      if (typeof chart.zoomX === 'function') {
        try {
          const xAxisType = categoryChartData.options?.axisMode === 'date' ? 'datetime' : 'category'
          
          if (xAxisType === 'datetime') {
            // Date mode - use same date range
            chart.zoomX(min, max)
          } else {
            // Commit mode - need to convert date range to commit indices
            const dateRange = maxDate - minDate
            const startPercent = (min - minDate) / dateRange
            const endPercent = (max - minDate) / dateRange

            const startIndex = Math.max(0, Math.round(startPercent * (totalCommits - 1)))
            const endIndex = Math.min(totalCommits - 1, Math.round(endPercent * (totalCommits - 1)))

            chart.zoomX(startIndex, endIndex)
          }
        } catch (e) {
          console.warn('Failed to zoom category lines chart:', e)
        }
      }
    }

    // Zoom the growth chart
    const growthChartData = globalManager.get('growth')
    if (growthChartData && growthChartData.instance) {
      const chart = growthChartData.instance
      if (typeof chart.zoomX === 'function') {
        try {
          // Check if growth chart is in date or commit mode
          const xAxisType = growthChartData.options?.axisMode === 'date' ? 'datetime' : 'category'

          if (xAxisType === 'datetime') {
            // Date mode - use same date range
            chart.zoomX(min, max)
          } else {
            // Commit mode - need to convert date range to commit indices
            const dateRange = maxDate - minDate
            const startPercent = (min - minDate) / dateRange
            const endPercent = (max - minDate) / dateRange

            const startIndex = Math.max(1, Math.round(startPercent * (totalCommits - 1)) + 1)
            const endIndex = Math.min(totalCommits, Math.round(endPercent * (totalCommits - 1)) + 1)

            chart.zoomX(startIndex, endIndex)
          }
        } catch (e) {
          console.warn('Failed to zoom growth chart:', e)
        }
      }
    }

    // Zoom user charts (they have axis toggles like growth/category charts)
    if (globalManager) {
      globalManager.getAllChartIds().forEach(chartId => {
        if (chartId.startsWith('userChart') && !chartId.includes('Activity')) {
          // Only zoom line charts, not activity bar charts
          const managedChart = globalManager?.get(chartId)
          if (managedChart && managedChart.instance && typeof managedChart.instance.zoomX === 'function') {
            try {
              // Check if user chart is in date or commit mode
              const xAxisType = managedChart.options?.xAxisMode === 'date' ? 'datetime' : 'category'
              
              if (xAxisType === 'datetime') {
                // Date mode - use same date range
                managedChart.instance.zoomX(min, max)
              } else {
                // Commit mode - need to convert date range to commit indices
                const dateRange = maxDate - minDate
                const startPercent = (min - minDate) / dateRange
                const endPercent = (max - minDate) / dateRange
                
                const startIndex = Math.max(0, Math.round(startPercent * (totalCommits - 1)))
                const endIndex = Math.min(totalCommits - 1, Math.round(endPercent * (totalCommits - 1)))
                
                managedChart.instance.zoomX(startIndex, endIndex)
              }
            } catch (e) {
              console.warn(`Failed to zoom ${chartId}:`, e)
            }
          }
        }
        // Skip userActivityChart zooming as it uses daily aggregation
        // and zooming can cause display issues with bar charts
      })
    }
  }
}

function renderUserCharts(topContributors: ContributorStats[], commits: CommitData[], _linearSeries: LinearSeriesPoint[], timeSeries: TimeSeriesPoint[]): void {
  const container = document.getElementById('userChartsContainer')
  if (!container) {
    return
  }


  topContributors.forEach((contributor, index) => {
    const userCommits = commits.filter(c => c.authorName === contributor.name)

    const chartId = `userChart${index}`
    const activityChartId = `userActivityChart${index}`

    const chartCard = document.createElement('div')
    chartCard.className = 'chart-full'
    chartCard.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">${contributor.name}</h5>
          <p class="card-text small text-muted mb-0">${contributor.commits} commits • ${contributor.linesAdded + contributor.linesDeleted} lines changed</p>
        </div>
        <div class="card-body">
          <div class="btn-group btn-group-sm mb-3" role="group" data-toggle-id="userXAxis${index}">
            <input type="radio" class="btn-check" name="userXAxis${index}" id="userXAxis${index}Date" value="date" autocomplete="off">
            <label class="btn btn-outline-primary" for="userXAxis${index}Date">By Date</label>
            <input type="radio" class="btn-check" name="userXAxis${index}" id="userXAxis${index}Commit" value="commit" autocomplete="off" checked>
            <label class="btn btn-outline-primary" for="userXAxis${index}Commit">By Commit</label>
          </div>
          <div id="${chartId}" style="min-height: 250px;"></div>
          <div id="${activityChartId}" style="min-height: 200px; margin-top: 20px;"></div>
        </div>
      </div>
    `

    container.appendChild(chartCard)

    // Render charts immediately using ChartManager
    const xAxisMode = localStorage.getItem(`userChartXAxis${index}`) || 'commit'
    globalManager?.create('userChart', { userCommits, xAxisMode, timeSeries }, { 
      elementId: chartId, 
      chartId: chartId,
      xAxisMode: xAxisMode 
    })
    
    globalManager?.create('userActivityChart', userCommits, { 
      elementId: activityChartId,
      chartId: activityChartId
    })
    
    // Toggle handling is now done by setupUserChartToggles in chart-toggles.ts
  })
}

// Keep updateChartsWithFileTypeFilter for HTML event handlers
function updateChartsWithFileTypeFilter(): void {
  if (!globalManager) return
  
  // The ChartManager handles all filtering internally
  const fileTypeSelect = document.getElementById('fileTypeFilter') as HTMLSelectElement
  const selectedFileType = fileTypeSelect?.value || null
  globalManager.setFileTypeFilter(selectedFileType)
}

// Export it globally for HTML event handlers
;(window as any).updateChartsWithFileTypeFilter = updateChartsWithFileTypeFilter

// Export update functions for backward compatibility with HTML
export function updateGrowthChartAxis(mode: 'date' | 'commit'): void {
  // Now handled by ChartManager
  if (globalManager) {
    const chartData = globalManager.get('growth')
    if (chartData) {
      globalManager.recreate('growth', { axisMode: mode })
    }
  }
}

export function updateCategoryChartAxis(mode: 'date' | 'commit'): void {
  // Now handled by ChartManager
  if (globalManager) {
    const chartData = globalManager.get('categoryLines')
    if (chartData) {
      globalManager.recreate('categoryLines', { axisMode: mode })
    }
  }
}