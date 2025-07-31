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
import { formatBytes, showChartError, type WordCloudData } from './charts/chart-utils.js'
import { chartRefs, chartData, getSelectedFileType } from './charts/chart-state.js'

// Import extracted chart functions
import { renderContributorsChart } from './charts/contributors-chart.js'
import { renderFileTypesChart } from './charts/file-types-chart.js'

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
  renderUserCharts(topContributors, data.commits)

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

function renderGrowthChart(linearSeries: LinearSeriesPoint[], timeSeries: TimeSeriesPoint[], commits: CommitData[]): void {
  const container = document.getElementById('growthChart')
  if (!container) return

  // Store data for rebuilding
  chartData['growthChart'] = { linearSeries, timeSeries, commits }

  // Default to commit-based x-axis
  let xAxisMode = 'commit'
  const savedMode = localStorage.getItem('growthChartXAxis')
  if (savedMode === 'date' || savedMode === 'commit') {
    xAxisMode = savedMode
  }

  const options = buildGrowthChartOptions(xAxisMode, linearSeries, timeSeries, commits)

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['growthChart'] = chart

  // Set initial button state
  const dateBtn = document.getElementById('growthXAxisDate')
  const commitBtn = document.getElementById('growthXAxisCommit')
  if (xAxisMode === 'date' && dateBtn && commitBtn) {
    dateBtn.classList.add('active')
    commitBtn.classList.remove('active')
  }
}

