import type { CommitData } from '../git/parser.js'
import type { AnalysisContext } from '../report/generator.js'
import { getContributorStats, getLowestAverageLinesChanged, getHighestAverageLinesChanged } from './contributor-calculator.js'
import { getFileTypeStats, getFileHeatData } from './file-calculator.js'
import { getTimeSeriesData } from './time-series-transformer.js'
import { getLinearSeriesData } from './linear-transformer.js'
import { processCommitMessages, type WordFrequency } from '../text/processor.js'
import { getTopFilesStats } from './top-files-calculator.js'
import {
  getTopCommitsByFilesModified,
  getTopCommitsByBytesAdded,
  getTopCommitsByBytesRemoved,
  getTopCommitsByLinesAdded,
  getTopCommitsByLinesRemoved
} from './award-calculator.js'
import type {
  ContributorStats,
  FileTypeStats,
  FileHeatData,
  TimeSeriesPoint,
  LinearSeriesPoint,
  CommitAward,
  TopFilesData
} from './types.js'

export interface ProcessedData {
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
    lowestAverage: any[]
    highestAverage: any[]
  }
}

/**
 * Unified data processing pipeline that consolidates all data transformation logic
 * Replaces the fragmented approach of calling individual transformers
 */
export class DataPipeline {
  /**
   * Process repository data through the complete pipeline
   * This consolidates logic from:
   * - contributor-calculator.ts
   * - file-calculator.ts  
   * - time-series-transformer.ts
   * - linear-transformer.ts
   * - text/processor.ts
   * - award-calculator.ts
   * - top-files-calculator.ts
   */
  async processRepository(context: AnalysisContext): Promise<ProcessedData> {
    const { commits, progressReporter, config } = context
    
    progressReporter?.report('Processing repository data through unified pipeline')
    
    // Core data transformations (run in parallel where possible)
    progressReporter?.report('Calculating contributor and file statistics')
    const contributors = getContributorStats(context)
    const fileTypes = getFileTypeStats(context)
    
    progressReporter?.report('Generating time series and linear data')
    const timeSeries = getTimeSeriesData(context)
    const linearSeries = getLinearSeriesData(commits)
    
    progressReporter?.report('Processing text and heat data')
    const wordCloudData = processCommitMessages(commits.map(c => c.message), config)
    const fileHeatData = getFileHeatData(context)
    
    progressReporter?.report('Calculating top files and awards')
    const topFilesData = await getTopFilesStats(context)
    
    // Awards calculation
    const awards = {
      filesModified: getTopCommitsByFilesModified(context),
      bytesAdded: getTopCommitsByBytesAdded(context),
      bytesRemoved: getTopCommitsByBytesRemoved(context),
      linesAdded: getTopCommitsByLinesAdded(context),
      linesRemoved: getTopCommitsByLinesRemoved(context),
      lowestAverage: getLowestAverageLinesChanged(context),
      highestAverage: getHighestAverageLinesChanged(context)
    }
    
    progressReporter?.report('Data processing complete')
    
    return {
      commits,
      contributors,
      fileTypes,
      timeSeries,
      linearSeries,
      wordCloudData,
      fileHeatData,
      topFilesData,
      awards
    }
  }

  /**
   * Process commits only (for simpler use cases)
   */
  processCommits(commits: CommitData[]): Pick<ProcessedData, 'commits' | 'linearSeries'> {
    return {
      commits,
      linearSeries: getLinearSeriesData(commits)
    }
  }

  /**
   * Extract basic statistics without complex processing
   */
  extractBasicStats(context: AnalysisContext): Pick<ProcessedData, 'contributors' | 'fileTypes'> {
    return {
      contributors: getContributorStats(context),
      fileTypes: getFileTypeStats(context)
    }
  }
}