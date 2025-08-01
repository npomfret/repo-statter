/**
 * Simplified chart rendering module
 * All chart rendering logic in one place, no complex abstractions
 */

import type { CommitData } from '../git/parser.js'
import type { WordFrequency } from '../text/processor.js'
import type { SimplifiedConfig } from '../config/simplified-schema.js'
import type {
  ContributorStats,
  ContributorAward,
  CommitAward,
  FileTypeStats,
  FileHeatData,
  TimeSeriesPoint,
  LinearSeriesPoint,
  TopFilesData,
  TopFileStats
} from '../data/types.js'
// Remove getFileCategory import to avoid Node.js dependencies in browser bundle

// Simple inline file categorization for browser

// Import shared utilities and state
import { showChartError } from './charts/chart-utils.js'
import { chartRefs, chartData, getSelectedFileType } from './charts/chart-state.js'

// Import extracted chart functions
import { renderContributorsChart } from './charts/contributors-chart.js'
import { renderFileTypesChart } from './charts/file-types-chart.js'
import { renderWordCloudChart } from './charts/word-cloud-chart.js'
import { renderFileHeatmapChart } from './charts/file-heatmap-chart.js'
import { renderCommitActivityChart } from './charts/commit-activity-chart.js'
import { renderGrowthChart, updateGrowthChartAxis } from './charts/growth-chart.js'
import { renderCategoryLinesChart, updateCategoryChartAxis } from './charts/category-lines-chart.js'

// Access selectedFileType through getter/setter functions for consistency

export interface ChartData {
  commits: CommitData[]
  contributors: ContributorStats[]
  fileTypes: FileTypeStats[]
  timeSeries: TimeSeriesPoint[]
  linearSeries: LinearSeriesPoint[]
  wordCloudData: WordFrequency[]
  fileHeatData: FileHeatData[]
  topFilesData?: TopFilesData
  awards?: {
    filesModified: CommitAward[]
    bytesAdded: CommitAward[]
    bytesRemoved: CommitAward[]
    linesAdded: CommitAward[]
    linesRemoved: CommitAward[]
    lowestAverage: ContributorAward[]
    highestAverage: ContributorAward[]
  }
  githubUrl?: string
  chartsConfig?: SimplifiedConfig['charts']
}

