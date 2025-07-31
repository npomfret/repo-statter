import type { CommitData } from '../../git/parser.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../../data/types.js'
import { formatBytes } from './chart-utils.js'
import { chartRefs, chartData } from './chart-state.js'

export function renderGrowthChart(linearSeries: LinearSeriesPoint[], timeSeries: TimeSeriesPoint[], commits: CommitData[]): void {
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