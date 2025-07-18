export { parseCommitHistory, type CommitData, type FileChange } from './git/parser.js'
export { generateReport } from './report/generator.js'
export { getContributorStats } from './data/contributor-calculator.js'
export { getFileTypeStats } from './data/file-calculator.js'
export { getTimeSeriesData, getLinearSeriesData } from './chart/data-transformer.js'
export { processCommitMessages, type WordFrequency } from './text/processor.js'

export const VERSION = '1.0.0' as const