function buildGrowthChartOptions(xAxisMode: string, linearSeries: LinearSeriesPoint[], timeSeries: TimeSeriesPoint[], commits: CommitData[]): any {
  if (xAxisMode === 'date') {
    // Date-based series using time series data
    return {
      chart: {
        id: 'growth-chart',
        type: 'area',
        height: 350,
        toolbar: { show: false },
        background: '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false
        }
      },
      series: [
        {
          name: 'Lines of Code',
          data: timeSeries.map(point => ({
            x: new Date(point.date).getTime(),
            y: point.cumulativeLines.total
          })),
          yAxisIndex: 0
        },
        {
          name: 'Repository Size',
          data: timeSeries.map(point => ({
            x: new Date(point.date).getTime(),
            y: point.cumulativeBytes.total
          })),
          yAxisIndex: 1
        }
      ],
      xaxis: {
        type: 'datetime',
        title: {
          text: 'Date',
          style: { color: '#24292f' }
        },
        labels: {
          datetimeUTC: false,
          style: { colors: '#24292f' }
        }
      },
      yaxis: [
        {
          title: {
            text: 'Lines of Code',
            style: { color: '#24292f' }
          },
          min: 0,
          labels: {
            style: { colors: '#24292f' },
            formatter: function(val: number) {
              return val.toLocaleString()
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'Repository Size',
            style: { color: '#24292f' }
          },
          min: 0,
          labels: {
            formatter: formatBytes,
            style: { colors: '#24292f' }
          }
        }
      ],
      colors: [
        '#ea5545',  // Lines of Code color
        '#b33dc6'   // Repository Size color
      ],
      stroke: { curve: 'smooth', width: 2 },
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
        x: { format: 'dd MMM yyyy' }
      }
    }
  } else {
    // Commit-based series using linear data
    return {
      chart: {
        id: 'growth-chart',
        type: 'area',
        height: 350,
        toolbar: { show: false },
        background: '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false
        }
      },
      series: [
        {
          name: 'Lines of Code',
          data: linearSeries.map(point => ({
            x: point.commitIndex + 1,
            y: point.cumulativeLines
          })),
          yAxisIndex: 0
        },
        {
          name: 'Repository Size',
          data: linearSeries.map(point => ({
            x: point.commitIndex + 1,
            y: point.cumulativeBytes
          })),
          yAxisIndex: 1
        }
      ],
      xaxis: {
        type: 'numeric',
        title: {
          text: 'Commit Number',
          style: { color: '#24292f' }
        },
        labels: {
          style: { colors: '#24292f' },
          formatter: function(val: number) {
            return Math.round(val).toString()
          }
        },
        min: 1,
        max: linearSeries.length
      },
      yaxis: [
        {
          title: {
            text: 'Lines of Code',
            style: { color: '#24292f' }
          },
          min: 0,
          labels: {
            style: { colors: '#24292f' },
            formatter: function(val: number) {
              return val.toLocaleString()
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'Repository Size',
            style: { color: '#24292f' }
          },
          min: 0,
          labels: {
            formatter: formatBytes,
            style: { colors: '#24292f' }
          }
        }
      ],
      colors: [
        '#ea5545',  // Lines of Code color
        '#b33dc6'   // Repository Size color
      ],
      stroke: { curve: 'smooth', width: 2 },
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
        custom: function({dataPointIndex}: any) {
          const point = linearSeries[dataPointIndex]
          if (!point || point.sha === 'start') return ''

          const commit = commits.find(c => c.sha === point.sha)
          if (!commit) return ''

          const truncateMessage = (msg: string, maxLength: number) => {
            if (msg.length <= maxLength) return msg
            return msg.substring(0, maxLength) + '...'
          }

          let linesDisplay = ''
          const added = commit.linesAdded
          const deleted = commit.linesDeleted
          const net = point.netLines

          if (added > 0) {
            linesDisplay += '+' + added
          }
          if (deleted > 0) {
            if (linesDisplay !== '') {
              linesDisplay += ' / '
            }
            linesDisplay += '-' + deleted
          }

          let netDisplay = ''
          if (added > 0 && deleted > 0) {
            netDisplay = ' (Net: ' + (net > 0 ? '+' : '') + net + ')'
          } else if (added === 0 && deleted === 0) {
            linesDisplay = '0'
          }

          const bytesAdded = commit.bytesAdded || 0
          const bytesDeleted = commit.bytesDeleted || 0
          let bytesDisplay = ''
          if (bytesAdded > 0) {
            bytesDisplay += '+' + formatBytes(bytesAdded)
          }
          if (bytesDeleted > 0) {
            if (bytesDisplay !== '') {
              bytesDisplay += ' / '
            }
            bytesDisplay += '-' + formatBytes(bytesDeleted)
          }
          if (bytesAdded === 0 && bytesDeleted === 0) {
            bytesDisplay = '0 bytes'
          }

          return '<div class="custom-tooltip">' +
              '<div class="tooltip-title">Commit #' + (point.commitIndex + 1) + '</div>' +
              '<div class="tooltip-content">' +
              '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
              '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
              '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
              '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>' +
              '<div><strong>Lines:</strong> ' + linesDisplay + netDisplay + '</div>' +
              '<div><strong>Total Lines:</strong> ' + point.cumulativeLines.toLocaleString() + '</div>' +
              '<div><strong>Bytes:</strong> ' + bytesDisplay + '</div>' +
              '<div><strong>Total Size:</strong> ' + formatBytes(point.cumulativeBytes) + '</div>' +
              '</div></div>'
        }
      }
    }
  }
}

interface BucketedData {
  data: Array<{ x: number; y: number }>
  bucketType: 'Day' | 'Week' | 'Month'
}

function createCommitActivityBuckets(timeSeries: TimeSeriesPoint[]): BucketedData {
  if (timeSeries.length === 0) {
    return { data: [], bucketType: 'Day' }
  }

  const dates = timeSeries.map(point => new Date(point.date).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))

  let bucketType: 'Day' | 'Week' | 'Month'

  if (totalDays <= 50) {
    bucketType = 'Day'
  } else if (Math.ceil(totalDays / 7) <= 50) {
    bucketType = 'Week'
  } else {
    bucketType = 'Month'
  }

  const buckets = new Map<number, number>()

  for (const point of timeSeries) {
    const pointDate = new Date(point.date).getTime()
    let bucketStart: number

    if (bucketType === 'Day') {
      const date = new Date(pointDate)
      date.setHours(0, 0, 0, 0)
      bucketStart = date.getTime()
    } else if (bucketType === 'Week') {
      const date = new Date(pointDate)
      const dayOfWeek = date.getDay()
      const diff = date.getDate() - dayOfWeek
      const weekStart = new Date(date.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      bucketStart = weekStart.getTime()
    } else {
      const date = new Date(pointDate)
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      bucketStart = date.getTime()
    }

    buckets.set(bucketStart, (buckets.get(bucketStart) || 0) + point.commits)
  }

  const data = Array.from(buckets.entries())
      .map(([x, y]) => ({ x, y }))
      .sort((a, b) => a.x - b.x)
      .slice(0, 50)

  return { data, bucketType }
}

