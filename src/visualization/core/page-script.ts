import { CoreInitializer } from './core-initializer.js'
import { ChartManager } from './chart-manager.js'
import type { CommitData } from '../../git/parser.js'
import type { WordFrequency } from '../../text/processor.js'
import type { ChartsConfig } from '../../config/schema.js'
import type {
  ContributorStats,
  ContributorAward,
  CommitAward,
  FileTypeStats,
  FileHeatData,
  TimeSeriesPoint,
  LinearSeriesPoint,
  TopFilesData
} from '../../data/types.js'

interface TrophySvgs {
  contributors: string
  files: string
  bytesAdded: string
  bytesRemoved: string
  linesAdded: string
  linesRemoved: string
  averageLow: string
  averageHigh: string
}

declare global {
  interface Window {
    ApexCharts: any
    d3: any
  }
}

export interface PageScriptData {
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
  trophySvgs: TrophySvgs
  githubUrl?: string
  isLizardInstalled?: boolean
  chartsConfig?: ChartsConfig
}

export class PageScript {
  private coreInitializer: CoreInitializer
  private chartManager: ChartManager

  constructor(private data: PageScriptData) {
    this.coreInitializer = new CoreInitializer()
    this.chartManager = new ChartManager()
  }

  public initialize(): void {
    // Initialize core functionality immediately (theme, navigation, etc.)
    this.coreInitializer.initialize()
  }

  public renderCharts(): void {
    // Render all charts using the chart manager
    this.chartManager.renderAllCharts(this.data)
  }

  public get charts(): ChartManager {
    return this.chartManager
  }
}

// Global entry point for the page
export function initializePageScript(data: PageScriptData): void {
  const pageScript = new PageScript(data)
  pageScript.initialize()
}