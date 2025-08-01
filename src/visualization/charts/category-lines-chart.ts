import type { CommitData } from '../../git/parser.js'
import type { TimeSeriesPoint } from '../../data/types.js'
import { chartRefs, chartData } from './chart-state.js'

export function renderCategoryLinesChart(timeSeries: TimeSeriesPoint[], commits: CommitData[]): void {
  const container = document.getElementById('categoryLinesChart')
  if (!container) return

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
    application: '#FFB6C1',
    test: '#D8BFD8',
    build: '#FFDAB9',
    documentation: '#98D8C8',
    other: '#F0E68C'
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
      curve: 'straight',
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