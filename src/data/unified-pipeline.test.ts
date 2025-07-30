import { describe, test, expect } from 'vitest'
import { DataPipeline } from './unified-pipeline.js'
import { CommitDataBuilder } from '../test/builders.js'
import { TEST_CONFIG } from '../test/test-config.js'
import type { AnalysisContext } from '../report/generator.js'

// Helper to create AnalysisContext for tests
function createAnalysisContext(commits: any[], currentFiles?: Set<string>): AnalysisContext {
  if (!currentFiles) {
    currentFiles = new Set<string>()
    for (const commit of commits) {
      for (const fileChange of commit.filesChanged) {
        currentFiles.add(fileChange.fileName)
      }
    }
  }
  
  return {
    repoPath: '/test/repo',
    repoName: 'test-repo',
    isLizardInstalled: false,
    currentFiles,
    commits,
    config: TEST_CONFIG
  }
}

describe('DataPipeline', () => {
  test('processRepository should return complete data structure', async () => {
    const commits = [
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withMessage('feat: Add authentication system')
        .withFileChange({
          fileName: 'src/auth.ts',
          linesAdded: 100,
          linesDeleted: 10,
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
        .build()
    ]
    
    const context = createAnalysisContext(commits)
    const pipeline = new DataPipeline()
    
    const result = await pipeline.processRepository(context)
    
    // Verify complete data structure
    expect(result).toHaveProperty('commits')
    expect(result).toHaveProperty('contributors')
    expect(result).toHaveProperty('fileTypes')
    expect(result).toHaveProperty('timeSeries')
    expect(result).toHaveProperty('linearSeries')
    expect(result).toHaveProperty('wordCloudData')
    expect(result).toHaveProperty('fileHeatData')
    expect(result).toHaveProperty('topFilesData')
    expect(result).toHaveProperty('awards')
    
    // Verify data integrity
    expect(result.commits).toEqual(commits)
    expect(result.contributors).toHaveLength(2)
    expect(result.fileTypes).toHaveLength(2)
    expect(result.linearSeries).toHaveLength(2)
    expect(result.wordCloudData.length).toBeGreaterThan(0)
    
    // Verify awards structure
    expect(result.awards).toHaveProperty('filesModified')
    expect(result.awards).toHaveProperty('bytesAdded')
    expect(result.awards).toHaveProperty('bytesRemoved')
    expect(result.awards).toHaveProperty('linesAdded')
    expect(result.awards).toHaveProperty('linesRemoved')
    expect(result.awards).toHaveProperty('lowestAverage')
    expect(result.awards).toHaveProperty('highestAverage')
  })

  test('processCommits should return simplified data structure', () => {
    const commits = [
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withFileChange({
          fileName: 'test.ts',
          linesAdded: 50,
          linesDeleted: 10,
          fileType: 'TypeScript'
        })
        .build()
    ]
    
    const pipeline = new DataPipeline()
    const result = pipeline.processCommits(commits)
    
    expect(result).toHaveProperty('commits')
    expect(result).toHaveProperty('linearSeries')
    expect(result.commits).toEqual(commits)
    expect(result.linearSeries).toHaveLength(1)
    expect(result.linearSeries[0]?.cumulativeLines).toBe(40) // 50 - 10
  })

  test('extractBasicStats should return contributor and file type data', () => {
    const commits = [
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withFileChange({
          fileName: 'src/app.ts',
          linesAdded: 100,
          linesDeleted: 0,
          fileType: 'TypeScript'
        })
        .build()
    ]
    
    const context = createAnalysisContext(commits)
    const pipeline = new DataPipeline()
    const result = pipeline.extractBasicStats(context)
    
    expect(result).toHaveProperty('contributors')
    expect(result).toHaveProperty('fileTypes')
    expect(result.contributors).toHaveLength(1)
    expect(result.contributors[0]?.name).toBe('Alice')
    expect(result.fileTypes).toHaveLength(1)
    expect(result.fileTypes[0]?.type).toBe('TypeScript')
  })

  test('should handle empty commits gracefully', async () => {
    const context = createAnalysisContext([], new Set())
    const pipeline = new DataPipeline()
    
    // Most functions should handle empty arrays, but some throw for empty data
    await expect(pipeline.processRepository(context)).rejects.toThrow()
    
    // But processCommits should work with empty array
    const simpleResult = pipeline.processCommits([])
    expect(simpleResult.commits).toEqual([])
    expect(simpleResult.linearSeries).toEqual([])
  })

  test('should maintain data consistency across methods', async () => {
    const commits = [
      new CommitDataBuilder()
        .withAuthor('Alice')
        .withHash('abc123')
        .withFileChange({
          fileName: 'src/app.ts',
          linesAdded: 75,
          linesDeleted: 25,
          fileType: 'TypeScript'
        })
        .build()
    ]
    
    const context = createAnalysisContext(commits)
    const pipeline = new DataPipeline()
    
    const fullResult = await pipeline.processRepository(context)
    const basicResult = pipeline.extractBasicStats(context)
    const simpleResult = pipeline.processCommits(commits)
    
    // Contributors should be consistent
    expect(fullResult.contributors).toEqual(basicResult.contributors)
    
    // File types should be consistent
    expect(fullResult.fileTypes).toEqual(basicResult.fileTypes)
    
    // Linear series should be consistent
    expect(fullResult.linearSeries).toEqual(simpleResult.linearSeries)
    
    // Commits should be preserved
    expect(fullResult.commits).toEqual(commits)
    expect(simpleResult.commits).toEqual(commits)
  })
})