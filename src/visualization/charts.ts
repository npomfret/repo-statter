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
// Remove getFileCategory import to avoid Node.js dependencies in browser bundle

// Simple inline file categorization for browser

// Import shared utilities
import { showChartError } from './charts/chart-utils.js'

// Import extracted chart functions
// Category lines chart now in new system

// New chart system imports
import { ChartManager } from './charts/index.js'
import { setupAllChartToggles } from './charts/index.js'

// Temporary local state until full migration is complete
const chartRefs: Record<string, any> = {}
const chartData: Record<string, any> = {}
let selectedFileType: string | null = null

function getSelectedFileType(): string | null {
  return selectedFileType
}

// Helper function for creating chart toggle HTML
function createChartToggleHTML(toggleId: string): string {
  return `
    <div class="btn-group btn-group-sm mb-3" role="group">
      <input type="radio" class="btn-check" name="${toggleId}" id="${toggleId}Date" value="date" autocomplete="off">
      <label class="btn btn-outline-primary" for="${toggleId}Date">By Date</label>
      <input type="radio" class="btn-check" name="${toggleId}" id="${toggleId}Commit" value="commit" autocomplete="off" checked>
      <label class="btn btn-outline-primary" for="${toggleId}Commit">By Commit</label>
    </div>
  `
}

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
  // Store all data globally for filtering access
  chartData['allData'] = data

  // Make updateChartsWithFileTypeFilter globally available for chart modules
  ;(globalThis as any).updateChartsWithFileTypeFilter = updateChartsWithFileTypeFilter

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
    const chart = manager.create('contributors', data.contributors, { 
      limit: data.chartsConfig?.topContributorsLimit ?? 10 
    })
    if (chart) {
      // Maintain backward compatibility
      chartRefs['contributorsChart'] = chart
    }
  } catch (error) {
    console.error('Failed to render contributors chart:', error)
    showChartError('contributorsChart', 'Contributors chart failed to load')
  }

  // NEW SYSTEM: File types chart
  try {
    const chart = manager.create('fileTypes', data.fileTypes, { manager })
    if (chart) {
      chartRefs['fileTypesChart'] = chart
      chartData['fileTypesChart'] = { fileTypes: data.fileTypes.slice(0, 10) }
    }
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
      chartRefs['growthChart'] = chart
      
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
      chartRefs['category-lines-chart'] = chart
      
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
    const chart = manager.create('commitActivity', data.timeSeries)
    if (chart) {
      chartRefs['commit-activity-chart'] = chart
    }
  } catch (error) {
    console.error('Failed to render commit activity chart:', error)
    showChartError('commitActivityChart', 'Commit activity chart failed to load')
  }

  // NEW SYSTEM: Word cloud chart
  try {
    const chart = manager.create('wordCloud', data.wordCloudData, {
      height: data.chartsConfig?.wordCloudHeight ?? 400
    })
    if (chart) {
      chartRefs['wordCloudChart'] = chart
    }
  } catch (error) {
    console.error('Failed to render word cloud:', error)
    showChartError('wordCloudChart', 'Word cloud failed to load')
  }

  // NEW SYSTEM: File heatmap chart
  try {
    const chart = manager.create('fileHeatmap', data.fileHeatData, {
      height: data.chartsConfig?.fileHeatmapHeight ?? 400,
      maxFiles: data.chartsConfig?.fileHeatmapMaxFiles ?? 100,
      manager
    })
    if (chart) {
      chartRefs['fileHeatmapChart'] = chart
      chartData['fileHeatmapChart'] = { 
        fileHeatData: data.fileHeatData, 
        height: data.chartsConfig?.fileHeatmapHeight ?? 400,
        maxFiles: data.chartsConfig?.fileHeatmapMaxFiles ?? 100
      }
    }
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

  // Set up event handlers for interactive elements
  setupEventHandlers()
  
  // Set up chart toggles using the new system
  setupAllChartToggles(manager)
}

