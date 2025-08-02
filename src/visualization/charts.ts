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
import { renderTimeSlider, resetTimeSlider, updateTargetCharts } from './time-slider-renderer.js'
import { renderUserCharts } from './user-charts-renderer.js'

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

  // Helper function to safely create charts
  const createChart = (
    chartType: string, 
    chartData: any, 
    options: any = {}, 
    containerId: string,
    errorMessage: string
  ): void => {
    try {
      manager.create(chartType, chartData, options)
    } catch (error) {
      console.error(`Failed to render ${chartType}:`, error)
      showChartError(containerId, errorMessage)
    }
  }

  // Render all charts in the correct order
  createChart('contributors', data.contributors, 
    { limit: data.chartsConfig?.topContributorsLimit ?? 10 },
    'contributorsChart', 'Contributors chart failed to load')

  createChart('fileTypes', data.fileTypes, 
    { manager },
    'fileTypesChart', 'File types chart failed to load')

  // Charts with axis toggles
  const growthAxisMode = localStorage.getItem('growthChartXAxis') || 'commit'
  createChart('growth', 
    { linearSeries: data.linearSeries, timeSeries: data.timeSeries, commits: data.commits }, 
    { axisMode: growthAxisMode },
    'growthChart', 'Growth chart failed to load')

  const categoryAxisMode = localStorage.getItem('categoryChartXAxis') || 'commit'
  createChart('categoryLines', 
    { timeSeries: data.timeSeries, commits: data.commits }, 
    { axisMode: categoryAxisMode },
    'categoryLinesChart', 'Category lines chart failed to load')

  createChart('commitActivity', data.timeSeries, {},
    'commitActivityChart', 'Commit activity chart failed to load')

  createChart('wordCloud', data.wordCloudData, 
    { height: data.chartsConfig?.wordCloudHeight ?? 400 },
    'wordCloudChart', 'Word cloud failed to load')

  createChart('fileHeatmap', data.fileHeatData, {
    height: data.chartsConfig?.fileHeatmapHeight ?? 400,
    maxFiles: data.chartsConfig?.fileHeatmapMaxFiles ?? 100,
    manager
  }, 'fileHeatmapChart', 'File heatmap failed to load')

  // Top files charts
  if (data.topFilesData) {
    createChart('topFilesSize', data.topFilesData, {},
      'topFilesChart', 'Top files chart failed to load')
    createChart('topFilesChurn', data.topFilesData, {},
      'topFilesChart', 'Top files chart failed to load')
    createChart('topFilesComplex', data.topFilesData, {},
      'topFilesChart', 'Top files chart failed to load')
  }

  // Render time slider last so all target charts exist
  try {
    renderTimeSlider(data.timeSeries, data.linearSeries, {
      onRangeChange: (startDate, endDate, minDate, maxDate, totalCommits) => {
        setTimeout(() => {
          updateTargetCharts(startDate, endDate, minDate, maxDate, totalCommits, allData?.commits || null, globalManager)
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
  renderUserCharts(topContributors, data.commits, data.linearSeries, data.timeSeries, globalManager)

  // Render awards if available
  if (data.awards) {
    renderAwards(data.awards, data.githubUrl)
  }

  // Set up chart toggles and event handlers
  setupAllChartToggles(manager)
  
  const clearFiltersBtn = document.getElementById('clearFilters')
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      resetTimeSlider()
    })
  }
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