export function renderAllCharts(data: ChartData): void {
  // Store all data globally for filtering access
  chartData['allData'] = data

  // Make updateChartsWithFileTypeFilter globally available for chart modules
  ;(globalThis as any).updateChartsWithFileTypeFilter = updateChartsWithFileTypeFilter

  // Render all charts in the correct order
  // Time slider must be last so it can reference other charts

  try {
    renderContributorsChart(data.contributors, data.chartsConfig?.topContributorsLimit ?? 10)
  } catch (error) {
    console.error('Failed to render contributors chart:', error)
    showChartError('contributorsChart', 'Contributors chart failed to load')
  }

  try {
    renderFileTypesChart(data.fileTypes)
  } catch (error) {
    console.error('Failed to render file types chart:', error)
    showChartError('fileTypesChart', 'File types chart failed to load')
  }

  try {
    renderGrowthChart(data.linearSeries, data.timeSeries, data.commits)
  } catch (error) {
    console.error('Failed to render growth chart:', error)
    showChartError('growthChart', 'Growth chart failed to load')
  }

  try {
    renderCategoryLinesChart(data.timeSeries, data.commits)
  } catch (error) {
    console.error('Failed to render category lines chart:', error)
    showChartError('categoryLinesChart', 'Category lines chart failed to load')
  }

  try {
    renderCommitActivityChart(data.timeSeries)
  } catch (error) {
    console.error('Failed to render commit activity chart:', error)
    showChartError('commitActivityChart', 'Commit activity chart failed to load')
  }

  try {
    renderWordCloudChart(data.wordCloudData, data.chartsConfig?.wordCloudHeight ?? 400)
  } catch (error) {
    console.error('Failed to render word cloud:', error)
    showChartError('wordCloudChart', 'Word cloud failed to load')
  }

  try {
    renderFileHeatmapChart(data.fileHeatData, data.chartsConfig?.fileHeatmapHeight ?? 400, data.chartsConfig?.fileHeatmapMaxFiles ?? 100)
  } catch (error) {
    console.error('Failed to render file heatmap:', error)
    showChartError('fileHeatmapChart', 'File heatmap failed to load')
  }

  if (data.topFilesData) {
    try {
      renderTopFilesChart(data.topFilesData)
    } catch (error) {
      console.error('Failed to render top files chart:', error)
      showChartError('topFilesChart', 'Top files chart failed to load')
    }
  }

  // Render time slider last so all target charts exist
  try {
    renderTimeSliderChart(data.timeSeries, data.linearSeries)
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
}

function setupEventHandlers(): void {

  // Growth chart axis toggle
  const growthRadios = document.querySelectorAll('input[name="growthXAxis"]')
  growthRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.checked) {
        updateGrowthChartAxis(target.value as 'date' | 'commit')
      }
    })
  })

  // Category lines chart axis toggle
  const categoryRadios = document.querySelectorAll('input[name="categoryXAxis"]')
  categoryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.checked) {
        updateCategoryChartAxis(target.value as 'date' | 'commit')
      }
    })
  })

  // Clear Filters button
  const clearFiltersBtn = document.getElementById('clearFilters')
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Reset time slider to full range
      const startSlider = document.getElementById('startRange') as HTMLInputElement
      const endSlider = document.getElementById('endRange') as HTMLInputElement
      
      if (startSlider && endSlider) {
        startSlider.value = '0'
        endSlider.value = '100'
        
        // Trigger the slider update to reset all charts and status
        startSlider.dispatchEvent(new Event('input'))
      }
    })
  }

  // No need for tab switching event listeners anymore since all charts are rendered
}


// renderContributorsChart moved to ./charts/contributors-chart.js

// renderFileTypesChart moved to ./charts/file-types-chart.js



function renderTopFilesChart(topFilesData: TopFilesData): void {
  // Store data for filtering
  chartData['topFilesChart'] = { data: topFilesData, currentView: 'size' }

  // Render all three charts
  renderTopFilesChartWithFilter(topFilesData, 'size', 'topFilesChartSize')
  renderTopFilesChartWithFilter(topFilesData, 'changes', 'topFilesChartChurn')
  renderTopFilesChartWithFilter(topFilesData, 'complexity', 'topFilesChartComplex')

}

