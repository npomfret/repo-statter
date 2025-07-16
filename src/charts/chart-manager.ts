import ApexCharts from 'apexcharts'
import type { ChartInstances, FilteredData } from '../types/index.js'
import type { CommitData } from '../git/parser.js'
import { ContributorsChart } from './contributors-chart.js'
import { LinesOfCodeChart } from './lines-of-code-chart.js'
import { FileTypesChart } from './file-types-chart.js'
// Import other chart classes as they are created

export class ChartManager {
  private charts: ChartInstances = {
    commitActivityChart: null,
    linesOfCodeChart: null,
    codeChurnChart: null,
    repositorySizeChart: null,
    userChartInstances: []
  }
  
  private contributorsChart: ContributorsChart
  private linesOfCodeChart: LinesOfCodeChart
  private fileTypesChart: FileTypesChart
  
  constructor() {
    this.contributorsChart = new ContributorsChart('contributorsChart')
    this.linesOfCodeChart = new LinesOfCodeChart('linesOfCodeChart')
    this.fileTypesChart = new FileTypesChart('fileTypesChart')
  }
  
  public renderAllCharts(data: FilteredData, commits: CommitData[]): void {
    try {
      // Clear all existing charts
      this.clearAllCharts()
      
      // Render each chart
      this.contributorsChart.render(data.contributors)
      this.linesOfCodeChart.render({
        linearSeries: data.linearSeries,
        timeSeries: data.timeSeries,
        commits: commits
      })
      this.fileTypesChart.render(data.fileTypes)
      
      // TODO: Render other charts as they are implemented
      // this.renderCommitActivityChart(data)
      // this.renderCodeChurnChart(data)
      // this.renderRepositorySizeChart(data)
      // this.renderWordCloud(data.wordCloudData)
      // this.renderFileHeatmap(data.fileHeatData)
      // this.renderAwards(awards)
      // this.renderUserCharts(data.contributors, data.commits)
      
    } catch (error) {
      console.error('Error rendering charts:', error)
    }
  }
  
  public clearAllCharts(): void {
    // Clear chart containers
    const containers = [
      'commitActivityChart',
      'codeChurnChart',
      'repositorySizeChart',
      'wordCloudChart',
      'fileHeatmapChart'
    ]
    
    containers.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        element.innerHTML = ''
      }
    })
    
    // Destroy ApexCharts instances
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart !== 'object') {
        (chart as ApexCharts).destroy()
      }
    })
    
    // Destroy user chart instances
    this.charts.userChartInstances.forEach(chart => {
      if (chart) chart.destroy()
    })
    this.charts.userChartInstances = []
    
    // Destroy managed charts
    this.contributorsChart.destroy()
    this.linesOfCodeChart.destroy()
    this.fileTypesChart.destroy()
  }
  
  public handleThemeChange(): void {
    // Re-initialize charts with new theme
    
    // Request animation frame to ensure theme change has been processed
    requestAnimationFrame(() => {
      // Charts will pick up new theme on re-render
      // The renderAllCharts method should be called by the main controller
    })
  }
}