function renderCategoryLinesChart(timeSeries: TimeSeriesPoint[], commits: CommitData[]): void {
  const container = document.getElementById('categoryLinesChart')
  if (!container) return

  // Debug logging to understand the data
  console.log('=== Category Chart Debug ===')
  console.log('TimeSeries length:', timeSeries.length)
  console.log('Commits length:', commits.length)
  
  if (timeSeries.length > 0) {
    const firstPoint = timeSeries[0]
    console.log('Sample timeSeries point:', firstPoint)
    if (firstPoint && firstPoint.cumulativeLines) {
      console.log('Categories in first point:', Object.keys(firstPoint.cumulativeLines))
      console.log('Values:', firstPoint.cumulativeLines)
    }
  }
  
  // Get saved axis mode or default to 'commit'
  const xAxisMode = localStorage.getItem('categoryChartXAxis') || 'commit'

  // Store data for axis switching
  chartData['categoryChart'] = { timeSeries, commits }

  // Create separate series for each category
  const categories = ['application', 'test', 'build', 'documentation', 'other'] as const
  const categoryNames = {
    application: 'Application',
    test: 'Test',
    build: 'Build',
    documentation: 'Documentation',
    other: 'Other'
  }
  const categoryColors = {
    application: '#ea5545',
    test: '#b33dc6',
    build: '#f27036',
    documentation: '#27ae60',
    other: '#f39c12'
  }

  const series: any[] = []

  if (xAxisMode === 'date') {
    // Date-based series using time series data
    for (const category of categories) {
      const data = timeSeries.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.cumulativeLines[category]
      }))

      series.push({
        name: categoryNames[category],
        data,
        color: categoryColors[category]
      })
    }
  } else {
    // Commit-based series - map time series data to commit indices
    // Build a map of commit SHA to index
    const commitIndexMap = new Map<string, number>()
    commits.forEach((commit, index) => {
      commitIndexMap.set(commit.sha, index)
    })
    
    // Create arrays for each category indexed by commit
    const commitCumulatives: { [category: string]: (number | null)[] } = {
      application: new Array(commits.length).fill(null),
      test: new Array(commits.length).fill(null),
      build: new Array(commits.length).fill(null),
      documentation: new Array(commits.length).fill(null),
      other: new Array(commits.length).fill(null)
    }
    
    // Map time series points to commit indices
    timeSeries.forEach(point => {
      // Find the latest commit index for this time point
      let latestIndex = -1
      point.commitShas.forEach(sha => {
        const index = commitIndexMap.get(sha)
        if (index !== undefined && index > latestIndex) {
          latestIndex = index
        }
      })
      
      if (latestIndex >= 0) {
        // Update cumulative values for this commit index
        for (const category of categories) {
          commitCumulatives[category]![latestIndex] = point.cumulativeLines[category]
        }
      }
    })
    
    // Fill in gaps by carrying forward the last known value
    for (const category of categories) {
      let lastValue = 0
      for (let i = 0; i < commits.length; i++) {
        if (commitCumulatives[category]![i] === null) {
          commitCumulatives[category]![i] = lastValue
        } else {
          lastValue = commitCumulatives[category]![i]!
        }
      }
    }
    
    // Create series for each category
    for (const category of categories) {
      const data = commitCumulatives[category]!.map((value, index) => ({
        x: index,
        y: value ?? 0
      }))

      series.push({
        name: categoryNames[category],
        data,
        color: categoryColors[category]
      })
    }
  }

  const options = {
    chart: {
      id: 'category-lines-chart',
      type: 'line',
      height: 350,
      toolbar: { show: false },
      background: '#ffffff',
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false,
        type: 'x'
      }
    },
    series,
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: xAxisMode === 'date' ? {
      type: 'datetime',
      title: {
        text: 'Date',
        style: { color: '#24292f' }
      },
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM yyyy',
          day: 'dd MMM',
          hour: 'HH:mm'
        },
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
      },
      tickAmount: 10
    },
    yaxis: {
      title: {
        text: 'Lines of Code',
        style: { color: '#24292f' }
      },
      min: 0,
      labels: {
        style: { colors: '#24292f' },
        formatter: function(val: number) {
          return val.toLocaleString()
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: '#24292f'
      }
    },
    tooltip: {
      theme: 'light',
      enabled: true,
      shared: true,
      intersect: false,
      custom: function({ dataPointIndex }: any) {
        if (xAxisMode === 'date') {
          const point = timeSeries[dataPointIndex]
          if (!point) return ''
          
          const date = new Date(point.date)
          const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          let html = '<div class="custom-tooltip"><div class="tooltip-title">' + dateStr + '</div>'
          html += '<div class="tooltip-content">'
          
          // Show commit info
          if (point.commits > 0) {
            html += '<div><strong>Commits:</strong> ' + point.commits + '</div>'
            if (point.commitShas && point.commitShas.length > 0) {
              html += '<div class="mt-1"><strong>Commit hashes:</strong></div>'
              html += '<div class="tooltip-commit-list">'
              const maxCommits = 5
              const commitsToShow = point.commitShas.slice(0, maxCommits)
              commitsToShow.forEach(sha => {
                const commit = commits.find(c => c.sha === sha)
                if (commit) {
                  html += '<div class="tooltip-commit-item">'
                  html += '<code>' + sha.substring(0, 7) + '</code> - '
                  html += commit.authorName + ': '
                  html += (commit.message.length > 50 ? commit.message.substring(0, 50) + '...' : commit.message)
                  html += '</div>'
                }
              })
              if (point.commitShas.length > maxCommits) {
                html += '<div class="tooltip-commit-item text-muted">... and ' + (point.commitShas.length - maxCommits) + ' more</div>'
              }
              html += '</div>'
            }
          }
          
          // Show category breakdown
          html += '<div class="mt-2"><strong>Cumulative Lines by Category:</strong></div>'
          const categories = ['application', 'test', 'build', 'documentation', 'other'] as const
          const categoryNames = {
            application: 'Application',
            test: 'Test',
            build: 'Build',
            documentation: 'Documentation',
            other: 'Other'
          }
          
          categories.forEach(cat => {
            const value = point.cumulativeLines[cat]
            if (value > 0) {
              html += '<div>' + categoryNames[cat] + ': ' + value.toLocaleString() + ' lines</div>'
            }
          })
          
          html += '<div class="mt-1"><strong>Total:</strong> ' + point.cumulativeLines.total.toLocaleString() + ' lines</div>'
          html += '</div></div>'
          
          return html
        } else {
          // Commit mode
          const commit = commits[dataPointIndex]
          if (!commit) return ''
          
          const date = new Date(commit.date)
          const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          let html = '<div class="custom-tooltip"><div class="tooltip-title">Commit #' + (dataPointIndex + 1) + '</div>'
          html += '<div class="tooltip-content">'
          html += '<div><strong>SHA:</strong> <code>' + commit.sha.substring(0, 7) + '</code></div>'
          html += '<div><strong>Author:</strong> ' + commit.authorName + '</div>'
          html += '<div><strong>Date:</strong> ' + dateStr + '</div>'
          html += '<div><strong>Message:</strong> ' + (commit.message.length > 80 ? commit.message.substring(0, 80) + '...' : commit.message) + '</div>'
          
          // Show cumulative values from series data
          html += '<div class="mt-2"><strong>Cumulative Lines at this commit:</strong></div>'
          series.forEach((s: any) => {
            const value = s.data[dataPointIndex]?.y || 0
            if (value > 0) {
              html += '<div>' + s.name + ': ' + value.toLocaleString() + ' lines</div>'
            }
          })
          
          html += '</div></div>'
          
          return html
        }
      }
    },
    grid: {
      borderColor: '#e1e4e8'
    }
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['category-lines-chart'] = chart
  
  // Set initial button state
  const dateBtn = document.getElementById('categoryXAxisDate') as HTMLInputElement
  const commitBtn = document.getElementById('categoryXAxisCommit') as HTMLInputElement
  if (xAxisMode === 'date' && dateBtn && commitBtn) {
    dateBtn.checked = true
    commitBtn.checked = false
  } else if (dateBtn && commitBtn) {
    dateBtn.checked = false
    commitBtn.checked = true
  }
}