// Helper function to extract filename from path (global scope for data labels)
function getFileNameFromPath(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

function buildTopFilesChartOptions(view: string, data: TopFilesData): any {
  let series: any
  let yaxisTitle: string
  let tooltipFormatter: any
  let fullPaths: string[] = []

  if (view === 'size') {
    fullPaths = data.largest.map(f => f.fileName)
    series = [{
      name: 'Lines of Code',
      data: data.largest.map(f => ({
        x: getFileNameFromPath(f.fileName), // Show only filename on axis
        y: f.value
      }))
    }]
    yaxisTitle = 'Lines of Code'
    tooltipFormatter = function(val: number, opts: any) {
      const dataIndex = opts.dataPointIndex
      const fullPath = fullPaths[dataIndex] || ''
      return `<div><strong>${fullPath}</strong></div><div>${val.toLocaleString()} lines</div>`
    }
  } else if (view === 'changes') {
    fullPaths = data.mostChurn.map(f => f.fileName)
    series = [{
      name: 'Number of Changes',
      data: data.mostChurn.map(f => ({
        x: getFileNameFromPath(f.fileName), // Show only filename on axis
        y: f.value
      }))
    }]
    yaxisTitle = 'Number of Changes'
    tooltipFormatter = function(val: number, opts: any) {
      const dataIndex = opts.dataPointIndex
      const fullPath = fullPaths[dataIndex] || ''
      return `<div><strong>${fullPath}</strong></div><div>${val.toLocaleString()} commits</div>`
    }
  } else {
    fullPaths = data.mostComplex.map(f => f.fileName)
    series = [{
      name: 'Cyclomatic Complexity',
      data: data.mostComplex.map(f => ({
        x: getFileNameFromPath(f.fileName), // Show only filename on axis
        y: f.value
      }))
    }]
    yaxisTitle = 'Cyclomatic Complexity'
    tooltipFormatter = function(val: number, opts: any) {
      const dataIndex = opts.dataPointIndex
      const fullPath = fullPaths[dataIndex] || ''
      return `<div><strong>${fullPath}</strong></div><div>Complexity: ${val}</div>`
    }
  }

  return {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      background: '#ffffff',
      margin: {
        left: 80
      }
    },
    series: series,
    plotOptions: {
      bar: {
        horizontal: true
      }
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      offsetX: -80,
      style: {
        fontSize: '12px',
        colors: ['#000000']
      },
      formatter: function(_val: number, opts: any) {
        // Show filename on the bar
        const dataIndex = opts.dataPointIndex
        const seriesData = opts.w.config.series[0].data[dataIndex]
        return getFileNameFromPath(seriesData.x)
      }
    },
    colors: ['#87CEEB'],
    xaxis: {
      title: {
        text: yaxisTitle,
        style: { color: '#24292f' }
      },
      labels: {
        style: { colors: '#24292f' },
        formatter: function(val: number) {
          return val.toLocaleString()
        }
      }
    },
    yaxis: {
      labels: {
        show: false
      }
    },
    grid: {
      borderColor: '#e1e4e8'
    },
    tooltip: {
      theme: 'light',
      custom: function(opts: any) {
        const dataIndex = opts.dataPointIndex
        const value = opts.series[0][dataIndex]
        return '<div class="custom-tooltip">' + tooltipFormatter(value, opts) + '</div>'
      }
    }
  }
}

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

function getTimezoneAbbreviation(date: Date): string {
  const timeZoneName = date.toLocaleDateString(undefined, { timeZoneName: 'short' }).split(', ')[1]
  return timeZoneName || 'Local'
}