function setupEventHandlers(): void {
  // Chart toggles are now handled by setupAllChartToggles

  // Clear Filters button
  const clearFiltersBtn = document.getElementById('clearFilters')
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Reset time slider to full range
      resetTimeSlider()
    })
  }

  // No need for tab switching event listeners anymore since all charts are rendered
}


// renderContributorsChart moved to ./charts/contributors-chart.js

// renderFileTypesChart moved to ./charts/file-types-chart.js



// Migrated to ChartManager
// function renderTopFilesChart(topFilesData: TopFilesData): void {
//   // Store data for filtering
//   chartData['topFilesChart'] = { data: topFilesData, currentView: 'size' }
//
//   // Render all three charts
//   renderTopFilesChartWithFilter(topFilesData, 'size', 'topFilesChartSize')
//   renderTopFilesChartWithFilter(topFilesData, 'changes', 'topFilesChartChurn')
//   renderTopFilesChartWithFilter(topFilesData, 'complexity', 'topFilesChartComplex')
// }

// Helper function to extract filename from path (global scope for data labels)
// Migrated to chart-definitions.ts
// function getFileNameFromPath(filePath: string): string {
//   return filePath.split('/').pop() || filePath
// }
//
// function buildTopFilesChartOptions(view: string, data: TopFilesData): any {
//   let series: any
//   let yaxisTitle: string
//   let tooltipFormatter: any
//   let fullPaths: string[] = []
//
//   if (view === 'size') {
//     fullPaths = data.largest.map(f => f.fileName)
//     series = [{
//       name: 'Lines of Code',
//       data: data.largest.map(f => ({
//         x: getFileNameFromPath(f.fileName), // Show only filename on axis
//         y: f.value
//       }))
//     }]
//     yaxisTitle = 'Lines of Code'
//     tooltipFormatter = function(val: number, opts: any) {
//       const dataIndex = opts.dataPointIndex
//       const fullPath = fullPaths[dataIndex] || ''
//       return `<div><strong>${fullPath}</strong></div><div>${val.toLocaleString()} lines</div>`
//     }
//   } else if (view === 'changes') {
//     fullPaths = data.mostChurn.map(f => f.fileName)
//     series = [{
//       name: 'Number of Changes',
//       data: data.mostChurn.map(f => ({
//         x: getFileNameFromPath(f.fileName), // Show only filename on axis
//         y: f.value
//       }))
//     }]
//     yaxisTitle = 'Number of Changes'
//     tooltipFormatter = function(val: number, opts: any) {
//       const dataIndex = opts.dataPointIndex
//       const fullPath = fullPaths[dataIndex] || ''
//       return `<div><strong>${fullPath}</strong></div><div>${val.toLocaleString()} commits</div>`
//     }
//   } else {
//     fullPaths = data.mostComplex.map(f => f.fileName)
//     series = [{
//       name: 'Cyclomatic Complexity',
//       data: data.mostComplex.map(f => ({
//         x: getFileNameFromPath(f.fileName), // Show only filename on axis
//         y: f.value
//       }))
//     }]
//     yaxisTitle = 'Cyclomatic Complexity'
//     tooltipFormatter = function(val: number, opts: any) {
//       const dataIndex = opts.dataPointIndex
//       const fullPath = fullPaths[dataIndex] || ''
//       return `<div><strong>${fullPath}</strong></div><div>Complexity: ${val}</div>`
//     }
//   }
//
//   return {
//     chart: {
//       type: 'bar',
//       height: 350,
//       toolbar: { show: false },
//       background: '#ffffff',
//       margin: {
//         left: 80
//       }
//     },
//     series: series,
//     plotOptions: {
//       bar: {
//         horizontal: true
//       }
//     },
//     dataLabels: {
//       enabled: true,
//       textAnchor: 'start',
//       offsetX: -80,
//       style: {
//         fontSize: '12px',
//         colors: ['#000000']
//       },
//       formatter: function(_val: number, opts: any) {
//         // Show filename on the bar
//         const dataIndex = opts.dataPointIndex
//         const seriesData = opts.w.config.series[0].data[dataIndex]
//         return getFileNameFromPath(seriesData.x)
//       }
//     },
//     colors: ['#87CEEB'],
//     xaxis: {
//       title: {
//         text: yaxisTitle,
//         style: { color: '#24292f' }
//       },
//       labels: {
//         style: { colors: '#24292f' },
//         formatter: function(val: number) {
//           return val.toLocaleString()
//         }
//       }
//     },
//     yaxis: {
//       labels: {
//         show: false
//       }
//     },
//     grid: {
//       borderColor: '#e1e4e8'
//     },
//     tooltip: {
//       theme: 'light',
//       custom: function(opts: any) {
//         const dataIndex = opts.dataPointIndex
//         const value = opts.series[0][dataIndex]
//         return '<div class="custom-tooltip">' + tooltipFormatter(value, opts) + '</div>'
//       }
//     }
//   }
// }