function renderCommitActivityChart(timeSeries: TimeSeriesPoint[]): void {
  const container = document.getElementById('commitActivityChart')
  if (!container) return


  const bucketedData = createCommitActivityBuckets(timeSeries)

  const options = {
    chart: {
      id: 'commit-activity-chart',
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      background: '#ffffff',
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      }
    },
    series: [{
      name: 'Commits',
      data: bucketedData.data
    }],
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 2
      }
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: `${bucketedData.bucketType} (${bucketedData.data.length} ${bucketedData.bucketType.toLowerCase()}s)`,
        style: { color: '#24292f' }
      },
      labels: {
        datetimeUTC: false,
        style: { colors: '#24292f' },
        datetimeFormatter: bucketedData.bucketType === 'Day' ? {
          day: 'dd MMM',
          month: 'MMM yyyy'
        } : bucketedData.bucketType === 'Week' ? {
          day: 'dd MMM',
          month: 'MMM yyyy'
        } : {
          month: 'MMM yyyy',
          year: 'yyyy'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Commits',
        style: { color: '#24292f' }
      },
      min: 0,
      labels: { style: { colors: '#24292f' } }
    },
    colors: ['#0366d6'],
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: '#e1e4e8'
    },
    tooltip: {
      theme: 'light',
      x: {
        formatter: function(val: number) {
          const date = new Date(val)
          if (bucketedData.bucketType === 'Day') {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          } else if (bucketedData.bucketType === 'Week') {
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + 6)
            return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          } else {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        }
      }
    }
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['commit-activity-chart'] = chart
}