function renderTimeSliderChart(timeSeries: TimeSeriesPoint[], linearSeries: LinearSeriesPoint[]): void {
  const container = document.getElementById('timeSliderChart')
  if (!container) return


  // Get date range from the data
  const dates = timeSeries.map(point => new Date(point.date).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)

  // Store total commits for commit mode calculations
  const totalCommits = linearSeries.length
  
  // Get user's timezone information
  const timezoneAbbr = getTimezoneAbbreviation(new Date())
  
  // Helper function to format date with timezone
  const formatDateWithTimezone = (date: Date): string => {
    return `${formatShortDateTime(date)} <span style="font-weight: 300; opacity: 0.7; font-size: 0.85em;">${timezoneAbbr}</span>`
  }
  
  // Helper function to format UTC date
  const formatUTCDate = (date: Date): string => {
    const utcOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    }
    return `UTC: ${date.toLocaleString('en-US', utcOptions)}`
  }

  // Create HTML for the range slider
  container.innerHTML = `
    <div class="time-range-slider" style="padding: 15px 10px;">
      <div class="row mb-3">
        <div class="col-6">
          <div class="text-start">
            <span class="text-muted me-2">Start:</span>
            <span class="fw-semibold text-primary" id="selectedStartLabel" style="font-size: 0.95rem;">${formatDateWithTimezone(new Date(minDate))}</span>
            <br>
            <small class="text-muted" id="selectedStartUTC" style="font-size: 0.75rem; font-weight: 300;">${formatUTCDate(new Date(minDate))}</small>
          </div>
        </div>
        <div class="col-6">
          <div class="text-end">
            <span class="text-muted me-2">End:</span>
            <span class="fw-semibold text-primary" id="selectedEndLabel" style="font-size: 0.95rem;">${formatDateWithTimezone(new Date(maxDate))}</span>
            <br>
            <small class="text-muted" id="selectedEndUTC" style="font-size: 0.75rem; font-weight: 300;">${formatUTCDate(new Date(maxDate))}</small>
          </div>
        </div>
      </div>
      <div class="row align-items-center">
        <div class="col-auto">
          <small class="text-muted" id="minDateLabel" style="font-size: 0.75rem;">${new Date(minDate).toLocaleDateString()}</small>
        </div>
        <div class="col">
          <div class="range-slider-container" style="position: relative; height: 40px;">
            <input type="range" class="form-range" id="startRange" 
              min="0" max="100" value="0" 
              style="position: absolute; pointer-events: none; background: transparent;">
            <input type="range" class="form-range" id="endRange" 
              min="0" max="100" value="100" 
              style="position: absolute; pointer-events: none; background: transparent;">
            <div class="slider-track" style="position: absolute; top: 18px; left: 0; right: 0; height: 4px; background: #e1e4e8; border-radius: 2px;"></div>
            <div class="slider-range" id="sliderRange" style="position: absolute; top: 18px; height: 4px; background: #27aeef; border-radius: 2px;"></div>
          </div>
        </div>
        <div class="col-auto">
          <small class="text-muted" id="maxDateLabel" style="font-size: 0.75rem;">${new Date(maxDate).toLocaleDateString()}</small>
        </div>
      </div>
    </div>
    <style>
      .range-slider-container input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        outline: none;
        margin: 0;
      }
      
      .range-slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #27aeef;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: all;
        position: relative;
        z-index: 1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      
      .range-slider-container input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #27aeef;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: all;
        position: relative;
        z-index: 1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        border: none;
      }
      
      #startRange::-webkit-slider-thumb {
        z-index: 2;
      }
      
      #endRange::-webkit-slider-thumb {
        z-index: 3;
      }
    </style>
  `

  // Get references to the sliders
  const startSlider = container.querySelector('#startRange') as HTMLInputElement
  const endSlider = container.querySelector('#endRange') as HTMLInputElement

  const updateSliderRange = () => {
    const sliderRange = document.querySelector('#sliderRange') as HTMLElement
    if (sliderRange && startSlider && endSlider) {
      const startPercent = parseFloat(startSlider.value)
      const endPercent = parseFloat(endSlider.value)
      sliderRange.style.left = startPercent + '%'
      sliderRange.style.width = (endPercent - startPercent) + '%'
    }
  }

  const updateDateRange = () => {
    const selectedStartLabel = document.querySelector('#selectedStartLabel') as HTMLElement
    const selectedEndLabel = document.querySelector('#selectedEndLabel') as HTMLElement
    const selectedStartUTC = document.querySelector('#selectedStartUTC') as HTMLElement
    const selectedEndUTC = document.querySelector('#selectedEndUTC') as HTMLElement

    if (startSlider && endSlider && selectedStartLabel && selectedEndLabel && selectedStartUTC && selectedEndUTC) {
      const startPercent = parseFloat(startSlider.value) / 100
      const endPercent = parseFloat(endSlider.value) / 100

      const startDate = minDate + (maxDate - minDate) * startPercent
      const endDate = minDate + (maxDate - minDate) * endPercent
      
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)

      selectedStartLabel.innerHTML = formatDateWithTimezone(startDateObj)
      selectedEndLabel.innerHTML = formatDateWithTimezone(endDateObj)
      selectedStartUTC.textContent = formatUTCDate(startDateObj)
      selectedEndUTC.textContent = formatUTCDate(endDateObj)

      updateTargetCharts(startDate, endDate, minDate, maxDate, totalCommits)
    }
  }

  // Handle slider input
  startSlider.addEventListener('input', () => {
    if (parseFloat(startSlider.value) > parseFloat(endSlider.value)) {
      startSlider.value = endSlider.value
    }
    updateSliderRange()
    updateDateRange()
  })

  endSlider.addEventListener('input', () => {
    if (parseFloat(endSlider.value) < parseFloat(startSlider.value)) {
      endSlider.value = startSlider.value
    }
    updateSliderRange()
    updateDateRange()
  })

  // Initialize the visual
  updateSliderRange()
}

