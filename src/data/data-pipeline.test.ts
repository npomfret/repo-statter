import { describe, test, expect } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import { CommitDataBuilder } from '../test/builders.js'
import { getContributorStats, getLowestAverageLinesChanged, getHighestAverageLinesChanged } from './contributor-calculator.js'
import { getFileTypeStats, getFileHeatData } from './file-calculator.js'
import {
  getTopCommitsByFilesModified,
  getTopCommitsByBytesAdded,
  getTopCommitsByBytesRemoved,
  getTopCommitsByLinesAdded,
  getTopCommitsByLinesRemoved
} from './award-calculator.js'
import { getTimeSeriesData } from './time-series-transformer.js'
import { getLinearSeriesData } from './linear-transformer.js'
import { parseCommitDiff, parseByteChanges } from './git-extractor.js'
import { processCommitMessages } from '../text/processor.js'
import type { CommitData } from '../git/parser.js'

describe('Data Pipeline Integration', () => {
  test('complete flow with empty commits', () => {
    const commits: CommitData[] = []

    // All functions should handle empty arrays gracefully
    expect(() => getContributorStats(commits, TEST_CONFIG)).toThrow('Cannot calculate contributor stats from empty commits array')
    expect(getFileTypeStats(commits, undefined, TEST_CONFIG)).toEqual([])
    expect(getFileHeatData(commits, undefined, TEST_CONFIG)).toEqual([])
    expect(getTimeSeriesData(commits, TEST_CONFIG)).toEqual([])
    expect(getLinearSeriesData(commits)).toEqual([])
    expect(() => processCommitMessages([], TEST_CONFIG)).toThrow('Cannot process empty messages array')
    expect(getTopCommitsByFilesModified(commits, TEST_CONFIG)).toEqual([])
    expect(getTopCommitsByBytesAdded(commits, TEST_CONFIG)).toEqual([])
    expect(getTopCommitsByBytesRemoved(commits, TEST_CONFIG)).toEqual([])
    expect(getTopCommitsByLinesAdded(commits, TEST_CONFIG)).toEqual([])
    expect(getTopCommitsByLinesRemoved(commits, TEST_CONFIG)).toEqual([])
    expect(getLowestAverageLinesChanged(commits, TEST_CONFIG)).toEqual([])
    expect(getHighestAverageLinesChanged(commits, TEST_CONFIG)).toEqual([])
  })

  test('complete flow with single contributor, single commit', () => {
    const commit = new CommitDataBuilder()
      .withAuthor('Alice', 'alice@example.com')
      .withMessage('feat: Add user authentication')
      .withFileChange({
        fileName: 'src/auth.ts',
        linesAdded: 50,
        linesDeleted: 10,
        fileType: 'TypeScript'
      })
      .build()

    const commits = [commit]

    // Contributor stats
    const contributors = getContributorStats(commits, TEST_CONFIG)
    expect(contributors).toHaveLength(1)
    expect(contributors[0]).toMatchObject({
      name: 'Alice',
      commits: 1,
      linesAdded: 50,
      linesDeleted: 10
    })

    // File type stats
    const fileTypes = getFileTypeStats(commits, undefined, TEST_CONFIG)
    expect(fileTypes).toHaveLength(1)
    expect(fileTypes[0]).toMatchObject({
      type: 'TypeScript',
      lines: 50,
      percentage: 100
    })

    // Time series data
    const timeSeries = getTimeSeriesData(commits, TEST_CONFIG)
    expect(timeSeries.length).toBeGreaterThan(0)
    expect(timeSeries[timeSeries.length - 1]?.cumulativeLines.total).toBe(40)

    // Linear series data
    const linearSeries = getLinearSeriesData(commits)
    expect(linearSeries).toHaveLength(1) // 1 commit
    expect(linearSeries[0]).toBeDefined()
    expect(linearSeries[0]).toMatchObject({
      commitIndex: 0,
      linesAdded: 50,
      linesDeleted: 10,
      cumulativeLines: 40
    })

    // Awards
    const topByFiles = getTopCommitsByFilesModified(commits, TEST_CONFIG)
    expect(topByFiles).toHaveLength(1)
    expect(topByFiles[0]).toMatchObject({
      authorName: 'Alice',
      value: 1
    })

    // Word cloud
    const wordCloud = processCommitMessages(['feat: Add user authentication'], TEST_CONFIG)
    expect(wordCloud).toContainEqual(
      expect.objectContaining({ text: 'authentication' })
    )
  })

  test('complete flow with multiple contributors and diverse file types', () => {
    const commits = [
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withMessage('feat: Add React component')
        .withFileChange({
          fileName: 'src/components/Button.tsx',
          linesAdded: 100,
          linesDeleted: 0,
          fileType: 'TypeScript'
        })
        .withFileChange({
          fileName: 'src/components/Button.test.tsx',
          linesAdded: 50,
          linesDeleted: 0,
          fileType: 'TypeScript'
        })
        .build(),
      
      new CommitDataBuilder()
        .withAuthor('Bob')
        .withMessage('docs: Update README')
        .withFileChange({
          fileName: 'README.md',
          linesAdded: 20,
          linesDeleted: 5,
          fileType: 'Markdown'
        })
        .build(),
      
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withMessage('style: Format CSS files')
        .withFileChange({
          fileName: 'src/styles/main.css',
          linesAdded: 15,
          linesDeleted: 10,
          fileType: 'CSS'
        })
        .withFileChange({
          fileName: 'src/styles/theme.css',
          linesAdded: 25,
          linesDeleted: 20,
          fileType: 'CSS'
        })
        .build()
    ]

    // Contributor stats - should be sorted by commits/lines
    const contributors = getContributorStats(commits, TEST_CONFIG)
    expect(contributors).toHaveLength(2)
    expect(contributors[0]?.name).toBe('Alice')
    expect(contributors[0]?.commits).toBe(2)
    expect(contributors[0]?.linesAdded).toBe(190)
    expect(contributors[1]?.name).toBe('Bob')
    expect(contributors[1]?.commits).toBe(1)

    // File type stats - should show distribution
    const fileTypes = getFileTypeStats(commits, undefined, TEST_CONFIG)
    const tsFiles = fileTypes.find(ft => ft.type === 'TypeScript')
    const cssFiles = fileTypes.find(ft => ft.type === 'CSS')
    const mdFiles = fileTypes.find(ft => ft.type === 'Markdown')
    
    expect(tsFiles?.lines).toBe(150)
    expect(cssFiles?.lines).toBe(40)
    expect(mdFiles?.lines).toBe(20)
    
    // Verify percentages add up to 100
    const totalPercentage = fileTypes.reduce((sum, ft) => sum + ft.percentage, 0)
    expect(totalPercentage).toBeCloseTo(100, 0)

    // Heat map data
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    expect(heatData.length).toBeGreaterThan(0)
    expect(heatData[0]?.heatScore).toBeGreaterThan(0)

    // Awards should identify different leaders
    const mostLines = getTopCommitsByLinesAdded(commits, TEST_CONFIG)
    expect(mostLines).toHaveLength(3)
    expect(mostLines[0]?.authorName).toBe('Alice')
    expect(mostLines[0]?.value).toBe(150)

    const mostFiles = getTopCommitsByFilesModified(commits, TEST_CONFIG)
    expect(mostFiles).toHaveLength(3)
    expect(mostFiles[0]?.value).toBe(2)
  })

  test('complete flow with time-based data aggregation', () => {
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const commits = [
      new CommitDataBuilder()
        .withDate(weekAgo)
        .withMessage('fix: Initial bug fix')
        .withFileChange({ fileName: 'src/app.ts', linesAdded: 10, linesDeleted: 5, fileType: 'TypeScript' })
        .build(),
      
      new CommitDataBuilder()
        .withDate(dayAgo)
        .withMessage('feat: Add new feature')
        .withFileChange({ fileName: 'src/feature.ts', linesAdded: 100, linesDeleted: 0, fileType: 'TypeScript' })
        .build(),
      
      new CommitDataBuilder()
        .withDate(hourAgo)
        .withMessage('refactor: Clean up code')
        .withFileChange({ fileName: 'src/utils.ts', linesAdded: 20, linesDeleted: 30, fileType: 'TypeScript' })
        .build(),
      
      new CommitDataBuilder()
        .withDate(now)
        .withMessage('test: Add unit tests')
        .withFileChange({ fileName: 'src/app.test.ts', linesAdded: 50, linesDeleted: 0, fileType: 'TypeScript' })
        .build()
    ]

    // Time series should aggregate based on time gaps
    const timeSeries = getTimeSeriesData(commits, TEST_CONFIG)
    expect(timeSeries.length).toBeGreaterThan(0)
    
    // Verify cumulative calculation
    const lastPoint = timeSeries[timeSeries.length - 1]
    expect(lastPoint?.cumulativeLines.total).toBe(145) // 10 - 5 + 100 - 0 + 20 - 30 + 50 - 0 = 145
    // commits field in time series is per-period, not cumulative
    expect(timeSeries.reduce((sum, p) => sum + p.commits, 0)).toBe(4)

    // Linear series should show progression
    const linearSeries = getLinearSeriesData(commits)
    expect(linearSeries).toHaveLength(4) // 4 commits
    expect(linearSeries[3]?.cumulativeLines).toBe(145)

    // Word cloud should extract meaningful words
    const messages = commits.map(c => c.message)
    const wordCloud = processCommitMessages(messages, TEST_CONFIG)
    const words = wordCloud.map(w => w.text)
    expect(words).toContain('feature')
    expect(words).toContain('tests')
    expect(words).toContain('clean')
  })

  test('data consistency across transformations', () => {
    const commits = [
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withHash('abc123')
        .withFileChange({
          fileName: 'src/app.ts',
          linesAdded: 100,
          linesDeleted: 50,
          fileType: 'TypeScript'
        })
        .build(),
      
      new CommitDataBuilder()
        .withAuthor('Bob')
        .withHash('def456')
        .withFileChange({
          fileName: 'src/test.ts',
          linesAdded: 75,
          linesDeleted: 25,
          fileType: 'TypeScript'
        })
        .build()
    ]

    // Total lines should be consistent across different calculations
    const totalAdded = commits.reduce((sum, c) => sum + c.linesAdded, 0)
    const totalDeleted = commits.reduce((sum, c) => sum + c.linesDeleted, 0)
    const netLines = totalAdded - totalDeleted

    // Verify contributor stats match
    const contributors = getContributorStats(commits, TEST_CONFIG)
    const contributorTotalAdded = contributors.reduce((sum, c) => sum + c.linesAdded, 0)
    const contributorTotalDeleted = contributors.reduce((sum, c) => sum + c.linesDeleted, 0)
    expect(contributorTotalAdded).toBe(totalAdded)
    expect(contributorTotalDeleted).toBe(totalDeleted)

    // Verify time series ends with correct cumulative
    const timeSeries = getTimeSeriesData(commits, TEST_CONFIG)
    const lastTimePoint = timeSeries[timeSeries.length - 1]
    expect(lastTimePoint?.cumulativeLines.total).toBe(netLines)

    // Verify linear series ends with correct cumulative
    const linearSeries = getLinearSeriesData(commits)
    const lastLinearPoint = linearSeries[linearSeries.length - 1]
    expect(lastLinearPoint?.cumulativeLines).toBe(netLines)

    // Verify SHAs are preserved
    expect(linearSeries[0]?.sha).toBe('abc123')
    expect(linearSeries[1]?.sha).toBe('def456')
  })

  test('error handling and edge cases', () => {
    // Commit with no file changes
    const emptyCommit = new CommitDataBuilder()
      .withMessage('docs: Update documentation')
      .build()
    
    // Should not crash any calculations
    expect(() => getContributorStats([emptyCommit], TEST_CONFIG)).not.toThrow()
    expect(() => getFileTypeStats([emptyCommit], undefined, TEST_CONFIG)).not.toThrow()
    expect(() => getTimeSeriesData([emptyCommit], TEST_CONFIG)).not.toThrow()
    expect(() => getLinearSeriesData([emptyCommit])).not.toThrow()

    // Commit with unusual file extensions
    const unusualCommit = new CommitDataBuilder()
      .withFileChange({
        fileName: 'config.unknown',
        linesAdded: 10,
        linesDeleted: 5,
        fileType: 'Other'
      })
      .build()

    const fileTypes = getFileTypeStats([unusualCommit], undefined, TEST_CONFIG)
    expect(fileTypes[0]?.type).toBe('Other')

    // Very long commit message
    const longMessage = 'fix: ' + 'word '.repeat(1000)

    expect(() => processCommitMessages([longMessage], TEST_CONFIG)).not.toThrow()
  })

  test('git extractor integration', () => {
    // Test parsing real git diff output
    const diffSummary = {
      files: [{
        file: 'src/app.ts',
        insertions: 3,
        deletions: 1
      }]
    }

    const byteChanges = {
      totalBytesAdded: 150,
      totalBytesDeleted: 50,
      fileChanges: {
        'src/app.ts': {
          bytesAdded: 150,
          bytesDeleted: 50
        }
      }
    }

    const parsed = parseCommitDiff(diffSummary, byteChanges, TEST_CONFIG)
    expect(parsed.filesChanged).toHaveLength(1)
    expect(parsed.filesChanged[0]).toMatchObject({
      fileName: 'src/app.ts',
      linesAdded: 3,
      linesDeleted: 1,
      fileType: 'TypeScript'
    })
    expect(parsed.linesAdded).toBe(3)
    expect(parsed.linesDeleted).toBe(1)
    expect(parsed.bytesAdded).toBe(150)
    expect(parsed.bytesDeleted).toBe(50)

    // Test byte changes extraction
    const byteOutput = `100\t50\tsrc/file.ts`
    const bytes = parseByteChanges(byteOutput, TEST_CONFIG)
    expect(bytes).toMatchObject({
      totalBytesAdded: 5000,
      totalBytesDeleted: 2500,
      fileChanges: {
        'src/file.ts': {
          bytesAdded: 5000,
          bytesDeleted: 2500
        }
      }
    })
  })
})