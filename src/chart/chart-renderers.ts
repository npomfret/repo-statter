import type { PageScriptData } from './page-script.js'
import type { CommitData } from '../git/parser.js'
import type { ContributorStats } from '../data/contributor-calculator.js'
import { buildUserTimeSeriesData } from '../utils/chart-data-builders.js'
import { renderWithErrorBoundary } from '../utils/error-boundary.js'
import { ContributorsChart } from '../charts/contributors-chart.js'
import { FileTypesChart } from '../charts/file-types-chart.js'
import { GrowthChart } from '../charts/growth-chart.js'
import { CommitActivityChart } from '../charts/commit-activity-chart.js'
import { WordCloudChart } from '../charts/word-cloud-chart.js'
import { FileHeatmapChart } from '../charts/file-heatmap-chart.js'
import { TopFilesChart } from '../charts/top-files-chart.js'

export class ChartRenderers {
  private contributorsChart: ContributorsChart
  private fileTypesChart: FileTypesChart
  private growthChart: GrowthChart
  private commitActivityChart: CommitActivityChart
  private wordCloudChart: WordCloudChart
  private fileHeatmapChart: FileHeatmapChart
  private topFilesChart: TopFilesChart

  constructor(private data: PageScriptData) {
    this.contributorsChart = new ContributorsChart('contributorsChart')
    this.fileTypesChart = new FileTypesChart('fileTypesChart')
    this.growthChart = new GrowthChart('growthChart')
    this.commitActivityChart = new CommitActivityChart('commitActivityChart')
    this.wordCloudChart = new WordCloudChart('wordCloudChart')
    this.fileHeatmapChart = new FileHeatmapChart('fileHeatmapChart')
    this.topFilesChart = new TopFilesChart('topFilesChart')
  }

  public renderAllCharts(): void {
    renderWithErrorBoundary('contributorsChart', 'Contributors Chart', () => {
      this.contributorsChart.render(this.data.contributors)
    })
    
    renderWithErrorBoundary('fileTypesChart', 'File Types Chart', () => {
      this.fileTypesChart.render(this.data.fileTypes)
    })
    
    renderWithErrorBoundary('growthChart', 'Growth Chart', () => {
      this.growthChart.render(this.data.linearSeries, this.data.timeSeries, 'commit', this.data.commits)
    })
    
    renderWithErrorBoundary('commitActivityChart', 'Commit Activity Chart', () => {
      this.commitActivityChart.render(this.data.timeSeries)
    })
    
    renderWithErrorBoundary('wordCloudChart', 'Word Cloud Chart', () => {
      this.wordCloudChart.render(this.data.wordCloudData)
    })
    
    renderWithErrorBoundary('fileHeatmapChart', 'File Heatmap Chart', () => {
      this.fileHeatmapChart.render(this.data.fileHeatData)
    })
    
    if (this.data.topFilesData) {
      renderWithErrorBoundary('topFilesChart', 'Top Files Chart', () => {
        this.topFilesChart.render(this.data.topFilesData!, 'largest')
      })
    }
  }

  public renderUserCharts(filteredContributors: ContributorStats[]): void {
    const container = document.getElementById('userChartsContainer')
    if (!container) return

    // Clear existing charts
    container.innerHTML = ''

    filteredContributors.forEach((contributor, index) => {
      try {
        this.renderUserChart(contributor, index, container)
      } catch (error) {
        console.error(`Failed to render chart for ${contributor.name}:`, error)
        const col = document.createElement('div')
        col.className = 'col-12 col-xl-6 mb-4'
        col.innerHTML = `
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">${contributor.name}</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                  <h6 class="alert-heading mb-1">Chart Unavailable</h6>
                  <small>User chart could not be rendered. Please check the console for details.</small>
                </div>
              </div>
            </div>
          </div>
        `
        container.appendChild(col)
      }
    })
  }