function renderWordCloudChart(wordCloudData: WordFrequency[], height: number): void {
  const container = document.getElementById('wordCloudChart')
  if (!container) return


  // D3 word cloud implementation
  const width = container.offsetWidth
  const maxFontSize = 60
  const minFontSize = 12

  const maxFreq = Math.max(...wordCloudData.map(d => d.size))
  const minFreq = Math.min(...wordCloudData.map(d => d.size))

  const fontSize = (window as any).d3.scaleLinear()
      .domain([minFreq, maxFreq])
      .range([minFontSize, maxFontSize])

  const layout = (window as any).d3.layout.cloud()
      .size([width, height])
      .words(wordCloudData.map(d => ({
        text: d.text,
        size: fontSize(d.size),
        frequency: d.size
      })))
      .padding(5)
      .rotate(() => (Math.random() - 0.5) * 60)
      .font('Arial')
      .fontSize((d: WordCloudData) => d.size)
      .on('end', draw)

  layout.start()

  function draw(words: WordCloudData[]) {
    const colorScale = ['#ea5545', '#f46a9b', '#ffd33d', '#b33dc6', '#27aeef', '#2ea043', '#0366d6', '#79c0ff', '#e27300']

    const svg = (window as any).d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`)

    svg.selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', (d: WordCloudData) => `${d.size}px`)
        .style('font-family', 'Arial')
        .style('fill', (_: WordCloudData, i: number) => colorScale[i % colorScale.length])
        .attr('text-anchor', 'middle')
        .attr('transform', (d: WordCloudData) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text((d: WordCloudData) => d.text)
        .append('title')
        .text((d: WordCloudData) => `${d.text}: ${d.frequency} occurrences`)
  }
}

function renderFileHeatmapChart(fileHeatData: FileHeatData[], height: number, maxFiles: number): void {
  const container = document.getElementById('fileHeatmapChart')
  if (!container) return


  // Store original data for filtering
  chartData['fileHeatmapChart'] = { fileHeatData, height, maxFiles }

  // Apply file type filter if active
  let filteredData = fileHeatData
  const currentFileType = getSelectedFileType()
  if (currentFileType) {
    filteredData = fileHeatData.filter(file => file.fileType === currentFileType)

    if (filteredData.length === 0) {
      // Destroy existing chart if it exists
      if (chartRefs['fileHeatmapChart']) {
        chartRefs['fileHeatmapChart'].destroy()
        chartRefs['fileHeatmapChart'] = null
      }

      container.innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: ${height}px;">
          <div class="text-center">
            <i class="bi bi-funnel fs-1 mb-3"></i>
            <p class="mb-0">No files with type "${currentFileType}" found</p>
          </div>
        </div>
      `
      return
    }
  }

  // Limit files and prepare data
  const limitedData = filteredData.slice(0, maxFiles)

  const data = limitedData.map(file => ({
    x: file.fileName,
    y: file.totalLines
  }))

  const options = {
    chart: {
      type: 'treemap',
      height: height,
      toolbar: { show: false },
      background: '#ffffff'
    },
    series: [{
      data: data
    }],
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        colors: ['#24292f']
      },
      formatter: function(val: string, opts: any) {
        return [val, opts.value.toLocaleString() + ' lines'].join('\n')
      }
    },
    plotOptions: {
      treemap: {
        enableShades: true,
        shadeIntensity: 0.5,
        reverseNegativeShade: true,
        colorScale: {
          ranges: [{
            from: 0,
            to: 50,
            color: '#9be9a8'
          }, {
            from: 51,
            to: 200,
            color: '#40c463'
          }, {
            from: 201,
            to: 500,
            color: '#30a14e'
          }, {
            from: 501,
            to: 99999,
            color: '#216e39'
          }]
        }
      }
    },
    tooltip: {
      theme: 'light',
      custom: function({dataPointIndex}: any) {
        const file = limitedData[dataPointIndex]
        if (!file) return ''
        return `
          <div class="p-2">
            <strong>${file.fileName}</strong><br/>
            Lines: ${file.totalLines.toLocaleString()}<br/>
            Commits: ${file.commitCount}<br/>
            Type: ${file.fileType}<br/>
            Last modified: ${new Date(file.lastModified).toLocaleDateString()}
          </div>
        `
      }
    }
  }

  // Destroy existing chart if it exists
  if (chartRefs['fileHeatmapChart']) {
    chartRefs['fileHeatmapChart'].destroy()
    chartRefs['fileHeatmapChart'] = null
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['fileHeatmapChart'] = chart
}

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
    colors: ['#0366d6'],
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