// No longer needed since we render all three charts at once
/*
function updateTopFilesChart(view: string): void {
  // Get stored chart data
  const storedData = chartData['topFilesChart']
  if (!storedData || !storedData.data) {
    return
  }

  // Update current view and save to localStorage
  chartData['topFilesChart'].currentView = view
  localStorage.setItem('topFilesView', view)

  // Update button states
  const sizeBtn = document.getElementById('largest-tab')
  const changesBtn = document.getElementById('churn-tab')
  const complexityBtn = document.getElementById('complex-tab')

  if (sizeBtn && changesBtn && complexityBtn) {
    sizeBtn.classList.remove('active')
    changesBtn.classList.remove('active')
    complexityBtn.classList.remove('active')

    if (view === 'size') sizeBtn.classList.add('active')
    else if (view === 'changes') changesBtn.classList.add('active')
    else if (view === 'complexity') complexityBtn.classList.add('active')
  }

  // Re-render chart with new view
  renderTopFilesChartWithFilter(storedData.data, view)
}
*/




function updateTargetCharts(min: number, max: number, minDate: number, maxDate: number, totalCommits: number): void {
  // Calculate filtered commit count
  const allData = chartData['allData']
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

    // Zoom user charts (they are always date-based)
    // These still use chartRefs for now as they're dynamically created
    if (chartRefs) {
      Object.keys(chartRefs).forEach(key => {
        if (key.startsWith('userChart') && !key.includes('Activity')) {
          // Only zoom line charts, not activity bar charts
          const userChart = chartRefs[key]
          if (userChart && typeof userChart.zoomX === 'function') {
            try {
              userChart.zoomX(min, max)
            } catch (e) {
              console.warn(`Failed to zoom ${key}:`, e)
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
          ${createChartToggleHTML(`userXAxis${index}`)}
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

// Migrated to ChartManager
// async function renderUserChart(chartId: string, userCommits: CommitData[], timeSeries: TimeSeriesPoint[], userIndex: number): Promise<void> {
//
//   const container = document.getElementById(chartId)
//   if (!container) {
//     return
//   }
//   if (chartRefs[chartId]) {
//     return
//   }
//
//   // Import the utility function
//   const { buildUserTimeSeriesData } = await import('../utils/chart-data-builders.js')
//
//   // Store data for rebuilding
//   chartData[chartId] = { userCommits, timeSeries }
//   
//   // Get saved axis mode or default to 'commit'
//   const xAxisMode = localStorage.getItem(`userChartXAxis${userIndex}`) || 'commit'
//   
//   // Build data using the utility
//   const userChartData = buildUserTimeSeriesData(userCommits, xAxisMode, 'lines', timeSeries)
//
//   const options = {
//     chart: {
//       id: chartId,
//       type: 'area',
//       height: 250,
//       toolbar: { show: false },
//       background: '#ffffff',
//       zoom: {
//         enabled: true,
//         allowMouseWheelZoom: false
//       }
//     },
//     series: [
//       {
//         name: 'Lines Added',
//         data: userChartData.addedData
//       },
//       {
//         name: 'Lines Removed',
//         data: userChartData.removedData
//       },
//       {
//         name: 'Net Lines',
//         data: userChartData.netData
//       }
//     ],
//     xaxis: xAxisMode === 'date' ? {
//       type: 'datetime',
//       labels: {
//         datetimeUTC: false,
//         style: { colors: '#24292f' }
//       }
//     } : {
//       type: 'numeric',
//       title: {
//         text: 'Commit Index',
//         style: { color: '#24292f' }
//       },
//       labels: {
//         style: { colors: '#24292f' },
//         formatter: function(val: number) {
//           return Math.round(val).toString()
//         }
//       }
//     },
//     yaxis: {
//       title: {
//         text: 'Lines of Code (Cumulative)',
//         style: { color: '#24292f' }
//       },
//       labels: {
//         style: { colors: '#24292f' },
//         formatter: function(val: number) {
//           return Math.abs(val).toLocaleString()
//         }
//       }
//     },
//     colors: ['#98D8C8', '#FFB6C1', '#87CEEB'],
//     stroke: { curve: 'straight', width: 2 },
//     fill: {
//       type: 'gradient',
//       gradient: {
//         opacityFrom: 0.6,
//         opacityTo: 0.1
//       }
//     },
//     legend: {
//       position: 'top',
//       horizontalAlign: 'left',
//       labels: { colors: '#24292f' }
//     },
//     grid: { borderColor: '#e1e4e8' },
//     dataLabels: { enabled: false },
//     tooltip: {
//       theme: 'light',
//       shared: true,
//       intersect: false,
//       x: xAxisMode === 'date' ? { format: 'dd MMM yyyy' } : {
//         formatter: function(val: number) {
//           return `Commit #${Math.round(val) + 1}`
//         }
//       },
//       y: {
//         formatter: function(val: number) {
//           return Math.abs(val).toLocaleString() + ' lines'
//         }
//       }
//     }
//   }
//
//
//   try {
//     const chart = new (window as any).ApexCharts(container, options)
//     await chart.render()
//     chartRefs[chartId] = chart
//     
//     // Set initial button state
//     const dateBtn = document.getElementById(`userXAxis${userIndex}Date`) as HTMLInputElement
//     const commitBtn = document.getElementById(`userXAxis${userIndex}Commit`) as HTMLInputElement
//     if (xAxisMode === 'date' && dateBtn && commitBtn) {
//       dateBtn.checked = true
//       commitBtn.checked = false
//     } else if (dateBtn && commitBtn) {
//       dateBtn.checked = false
//       commitBtn.checked = true
//     }
//   } catch (error) {
//     console.error(`Failed to render chart ${chartId}:`, error)
//   }
// }

// Migrated to ChartManager
// function updateUserChartAxis(chartId: string, mode: 'date' | 'commit', userIndex: number): void {
//   const data = chartData[chartId]
//   if (!data) return
//
//   const config: ChartToggleConfig = {
//     chartId: chartId,
//     storageKey: `userChartXAxis${userIndex}`,
//     elementPrefix: `userXAxis${userIndex}`,
//     renderFunction: renderUserChart,
//     renderArgs: [chartId, data.userCommits, data.timeSeries, userIndex]
//   }
//
//   updateChartAxis(config, mode, chartRefs, chartData)
// }


// Migrated to ChartManager  
// async function renderUserActivityChart(chartId: string, commits: CommitData[]): Promise<void> {
//   const container = document.getElementById(chartId)
//   if (!container) {
//     return
//   }
//   if (chartRefs[chartId]) {
//     return
//   }
//
//   // Group commits by date and count
//   const commitsByDate = new Map<string, number>()
//   commits.forEach(commit => {
//     const dateKey = new Date(commit.date).toISOString().split('T')[0]!
//     commitsByDate.set(dateKey, (commitsByDate.get(dateKey) || 0) + 1)
//   })
//
//   // Convert to chart data
//   const data = Array.from(commitsByDate.entries())
//     .sort((a, b) => a[0].localeCompare(b[0]))
//     .map(([date, count]) => ({
//       x: new Date(date).getTime(),
//       y: count
//     }))
//
//   const options = {
//     chart: {
//       type: 'bar',
//       height: 200,
//       toolbar: { show: false },
//       background: '#ffffff',
//       zoom: {
//         enabled: true,
//         allowMouseWheelZoom: false
//       }
//     },
//     series: [{
//       name: 'Daily Commits',
//       data: data
//     }],
//     plotOptions: {
//       bar: {
//         columnWidth: '80%',
//         borderRadius: 2
//       }
//     },
//     dataLabels: {
//       enabled: false
//     },
//     xaxis: {
//       type: 'datetime',
//       labels: {
//         datetimeUTC: false,
//         style: { colors: '#24292f' },
//         formatter: function(val: number) {
//           return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
//         }
//       },
//       title: {
//         text: 'Date',
//         style: { color: '#24292f' }
//       }
//     },
//     yaxis: {
//       title: {
//         text: 'Commits',
//         style: { color: '#24292f' }
//       },
//       labels: {
//         style: { colors: '#24292f' }
//       }
//     },
//     colors: ['#87CEEB'],
//     grid: { borderColor: '#e1e4e8' },
//     tooltip: {
//       theme: 'light',
//       x: { format: 'dd MMM yyyy' },
//       y: {
//         formatter: function(val: number) {
//           return val + ' commit' + (val !== 1 ? 's' : '')
//         }
//       }
//     }
//   }
//
//   try {
//     const chart = new (window as any).ApexCharts(container, options)
//     await chart.render()
//     chartRefs[chartId] = chart
//   } catch (error) {
//     console.error(`Failed to render chart ${chartId}:`, error)
//   }
// }


// Export functions for event handlers
// File type filtering functions now in chart-state.ts


function updateChartsWithFileTypeFilter(): void {
  if (!globalManager) return
  
  // Update manager's file type filter
  const currentFileType = getSelectedFileType()
  globalManager.setFileTypeFilter(currentFileType)
  
  const allData = chartData['allData']
  if (!allData) return
  
  // Filter data if needed
  let filteredData = allData
  if (currentFileType) {
    // For now, show a message that filtering is not fully supported
    // Full implementation would require recalculating time series and linear series data
    console.log('File type filtering for time-based charts requires data recalculation')
    
    // Show informative message on affected charts
    const message = `Filtering by "${currentFileType}" requires recalculating cumulative data`
    
    const growthContainer = document.getElementById('growthChart')
    if (growthContainer) {
      growthContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: 350px;">
          <div class="text-center">
            <i class="bi bi-info-circle fs-1 mb-3"></i>
            <p class="mb-0">${message}</p>
            <p class="small mt-2">Clear the filter to see all data</p>
          </div>
        </div>
      `
    }
    
    const categoryContainer = document.getElementById('categoryLinesChart')
    if (categoryContainer) {
      categoryContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: 350px;">
          <div class="text-center">
            <i class="bi bi-info-circle fs-1 mb-3"></i>
            <p class="mb-0">${message}</p>
            <p class="small mt-2">Clear the filter to see all data</p>
          </div>
        </div>
      `
    }
    
    const commitActivityContainer = document.getElementById('commitActivityChart')
    if (commitActivityContainer) {
      commitActivityContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: 350px;">
          <div class="text-center">
            <i class="bi bi-info-circle fs-1 mb-3"></i>
            <p class="mb-0">${message}</p>
            <p class="small mt-2">Clear the filter to see all data</p>
          </div>
        </div>
      `
    }
    
    // Skip updating these charts when filter is active
    return
  }
  
  // Update charts with filtered or original data
  // Growth chart
  if (globalManager.get('growth')) {
    globalManager.destroy('growth')
    const savedMode = localStorage.getItem('growthChartXAxis') as 'date' | 'commit' | null
    const axisMode = savedMode || 'commit'
    const chart = globalManager.create('growth', { 
      linearSeries: filteredData.linearSeries, 
      timeSeries: filteredData.timeSeries, 
      commits: filteredData.commits 
    }, { axisMode })
    if (chart) {
      chartRefs['growthChart'] = chart
    }
  }
  
  // Category lines chart
  if (globalManager.get('categoryLines')) {
    globalManager.destroy('categoryLines')
    const savedMode = localStorage.getItem('categoryChartXAxis') as 'date' | 'commit' | null
    const axisMode = savedMode || 'commit'
    const chart = globalManager.create('categoryLines', { 
      timeSeries: filteredData.timeSeries, 
      commits: filteredData.commits 
    }, { axisMode })
    if (chart) {
      chartRefs['category-lines-chart'] = chart
    }
  }
  
  // Commit activity chart
  if (globalManager.get('commitActivity')) {
    globalManager.destroy('commitActivity')
    const chart = globalManager.create('commitActivity', filteredData.timeSeries)
    if (chart) {
      chartRefs['commit-activity-chart'] = chart
    }
  }
  
  // Update file heatmap chart using new system
  const heatmapData = chartData['fileHeatmapChart']
  if (heatmapData) {
    // First destroy any existing chart (including clearing message)
    const existingChart = chartRefs['fileHeatmapChart']
    if (existingChart) {
      existingChart.destroy()
      delete chartRefs['fileHeatmapChart']
    }
    // Clear container in case it has a message
    const container = document.getElementById('fileHeatmapChart')
    if (container) {
      container.innerHTML = ''
    }
    
    // Now create the chart fresh
    const chart = globalManager.create('fileHeatmap', heatmapData.fileHeatData, {
      height: heatmapData.height,
      maxFiles: heatmapData.maxFiles,
      manager: globalManager
    })
    if (chart) {
      chartRefs['fileHeatmapChart'] = chart
    }
  }

  // Update all three top files charts if they exist and have data
  const topFilesData = chartData['topFilesChart']
  if (topFilesData) {
    // Migrated to ChartManager
    // renderTopFilesChartWithFilter(topFilesData.data, 'size', 'topFilesChartSize')
    // renderTopFilesChartWithFilter(topFilesData.data, 'changes', 'topFilesChartChurn')
    // renderTopFilesChartWithFilter(topFilesData.data, 'complexity', 'topFilesChartComplex')
    globalManager?.create('topFilesSize', topFilesData.data)
    globalManager?.create('topFilesChurn', topFilesData.data)
    globalManager?.create('topFilesComplex', topFilesData.data)
  }
}

// Helper function to calculate top files for a specific file type
// Migrated to chart-manager for file type filtering
// function calculateTopFilesByType(commits: CommitData[], filterFileType: string, fileTypeMap: Map<string, string>, calculationType: 'size' | 'churn' | 'complex'): TopFileStats[] {
//   if (calculationType === 'size') {
//     const fileSizeMap = new Map<string, number>()
//     
//     for (const commit of commits) {
//       for (const fileChange of commit.filesChanged) {
//         // Only include files of the selected type
//         if (fileTypeMap.get(fileChange.fileName) !== filterFileType) {
//           continue
//         }
//         
//         const currentSize = fileSizeMap.get(fileChange.fileName) ?? 0
//         const sizeChange = fileChange.linesAdded - fileChange.linesDeleted
//         fileSizeMap.set(fileChange.fileName, currentSize + sizeChange)
//       }
//     }
//     
//     // Filter out files with negative or zero size and get top 5
//     const files = Array.from(fileSizeMap.entries())
//       .filter(([_, size]) => size > 0)
//       .sort(([_, a], [__, b]) => b - a)
//       .slice(0, 5)
//     
//     const totalSize = files.reduce((sum, [_, size]) => sum + size, 0)
//     return files.map(([fileName, size]) => ({ 
//       fileName, 
//       value: size, 
//       percentage: totalSize > 0 ? (size / totalSize) * 100 : 0 
//     }))
//   } 
//   
//   if (calculationType === 'churn') {
//     const fileChurnMap = new Map<string, number>()
//     
//     for (const commit of commits) {
//       for (const fileChange of commit.filesChanged) {
//         // Only include files of the selected type
//         if (fileTypeMap.get(fileChange.fileName) !== filterFileType) {
//           continue
//         }
//         
//         const currentChurn = fileChurnMap.get(fileChange.fileName) ?? 0
//         fileChurnMap.set(fileChange.fileName, currentChurn + 1)
//       }
//     }
//     
//     // Get top 5 by churn count
//     const files = Array.from(fileChurnMap.entries())
//       .sort(([_, a], [__, b]) => b - a)
//       .slice(0, 5)
//     
//     const totalChurn = files.reduce((sum, [_, churn]) => sum + churn, 0)
//     return files.map(([fileName, churn]) => ({ 
//       fileName, 
//       value: churn, 
//       percentage: totalChurn > 0 ? (churn / totalChurn) * 100 : 0 
//     }))
//   }
  
//   // For complexity, we can't recalculate without running lizard, so return empty
//   // This would need to be implemented with access to the complexity calculation
//   return []
// }

// Migrated to ChartManager with file type filtering
// function renderTopFilesChartWithFilter(topFilesData: TopFilesData, currentView: string, containerId: string = 'topFilesChart'): void {
//   const container = document.getElementById(containerId)
//   if (!container) return
//
//   // Get file type mapping from original chart data if available
//   const originalChartData = chartData['allData']
//   let fileTypeMap = new Map<string, string>()
//
//   if (originalChartData && originalChartData.commits) {
//     // Build a mapping of fileName -> fileType from commits
//     for (const commit of originalChartData.commits) {
//       for (const fileChange of commit.filesChanged) {
//         fileTypeMap.set(fileChange.fileName, fileChange.fileType)
//       }
//     }
//   }
//
//   // Filter data by selected file type if active
//   let filteredData = topFilesData
//   const currentFileType = getSelectedFileType()
//   if (currentFileType && fileTypeMap.size > 0 && originalChartData && originalChartData.commits) {
//     // Recalculate top files for the selected file type
//     filteredData = {
//       largest: calculateTopFilesByType(originalChartData.commits, currentFileType, fileTypeMap, 'size'),
//       mostChurn: calculateTopFilesByType(originalChartData.commits, currentFileType, fileTypeMap, 'churn'),
//       mostComplex: calculateTopFilesByType(originalChartData.commits, currentFileType, fileTypeMap, 'complex')
//     }
//   }
//
//   // Check if current view has no data after filtering
//   const currentData = currentView === 'size' ? filteredData.largest :
//       currentView === 'changes' ? filteredData.mostChurn :
//           filteredData.mostComplex
//
//   if (currentFileType && currentData.length === 0) {
//     container.innerHTML = `
//       <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: 350px;">
//         <div class="text-center">
//           <i class="bi bi-funnel fs-1 mb-3"></i>
//           <p class="mb-0">No files with type "${currentFileType}" found in ${currentView} view</p>
//         </div>
//       </div>
//     `
//     return
//   }
//
//   const options = buildTopFilesChartOptions(currentView, filteredData)
//
//   // Update existing chart or create new one
//   const chartRefKey = `topFilesChart_${containerId}`
//   if (chartRefs[chartRefKey]) {
//     // Update existing chart with new options
//     chartRefs[chartRefKey].updateOptions(options, true, true, true)
//   } else {
//     // Create new chart only if it doesn't exist
//     const chart = new (window as any).ApexCharts(container, options)
//     chart.render()
//     chartRefs[chartRefKey] = chart
//   }
// }
// Export update functions for backward compatibility
export function updateGrowthChartAxis(mode: 'date' | 'commit'): void {
  // Now handled by ChartManager
  globalManager?.destroy('growth')
  globalManager?.recreate('growth', { axisMode: mode })
}

export function updateCategoryChartAxis(mode: 'date' | 'commit'): void {
  // Now handled by ChartManager
  globalManager?.destroy('categoryLines')
  globalManager?.recreate('categoryLines', { axisMode: mode })
}
