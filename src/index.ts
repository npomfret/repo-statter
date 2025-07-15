import { handleCLI } from './cli/handler.js'

export { parseCommitHistory, type CommitData, type FileChange } from './git/parser.js'
export { generateReport } from './report/generator.js'
export { getContributorStats, getFileTypeStats } from './stats/calculator.js'
export { getTimeSeriesData, getLinearSeriesData } from './chart/data-transformer.js'
export { processCommitMessages, type WordFrequency } from './text/processor.js'

export const VERSION = '1.0.0' as const

if (process.argv[1]?.endsWith('index.ts')) {
  const args = process.argv.slice(2)
  await handleCLI(args)
}