function renderUserCharts(topContributors: ContributorStats[], commits: CommitData[]): void {
  const container = document.getElementById('userChartsContainer')
  if (!container) {
    return
  }


  topContributors.forEach((contributor, index) => {
    const userCommits = commits.filter(c => c.authorName === contributor.name)

    const chartData = buildUserTimeSeriesData(userCommits)

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
          <div id="${chartId}" style="min-height: 250px;"></div>
          <div id="${activityChartId}" style="min-height: 200px; margin-top: 20px;"></div>
        </div>
      </div>
    `

    container.appendChild(chartCard)

    // Render charts immediately
    renderUserChart(chartId, chartData)
    renderUserActivityChart(activityChartId, userCommits)
  })
}

async function renderUserChart(chartId: string, data: ReturnType<typeof buildUserTimeSeriesData>): Promise<void> {

  const container = document.getElementById(chartId)
  if (!container) {
    return
  }
  if (chartRefs[chartId]) {
    return
  }


  const options = {
    chart: {
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
        data: data.addedData
      },
      {
        name: 'Lines Removed',
        data: data.removedData
      },
      {
        name: 'Net Lines',
        data: data.netData
      }
    ],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { colors: '#24292f' },
        formatter: function(val: number) {
          return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    colors: ['#2ea043', '#da3633', '#0366d6'], // Green for added, red for removed, blue for net
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: '#24292f'
      }
    },
    grid: { borderColor: '#e1e4e8' },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      x: { format: 'dd MMM yyyy' },
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
  } catch (error) {
    console.error(`Failed to render chart ${chartId}:`, error)
  }
}

interface UserChartData {
  addedData: Array<{x: number, y: number}>
  removedData: Array<{x: number, y: number}>
  netData: Array<{x: number, y: number}>
}

function buildUserTimeSeriesData(commits: CommitData[]): UserChartData {
  // Sort commits by date
  const sortedCommits = [...commits].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  const addedData: Array<{x: number, y: number}> = []
  const removedData: Array<{x: number, y: number}> = []
  const netData: Array<{x: number, y: number}> = []
  
  let cumulativeAdded = 0
  let cumulativeRemoved = 0
  
  // Group commits by date
  const commitsByDate = new Map<string, CommitData[]>()
  sortedCommits.forEach(commit => {
    const dateKey = new Date(commit.date).toISOString().split('T')[0]!
    if (!commitsByDate.has(dateKey)) {
      commitsByDate.set(dateKey, [])
    }
    commitsByDate.get(dateKey)!.push(commit)
  })
  
  // Process each date in order
  const sortedDates = Array.from(commitsByDate.keys()).sort()
  
  sortedDates.forEach(dateKey => {
    const dayCommits = commitsByDate.get(dateKey)!
    
    // Sum lines for this day
    const dayAdded = dayCommits.reduce((sum, c) => sum + c.linesAdded, 0)
    const dayRemoved = dayCommits.reduce((sum, c) => sum + c.linesDeleted, 0)
    
    // Update cumulative totals
    cumulativeAdded += dayAdded
    cumulativeRemoved += dayRemoved
    
    // Add data points
    const timestamp = new Date(dateKey).getTime()
    addedData.push({ x: timestamp, y: cumulativeAdded })
    removedData.push({ x: timestamp, y: -cumulativeRemoved }) // Negative for visual effect
    netData.push({ x: timestamp, y: cumulativeAdded - cumulativeRemoved })
  })
  
  return { addedData, removedData, netData }
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
    colors: ['#27aeef'],
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
export function updateGrowthChartAxis(mode: 'date' | 'commit'): void {
  const chart = chartRefs['growthChart']
  const data = chartData['growthChart']
  if (!chart || !data) return

  localStorage.setItem('growthChartXAxis', mode)

  // Update button states
  const dateBtn = document.getElementById('growthXAxisDate')
  const commitBtn = document.getElementById('growthXAxisCommit')

  if (mode === 'date') {
    dateBtn?.classList.add('active')
    commitBtn?.classList.remove('active')
  } else {
    commitBtn?.classList.add('active')
    dateBtn?.classList.remove('active')
  }

  // Destroy old chart
  chart.destroy()

  // Rebuild with new options
  const container = document.getElementById('growthChart')
  if (!container) return

  const options = buildGrowthChartOptions(mode, data.linearSeries, data.timeSeries, data.commits)

  const newChart = new (window as any).ApexCharts(container, options)
  newChart.render()
  chartRefs['growthChart'] = newChart
}

export function updateCategoryChartAxis(mode: 'date' | 'commit'): void {
  const chart = chartRefs['category-lines-chart']
  const data = chartData['categoryChart']
  if (!chart || !data) return

  localStorage.setItem('categoryChartXAxis', mode)

  // Update button states
  const dateBtn = document.getElementById('categoryXAxisDate') as HTMLInputElement
  const commitBtn = document.getElementById('categoryXAxisCommit') as HTMLInputElement

  if (mode === 'date' && dateBtn && commitBtn) {
    dateBtn.checked = true
    commitBtn.checked = false
  } else if (dateBtn && commitBtn) {
    dateBtn.checked = false
    commitBtn.checked = true
  }

  // Destroy old chart
  chart.destroy()

  // Rebuild with new axis mode
  renderCategoryLinesChart(data.timeSeries, data.commits)
}

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