function formatShortDateTime(date: Date): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return date.toLocaleString(undefined, dateOptions)
}

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

  if ((window as any).ApexCharts) {
    // Zoom the commit activity chart (always date-based)
    const commitChart = chartRefs['commit-activity-chart']
    if (commitChart) {
      commitChart.zoomX(min, max)
    }

    // Zoom the category lines chart (check if it's in date or commit mode)
    const categoryChart = chartRefs['category-lines-chart']
    if (categoryChart) {
      const xAxisType = categoryChart.opts?.xaxis?.type
      
      if (xAxisType === 'datetime') {
        // Date mode - use same date range
        categoryChart.zoomX(min, max)
      } else {
        // Commit mode - need to convert date range to commit indices
        const dateRange = maxDate - minDate
        const startPercent = (min - minDate) / dateRange
        const endPercent = (max - minDate) / dateRange

        const startIndex = Math.max(0, Math.round(startPercent * (totalCommits - 1)))
        const endIndex = Math.min(totalCommits - 1, Math.round(endPercent * (totalCommits - 1)))

        categoryChart.zoomX(startIndex, endIndex)
      }
    }

    // Zoom the growth chart
    const growthChart = chartRefs['growthChart']
    if (growthChart) {
      // Check if growth chart is in date or commit mode
      const xAxisType = growthChart.opts?.xaxis?.type

      if (xAxisType === 'datetime') {
        // Date mode - use same date range
        growthChart.zoomX(min, max)
      } else {
        // Commit mode - need to convert date range to commit indices
        const dateRange = maxDate - minDate
        const startPercent = (min - minDate) / dateRange
        const endPercent = (max - minDate) / dateRange

        const startIndex = Math.max(1, Math.round(startPercent * (totalCommits - 1)) + 1)
        const endIndex = Math.min(totalCommits, Math.round(endPercent * (totalCommits - 1)) + 1)

        growthChart.zoomX(startIndex, endIndex)
      }
    }

    // Zoom user charts (they are always date-based)
    Object.keys(chartRefs).forEach(key => {
      if (key.startsWith('userChart') || key.startsWith('userActivityChart')) {
        const userChart = chartRefs[key]
        if (userChart) {
          userChart.zoomX(min, max)
        }
      }
    })
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
          <div class="btn-group btn-group-sm mb-3" role="group">
            <input type="radio" class="btn-check" name="userXAxis${index}" id="userXAxisDate${index}" value="date">
            <label class="btn btn-outline-primary" for="userXAxisDate${index}">By Date</label>
            <input type="radio" class="btn-check" name="userXAxis${index}" id="userXAxisCommit${index}" value="commit" checked>
            <label class="btn btn-outline-primary" for="userXAxisCommit${index}">By Commit</label>
          </div>
          <div id="${chartId}" style="min-height: 250px;"></div>
          <div id="${activityChartId}" style="min-height: 200px; margin-top: 20px;"></div>
        </div>
      </div>
    `

    container.appendChild(chartCard)

    // Render charts immediately
    renderUserChart(chartId, userCommits, timeSeries, index)
    renderUserActivityChart(activityChartId, userCommits)
    
    // Add event listeners for toggle buttons
    const dateBtn = document.getElementById(`userXAxisDate${index}`)
    const commitBtn = document.getElementById(`userXAxisCommit${index}`)
    
    dateBtn?.addEventListener('change', () => {
      if ((dateBtn as HTMLInputElement).checked) {
        updateUserChartAxis(chartId, 'date', index)
      }
    })
    
    commitBtn?.addEventListener('change', () => {
      if ((commitBtn as HTMLInputElement).checked) {
        updateUserChartAxis(chartId, 'commit', index)
      }
    })
  })
}

async function renderUserChart(chartId: string, userCommits: CommitData[], timeSeries: TimeSeriesPoint[], userIndex: number): Promise<void> {

  const container = document.getElementById(chartId)
  if (!container) {
    return
  }
  if (chartRefs[chartId]) {
    return
  }

  // Import the utility function
  const { buildUserTimeSeriesData } = await import('../utils/chart-data-builders.js')

  // Store data for rebuilding
  chartData[chartId] = { userCommits, timeSeries }
  
  // Get saved axis mode or default to 'commit'
  const xAxisMode = localStorage.getItem(`userChartXAxis${userIndex}`) || 'commit'
  
  // Build data using the utility
  const userChartData = buildUserTimeSeriesData(userCommits, xAxisMode, 'lines', timeSeries)

  const options = {
    chart: {
      id: chartId,
      type: 'area',
      height: 250,
      toolbar: { show: false },
      background: '#ffffff',
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      }
    },
    series: [
      {
        name: 'Lines Added',
        data: userChartData.addedData
      },
      {
        name: 'Lines Removed',
        data: userChartData.removedData
      },
      {
        name: 'Net Lines',
        data: userChartData.netData
      }
    ],
    xaxis: xAxisMode === 'date' ? {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { colors: '#24292f' }
      }
    } : {
      type: 'numeric',
      title: {
        text: 'Commit Index',
        style: { color: '#24292f' }
      },
      labels: {
        style: { colors: '#24292f' },
        formatter: function(val: number) {
          return Math.round(val).toString()
        }
      }
    },
    yaxis: {
      title: {
        text: 'Lines of Code (Cumulative)',
        style: { color: '#24292f' }
      },
      labels: {
        style: { colors: '#24292f' },
        formatter: function(val: number) {
          return Math.abs(val).toLocaleString()
        }
      }
    },
    colors: ['#98D8C8', '#FFB6C1', '#87CEEB'],
    stroke: { curve: 'straight', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.6,
        opacityTo: 0.1
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: '#24292f' }
    },
    grid: { borderColor: '#e1e4e8' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      x: xAxisMode === 'date' ? { format: 'dd MMM yyyy' } : {
        formatter: function(val: number) {
          return `Commit #${Math.round(val) + 1}`
        }
      },
      y: {
        formatter: function(val: number) {
          return Math.abs(val).toLocaleString() + ' lines'
        }
      }
    }
  }


  try {
    const chart = new (window as any).ApexCharts(container, options)
    await chart.render()
    chartRefs[chartId] = chart
    
    // Set initial button state
    const dateBtn = document.getElementById(`userXAxisDate${userIndex}`) as HTMLInputElement
    const commitBtn = document.getElementById(`userXAxisCommit${userIndex}`) as HTMLInputElement
    if (xAxisMode === 'date' && dateBtn && commitBtn) {
      dateBtn.checked = true
      commitBtn.checked = false
    } else if (dateBtn && commitBtn) {
      dateBtn.checked = false
      commitBtn.checked = true
    }
  } catch (error) {
    console.error(`Failed to render chart ${chartId}:`, error)
  }
}

