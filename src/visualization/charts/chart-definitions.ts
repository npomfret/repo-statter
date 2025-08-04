import type { ApexOptions } from 'apexcharts'

// Import individual chart definitions
import { contributorsChart } from './definitions/contributors.js'
import { fileTypesChart } from './definitions/file-types.js'
import { wordCloudChart } from './definitions/word-cloud.js'
import { fileHeatmapChart } from './definitions/file-heatmap.js'
import { commitActivityChart } from './definitions/commit-activity.js'
import { growthChart } from './definitions/growth.js'
import { categoryLinesChart } from './definitions/category-lines.js'
import { topFilesSizeChart, topFilesChurnChart, topFilesComplexChart } from './definitions/top-files.js'
import { userChart, userActivityChart } from './definitions/user-charts.js'

export interface ChartDefinition {
  type: 'line' | 'area' | 'bar' | 'donut' | 'heatmap' | 'treemap' | 'radialBar' | 'rangeBar' | 'd3-wordcloud'
  hasAxisToggle: boolean
  defaultAxis?: 'date' | 'commit'
  height: number
  elementId: string
  dataFormatter: (data: any, options?: any) => any
  optionsBuilder: (series: any, config?: any) => ApexOptions
  // For charts that need special event handling
  eventHandlers?: {
    onDataPointSelection?: (manager: any, event: any, chartContext: any, config: any) => void
  }
  // Called after chart is mounted to DOM
  mounted?: (chartElement: HTMLElement, data: any) => void
}

// Assemble all chart definitions
export const CHART_DEFINITIONS: Record<string, ChartDefinition> = {
  contributors: contributorsChart,
  fileTypes: fileTypesChart,
  wordCloud: wordCloudChart,
  fileHeatmap: fileHeatmapChart,
  commitActivity: commitActivityChart,
  growth: growthChart,
  categoryLines: categoryLinesChart,
  topFilesSize: topFilesSizeChart,
  topFilesChurn: topFilesChurnChart,
  topFilesComplex: topFilesComplexChart,
  
  // Dynamic user charts - created per contributor
  userChart,
  userActivityChart
}