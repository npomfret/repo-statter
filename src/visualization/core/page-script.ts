import { CoreInitializer } from '../../chart/core-initializer.js'
import type { CommitData } from '../../git/parser.js'
import type { ContributorStats, ContributorAward } from '../../data/contributor-calculator.js'
import type { CommitAward } from '../../data/award-calculator.js'
import type { FileTypeStats, FileHeatData } from '../../data/file-calculator.js'
import type { TimeSeriesPoint } from '../../data/time-series-transformer.js'
import type { LinearSeriesPoint } from '../../data/linear-transformer.js'
import type { WordFrequency } from '../../text/processor.js'
import type { TopFilesData } from '../../data/top-files-calculator.js'
import type { ChartsConfig } from '../../config/schema.js'

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

  constructor(_data: PageScriptData) {
    this.coreInitializer = new CoreInitializer()
  }

  public initialize(): void {
    // Initialize core functionality immediately (theme, navigation, etc.)
    this.coreInitializer.initialize()
  }
}

// Global entry point for the page
export function initializePageScript(data: PageScriptData): void {
  const pageScript = new PageScript(data)
  pageScript.initialize()
}