function updateUserChartAxis(chartId: string, mode: 'date' | 'commit', userIndex: number): void {
  const chart = chartRefs[chartId]
  const data = chartData[chartId]
  if (!chart || !data) return

  localStorage.setItem(`userChartXAxis${userIndex}`, mode)

  // Update button states
  const dateBtn = document.getElementById(`userXAxisDate${userIndex}`) as HTMLInputElement
  const commitBtn = document.getElementById(`userXAxisCommit${userIndex}`) as HTMLInputElement

  if (mode === 'date' && dateBtn && commitBtn) {
    dateBtn.checked = true
    commitBtn.checked = false
  } else if (dateBtn && commitBtn) {
    dateBtn.checked = false
    commitBtn.checked = true
  }

  // Destroy old chart
  chart.destroy()
  delete chartRefs[chartId]

  // Rebuild with new axis mode
  renderUserChart(chartId, data.userCommits, data.timeSeries, userIndex)
}


async function renderUserActivityChart(chartId: string, commits: CommitData[]): Promise<void> {
  const container = document.getElementById(chartId)
  if (!container) {
    return
  }
  if (chartRefs[chartId]) {
    return
  }

  // Group commits by date and count
  const commitsByDate = new Map<string, number>()
  commits.forEach(commit => {
    const dateKey = new Date(commit.date).toISOString().split('T')[0]!
    commitsByDate.set(dateKey, (commitsByDate.get(dateKey) || 0) + 1)
  })

  // Convert to chart data
  const data = Array.from(commitsByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({
      x: new Date(date).getTime(),
      y: count
    }))

  const options = {
    chart: {
      type: 'bar',
      height: 200,
      toolbar: { show: false },
      background: '#ffffff',
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      }
    },
    series: [{
      name: 'Daily Commits',
      data: data
    }],
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 2
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { colors: '#24292f' },
        formatter: function(val: number) {
          return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      },
      title: {
        text: 'Date',
        style: { color: '#24292f' }
      }
    },
    yaxis: {
      title: {
        text: 'Commits',
        style: { color: '#24292f' }
      },
      labels: {
        style: { colors: '#24292f' }
      }
    },
    colors: ['#87CEEB'],
    grid: { borderColor: '#e1e4e8' },
    tooltip: {
      theme: 'light',
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: function(val: number) {
          return val + ' commit' + (val !== 1 ? 's' : '')
        }
      }
    }
  }

  try {
    const chart = new (window as any).ApexCharts(container, options)
    await chart.render()
    chartRefs[chartId] = chart
  } catch (error) {
    console.error(`Failed to render chart ${chartId}:`, error)
  }
}