  private renderUserChart(contributor: ContributorStats, index: number, container: HTMLElement): void {
    const userCommits = this.data.commits.filter(c => c.authorName === contributor.name)
    
    // Create card structure
    const col = document.createElement('div')
    col.className = 'col-12 col-xl-6 mb-4'
    
    const card = document.createElement('div')
    card.className = 'card'
    
    const cardHeader = document.createElement('div')
    cardHeader.className = 'card-header d-flex justify-content-between align-items-center'
    cardHeader.innerHTML = `
      <h5 class="card-title mb-0">${contributor.name}</h5>
      <small class="text-muted">${contributor.commits} commits</small>
    `
    
    const cardBody = document.createElement('div')
    cardBody.className = 'card-body'
    
    // Create controls
    const controls = document.createElement('div')
    controls.className = 'mb-3'
    
    // X-axis toggle
    const xAxisGroup = document.createElement('div')
    xAxisGroup.className = 'btn-group btn-group-sm me-3'
    xAxisGroup.setAttribute('role', 'group')
    
    const dateRadio = document.createElement('input')
    dateRadio.type = 'radio'
    dateRadio.className = 'btn-check'
    dateRadio.name = 'userXAxis' + index
    dateRadio.id = 'userXAxisDate' + index
    dateRadio.value = 'date'
    
    const dateLabel = document.createElement('label')
    dateLabel.className = 'btn btn-outline-primary'
    dateLabel.setAttribute('for', 'userXAxisDate' + index)
    dateLabel.textContent = 'By Date'
    
    const commitRadio = document.createElement('input')
    commitRadio.type = 'radio'
    commitRadio.className = 'btn-check'
    commitRadio.name = 'userXAxis' + index
    commitRadio.id = 'userXAxisCommit' + index
    commitRadio.value = 'commit'
    commitRadio.checked = true
    
    const commitLabel = document.createElement('label')
    commitLabel.className = 'btn btn-outline-primary'
    commitLabel.setAttribute('for', 'userXAxisCommit' + index)
    commitLabel.textContent = 'By Commit'
    
    xAxisGroup.appendChild(dateRadio)
    xAxisGroup.appendChild(dateLabel)
    xAxisGroup.appendChild(commitRadio)
    xAxisGroup.appendChild(commitLabel)
    
    // Metric toggle
    const metricGroup = document.createElement('div')
    metricGroup.className = 'btn-group btn-group-sm'
    metricGroup.setAttribute('role', 'group')
    
    const linesRadio = document.createElement('input')
    linesRadio.type = 'radio'
    linesRadio.className = 'btn-check'
    linesRadio.name = 'userMetric' + index
    linesRadio.id = 'userMetricLines' + index
    linesRadio.value = 'lines'
    linesRadio.checked = true
    
    const linesLabel = document.createElement('label')
    linesLabel.className = 'btn btn-outline-secondary'
    linesLabel.setAttribute('for', 'userMetricLines' + index)
    linesLabel.textContent = 'Lines'
    
    const bytesRadio = document.createElement('input')
    bytesRadio.type = 'radio'
    bytesRadio.className = 'btn-check'
    bytesRadio.name = 'userMetric' + index
    bytesRadio.id = 'userMetricBytes' + index
    bytesRadio.value = 'bytes'
    
    const bytesLabel = document.createElement('label')
    bytesLabel.className = 'btn btn-outline-secondary'
    bytesLabel.setAttribute('for', 'userMetricBytes' + index)
    bytesLabel.textContent = 'Bytes'
    
    metricGroup.appendChild(linesRadio)
    metricGroup.appendChild(linesLabel)
    metricGroup.appendChild(bytesRadio)
    metricGroup.appendChild(bytesLabel)
    
    controls.appendChild(xAxisGroup)
    controls.appendChild(metricGroup)
    
    // Create chart container
    const chartDiv = document.createElement('div')
    chartDiv.id = 'userChart' + index
    
    cardBody.appendChild(controls)
    cardBody.appendChild(chartDiv)
    card.appendChild(cardHeader)
    card.appendChild(cardBody)
    col.appendChild(card)
    container.appendChild(col)
    
    // Render the chart
    this.renderUserChartInstance(userCommits, index)
    
    // Add event listeners for controls
    const xAxisRadios = xAxisGroup.querySelectorAll('input[type="radio"]')
    const metricRadios = metricGroup.querySelectorAll('input[type="radio"]')
    
    xAxisRadios.forEach(radio => {
      radio.addEventListener('change', () => this.renderUserChartInstance(userCommits, index))
    })
    
    metricRadios.forEach(radio => {
      radio.addEventListener('change', () => this.renderUserChartInstance(userCommits, index))
    })
  }

