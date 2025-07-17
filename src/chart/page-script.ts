import { ChartRenderers } from './chart-renderers.js'
import { EventHandlers } from './event-handlers.js'
import { ChartInitializer } from './chart-initializer.js'
import type { CommitData } from '../git/parser.js'
import type { ContributorStats } from '../stats/calculator.js'
import type { FileTypeStats, FileHeatData } from '../data/file-calculator.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../chart/data-transformer.js'
import type { WordFrequency } from '../text/processor.js'

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
}

export class PageScript {
  private renderers: ChartRenderers
  private eventHandlers: EventHandlers
  private initializer: ChartInitializer

  constructor(data: PageScriptData) {
    this.renderers = new ChartRenderers(data)
    this.eventHandlers = new EventHandlers(data, this.renderers)
    this.initializer = new ChartInitializer(data, this.renderers, this.eventHandlers)
  }

  public initialize(): void {
    this.initializer.initialize()
  }
}

// Global entry point for the page
export function initializePageScript(data: PageScriptData): void {
  const pageScript = new PageScript(data)
  pageScript.initialize()
}