function renderAwards(awards: NonNullable<ChartData['awards']>, githubUrl?: string): void {
  const container = document.getElementById('awardsContainer')
  if (!container) return

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
    col.className = 'chart-third'

    const card = document.createElement('div')
    card.className = 'card h-100'

    const cardHeader = document.createElement('div')
    cardHeader.className = `card-header award-header-${category.color}`
    cardHeader.innerHTML = `
      <h6 class="mb-0 text-secondary">
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
      header.className = 'fw-normal text-secondary'

      const meta = document.createElement('small')
      meta.className = 'text-muted'

      const badge = document.createElement('span')
      badge.className = `badge bg-light text-secondary border rounded-pill`

      if (category.type === 'commit') {
        header.textContent = award.message.length > 50 ?
            award.message.substring(0, 50) + '...' :
            award.message

        const commitLink = githubUrl ?
            `<a href="${githubUrl}/commit/${award.sha}" target="_blank" class="text-decoration-none" title="${award.sha}">
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

// Export functions for event handlers
// File type filtering functions now in chart-state.ts


function updateChartsWithFileTypeFilter(): void {
  // Update file heatmap chart
  const heatmapData = chartData['fileHeatmapChart']
  if (heatmapData) {
    renderFileHeatmapChart(heatmapData.fileHeatData, heatmapData.height, heatmapData.maxFiles)
  }

  // Update all three top files charts if they exist and have data
  const topFilesData = chartData['topFilesChart']
  if (topFilesData) {
    renderTopFilesChartWithFilter(topFilesData.data, 'size', 'topFilesChartSize')
    renderTopFilesChartWithFilter(topFilesData.data, 'changes', 'topFilesChartChurn')
    renderTopFilesChartWithFilter(topFilesData.data, 'complexity', 'topFilesChartComplex')
  }
}

// Helper function to calculate top files for a specific file type
function calculateTopFilesByType(commits: CommitData[], filterFileType: string, fileTypeMap: Map<string, string>, calculationType: 'size' | 'churn' | 'complex'): TopFileStats[] {
  if (calculationType === 'size') {
    const fileSizeMap = new Map<string, number>()
    
    for (const commit of commits) {
      for (const fileChange of commit.filesChanged) {
        // Only include files of the selected type
        if (fileTypeMap.get(fileChange.fileName) !== filterFileType) {
          continue
        }
        
        const currentSize = fileSizeMap.get(fileChange.fileName) ?? 0
        const sizeChange = fileChange.linesAdded - fileChange.linesDeleted
        fileSizeMap.set(fileChange.fileName, currentSize + sizeChange)
      }
    }
    
    // Filter out files with negative or zero size and get top 5
    const files = Array.from(fileSizeMap.entries())
      .filter(([_, size]) => size > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
    
    const totalSize = files.reduce((sum, [_, size]) => sum + size, 0)
    return files.map(([fileName, size]) => ({ 
      fileName, 
      value: size, 
      percentage: totalSize > 0 ? (size / totalSize) * 100 : 0 
    }))
  } 
  
  if (calculationType === 'churn') {
    const fileChurnMap = new Map<string, number>()
    
    for (const commit of commits) {
      for (const fileChange of commit.filesChanged) {
        // Only include files of the selected type
        if (fileTypeMap.get(fileChange.fileName) !== filterFileType) {
          continue
        }
        
        const currentChurn = fileChurnMap.get(fileChange.fileName) ?? 0
        fileChurnMap.set(fileChange.fileName, currentChurn + 1)
      }
    }
    
    // Get top 5 by churn count
    const files = Array.from(fileChurnMap.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
    
    const totalChurn = files.reduce((sum, [_, churn]) => sum + churn, 0)
    return files.map(([fileName, churn]) => ({ 
      fileName, 
      value: churn, 
      percentage: totalChurn > 0 ? (churn / totalChurn) * 100 : 0 
    }))
  }
  
  // For complexity, we can't recalculate without running lizard, so return empty
  // This would need to be implemented with access to the complexity calculation
  return []
}

function renderTopFilesChartWithFilter(topFilesData: TopFilesData, currentView: string, containerId: string = 'topFilesChart'): void {
  const container = document.getElementById(containerId)
  if (!container) return

  // Get file type mapping from original chart data if available
  const originalChartData = chartData['allData']
  let fileTypeMap = new Map<string, string>()

  if (originalChartData && originalChartData.commits) {
    // Build a mapping of fileName -> fileType from commits
    for (const commit of originalChartData.commits) {
      for (const fileChange of commit.filesChanged) {
        fileTypeMap.set(fileChange.fileName, fileChange.fileType)
      }
    }
  }

  // Filter data by selected file type if active
  let filteredData = topFilesData
  const currentFileType = getSelectedFileType()
  if (currentFileType && fileTypeMap.size > 0 && originalChartData && originalChartData.commits) {
    // Recalculate top files for the selected file type
    filteredData = {
      largest: calculateTopFilesByType(originalChartData.commits, currentFileType, fileTypeMap, 'size'),
      mostChurn: calculateTopFilesByType(originalChartData.commits, currentFileType, fileTypeMap, 'churn'),
      mostComplex: calculateTopFilesByType(originalChartData.commits, currentFileType, fileTypeMap, 'complex')
    }
  }

  // Check if current view has no data after filtering
  const currentData = currentView === 'size' ? filteredData.largest :
      currentView === 'changes' ? filteredData.mostChurn :
          filteredData.mostComplex

  if (currentFileType && currentData.length === 0) {
    container.innerHTML = `
      <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: 350px;">
        <div class="text-center">
          <i class="bi bi-funnel fs-1 mb-3"></i>
          <p class="mb-0">No files with type "${currentFileType}" found in ${currentView} view</p>
        </div>
      </div>
    `
    return
  }

  const options = buildTopFilesChartOptions(currentView, filteredData)

  // Update existing chart or create new one
  const chartRefKey = `topFilesChart_${containerId}`
  if (chartRefs[chartRefKey]) {
    // Update existing chart with new options
    chartRefs[chartRefKey].updateOptions(options, true, true, true)
  } else {
    // Create new chart only if it doesn't exist
    const chart = new (window as any).ApexCharts(container, options)
    chart.render()
    chartRefs[chartRefKey] = chart
  }
}
// Re-export update functions from extracted modules
export { updateGrowthChartAxis, updateCategoryChartAxis } from './charts/index.js'
// Export local update function
export { updateUserChartAxis }