  private renderUserChartInstance(userCommits: CommitData[], index: number): void {
    const xAxis = (document.querySelector(`input[name="userXAxis${index}"]:checked`) as HTMLInputElement)?.value || 'commit'
    const metric = (document.querySelector(`input[name="userMetric${index}"]:checked`) as HTMLInputElement)?.value as 'lines' | 'bytes' || 'lines'
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Prepare data using the common builder
    const { addedData, removedData, netData } = buildUserTimeSeriesData(userCommits, xAxis, metric, this.data.timeSeries)
    
    // Destroy existing chart
    const existingChart = (window as any).userChartInstances?.[index]
    if (existingChart) {
      existingChart.destroy()
    }
    
    const options = {
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: false },
        background: isDark ? '#161b22' : '#ffffff',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false
        }
      },
      series: [
        { name: 'Added', data: addedData },
        { name: 'Removed', data: removedData },
        { name: 'Net', data: netData }
      ],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' },
      xaxis: {
        type: xAxis === 'date' ? 'datetime' : 'numeric',
        title: {
          text: xAxis === 'date' ? 'Date' : 'Commit Number',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: {
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM yyyy',
            day: 'dd MMM',
            hour: 'HH:mm'
          },
          style: { colors: isDark ? '#f0f6fc' : '#24292f' },
          formatter: xAxis === 'commit' ? function(val: number) { return Math.floor(val) } : undefined
        }
      },
      yaxis: {
        title: {
          text: metric === 'lines' ? 'Lines of Code' : 'Repository Size',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: {
          style: { colors: isDark ? '#f0f6fc' : '#24292f' }
        }
      },
      colors: ['#22c55e', '#ef4444', '#3b82f6'],
      fill: { type: 'gradient' },
      legend: {
        labels: { colors: isDark ? '#f0f6fc' : '#24292f' }
      },
      grid: {
        borderColor: isDark ? '#30363d' : '#e1e4e8'
      }
    }
    
    const chartContainer = document.querySelector('#userChart' + index)
    
    const chart = new window.ApexCharts(chartContainer, options)
    chart.render()
    
    // Store chart instance
    if (!(window as any).userChartInstances) {
      (window as any).userChartInstances = {}
    }
    (window as any).userChartInstances[index] = chart
  }

  public updateChartsTheme(): void {
    // Update all chart instances when theme changes
    renderWithErrorBoundary('contributorsChart', 'Contributors Chart', () => {
      this.contributorsChart.render(this.data.contributors)
    })
    
    renderWithErrorBoundary('fileTypesChart', 'File Types Chart', () => {
      this.fileTypesChart.render(this.data.fileTypes)
    })
    
    renderWithErrorBoundary('growthChart', 'Growth Chart', () => {
      this.growthChart.render(this.data.linearSeries, this.data.timeSeries, 'commit', this.data.commits)
    })
    
    renderWithErrorBoundary('commitActivityChart', 'Commit Activity Chart', () => {
      this.commitActivityChart.render(this.data.timeSeries)
    })
    
    renderWithErrorBoundary('wordCloudChart', 'Word Cloud Chart', () => {
      this.wordCloudChart.render(this.data.wordCloudData)
    })
    
    renderWithErrorBoundary('fileHeatmapChart', 'File Heatmap Chart', () => {
      this.fileHeatmapChart.render(this.data.fileHeatData)
    })
    
    // Update user charts as well
    const filteredContributors = this.data.contributors.filter(c => c.commits > 0)
    this.renderUserCharts(filteredContributors)
  }

  public getChartInstances() {
    return {
      contributors: this.contributorsChart,
      fileTypes: this.fileTypesChart,
      growth: this.growthChart,
      commitActivity: this.commitActivityChart,
      wordCloud: this.wordCloudChart,
      fileHeatmap: this.fileHeatmapChart,
      topFiles: this.topFilesChart
    }
  }

  public getTopFilesChart() {
    return this.topFilesChart
  }
}