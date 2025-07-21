import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import { getFileTypeStats, getFileHeatData } from './file-calculator.js'
import { createTestCommit, FileChangeBuilder } from '../test/builders.js'

describe('getFileTypeStats', () => {
  it('calculates stats for a single file type', () => {
    const commits = [
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .withFileType('JavaScript')
            .withAdditions(100)
            .build()
        ]
      })
    ]
    
    const stats = getFileTypeStats(commits, undefined, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!).toEqual({
      type: 'JavaScript',
      lines: 100,
      percentage: 100
    })
  })
  
  it('calculates stats for multiple file types', () => {
    const commits = [
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .withFileType('JavaScript')
            .withAdditions(100)
            .build(),
          new FileChangeBuilder()
            .withPath('src/style.css')
            .withFileType('CSS')
            .withAdditions(50)
            .build()
        ]
      }),
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/app.js')
            .withFileType('JavaScript')
            .withAdditions(50)
            .build()
        ]
      })
    ]
    
    const stats = getFileTypeStats(commits, undefined, TEST_CONFIG)
    
    expect(stats).toHaveLength(2)
    expect(stats[0]!).toEqual({
      type: 'JavaScript',
      lines: 150,
      percentage: 75
    })
    expect(stats[1]!).toEqual({
      type: 'CSS',
      lines: 50,
      percentage: 25
    })
  })
  
  it('sorts file types by total lines in descending order', () => {
    const commits = [
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder().withFileType('CSS').withAdditions(50).build(),
          new FileChangeBuilder().withFileType('JavaScript').withAdditions(150).build(),
          new FileChangeBuilder().withFileType('TypeScript').withAdditions(100).build()
        ]
      })
    ]
    
    const stats = getFileTypeStats(commits, undefined, TEST_CONFIG)
    
    expect(stats.map(s => s.type)).toEqual(['JavaScript', 'TypeScript', 'CSS'])
  })
  
  it('handles empty commits array', () => {
    const stats = getFileTypeStats([], undefined, TEST_CONFIG)
    expect(stats).toEqual([])
  })
  
  it('handles commits with no file changes', () => {
    const commits = [
      createTestCommit({ filesChanged: [] })
    ]
    
    const stats = getFileTypeStats(commits, undefined, TEST_CONFIG)
    expect(stats).toEqual([])
  })
  
  it('handles zero total lines', () => {
    const commits = [
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder()
            .withFileType('JavaScript')
            .withAdditions(0)
            .build()
        ]
      })
    ]
    
    const stats = getFileTypeStats(commits, undefined, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!.percentage).toBe(0)
  })
})

describe('getFileHeatData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('calculates heat data for a single file', () => {
    const commits = [
      createTestCommit({
        date: '2024-01-10T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .withFileType('JavaScript')
            .withAdditions(100)
            .build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData).toHaveLength(1)
    expect(heatData[0]!.fileName).toBe('src/index.js')
    expect(heatData[0]!.commitCount).toBe(1)
    expect(heatData[0]!.lastModified).toBe('2024-01-10T10:00:00.000Z')
    expect(heatData[0]!.totalLines).toBe(100)
    expect(heatData[0]!.fileType).toBe('JavaScript')
    expect(heatData[0]!.heatScore).toBeGreaterThan(0)
  })
  
  it('accumulates data for files modified multiple times', () => {
    const commits = [
      createTestCommit({
        date: '2024-01-01T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .withAdditions(100)
            .build()
        ]
      }),
      createTestCommit({
        date: '2024-01-10T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .withAdditions(50)
            .build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData).toHaveLength(1)
    expect(heatData[0]!.commitCount).toBe(2)
    expect(heatData[0]!.totalLines).toBe(150)
    expect(heatData[0]!.lastModified).toBe('2024-01-10T10:00:00.000Z')
  })
  
  it('tracks the most recent modification date', () => {
    const commits = [
      createTestCommit({
        date: '2024-01-10T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .build()
        ]
      }),
      createTestCommit({
        date: '2024-01-05T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/index.js')
            .build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData[0]!.lastModified).toBe('2024-01-10T10:00:00.000Z')
  })
  
  it('calculates heat score based on frequency and recency', () => {
    const commits = [
      // Recent file with many commits
      createTestCommit({
        date: '2024-01-14T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder().withPath('recent.js').build()
        ]
      }),
      createTestCommit({
        date: '2024-01-14T11:00:00Z',
        filesChanged: [
          new FileChangeBuilder().withPath('recent.js').build()
        ]
      }),
      createTestCommit({
        date: '2024-01-14T12:00:00Z',
        filesChanged: [
          new FileChangeBuilder().withPath('recent.js').build()
        ]
      }),
      // Old file with one commit
      createTestCommit({
        date: '2023-12-01T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder().withPath('old.js').build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData).toHaveLength(2)
    expect(heatData[0]!.fileName).toBe('recent.js')
    expect(heatData[0]!.heatScore).toBeGreaterThan(heatData[1]!.heatScore)
  })
  
  it('sorts files by heat score in descending order', () => {
    const commits = [
      createTestCommit({
        date: '2024-01-01T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder().withPath('low-heat.js').build()
        ]
      }),
      createTestCommit({
        date: '2024-01-14T10:00:00Z',
        filesChanged: [
          new FileChangeBuilder().withPath('high-heat.js').build(),
          new FileChangeBuilder().withPath('high-heat.js').build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData.map(h => h.fileName)).toEqual(['high-heat.js', 'low-heat.js'])
  })
  
  it('ensures minimum total lines of 1', () => {
    const commits = [
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder()
            .withPath('empty.js')
            .withAdditions(0)
            .build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData[0]!.totalLines).toBe(1)
  })
  
  it('handles empty commits array', () => {
    const heatData = getFileHeatData([], undefined, TEST_CONFIG)
    expect(heatData).toEqual([])
  })
  
  it('preserves file type information', () => {
    const commits = [
      createTestCommit({
        filesChanged: [
          new FileChangeBuilder()
            .withPath('src/app.tsx')
            .withFileType('TypeScript')
            .build()
        ]
      })
    ]
    
    const heatData = getFileHeatData(commits, undefined, TEST_CONFIG)
    
    expect(heatData[0]!.fileType).toBe('TypeScript')
  })
})