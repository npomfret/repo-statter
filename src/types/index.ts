import ApexCharts from 'apexcharts'
import type { CommitData } from '../git/parser.js'
import type { ContributorStats, FileTypeStats, FileHeatData, ContributorAward, CommitAward } from '../stats/calculator.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../chart/data-transformer.js'

export interface ChartData {
  repositoryName: string
  totalCommits: number
  totalLinesOfCode: number
  totalCodeChurn: number
  generationDate: string
  githubLink: string
  logoSvg: string
  trophySvgs: TrophySvgs
  latestCommitHash: string
  latestCommitAuthor: string
  latestCommitDate: string
}

export interface TrophySvgs {
  contributors: string
  files: string
  bytesAdded: string
  bytesRemoved: string
  linesAdded: string
  linesRemoved: string
  averageLow: string
  averageHigh: string
}

export interface Awards {
  topContributors: ContributorStats[]
  mostFilesModified: CommitAward[]
  mostBytesAdded: CommitAward[]
  mostBytesRemoved: CommitAward[]
  mostLinesAdded: CommitAward[]
  mostLinesRemoved: CommitAward[]
  lowestAverageLinesChanged: ContributorAward[]
  highestAverageLinesChanged: ContributorAward[]
}

export interface FilterState {
  author: string
  dateFrom: string
  dateTo: string
  fileType: string
}

export interface ChartInstances {
  commitActivityChart: ApexCharts | null
  linesOfCodeChart: ApexCharts | null
  codeChurnChart: ApexCharts | null
  repositorySizeChart: ApexCharts | null
  userChartInstances: ApexCharts[]
}

export interface FilteredData {
  commits: CommitData[]
  contributors: ContributorStats[]
  fileTypes: FileTypeStats[]
  timeSeries: TimeSeriesPoint[]
  linearSeries: LinearSeriesPoint[]
  wordCloudData: WordCloudData[]
  fileHeatData: FileHeatData[]
}

export interface WordCloudData {
  text: string
  size: number
}

export interface ChartOptions {
  isDark: boolean
  xAxis?: 'date' | 'commit'
  metric?: 'lines' | 'bytes'
}

export interface DataPoint {
  x: number
  y: number
}

export interface SeriesData {
  name: string
  data: DataPoint[]
}

export interface TooltipContext {
  seriesIndex: number
  dataPointIndex: number
  w: any
}

export type FormatFunction = (value: number) => string
export type TooltipFormatter = (context: TooltipContext) => string | null