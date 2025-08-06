/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalysisEngine, AnalysisEngineError, AnalysisProgress } from './engine.js'
import { GitRepository } from '../git/repository.js'
import { CommitInfo } from '../types/git.js'

vi.mock('../git/repository.js')

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine
  let mockRepository: GitRepository
  let progressCallback: vi.MockedFunction<(progress: AnalysisProgress) => void>

  const mockCommit: CommitInfo = {
    sha: 'abc123',
    author: 'John Doe',
    email: 'john@example.com',
    timestamp: new Date('2024-01-01'),
    message: 'Test commit',
    stats: {
      filesChanged: 1,
      additions: 10,
      deletions: 5,
      files: [{
        path: 'test.js',
        additions: 10,
        deletions: 5,
        status: 'modified'
      }]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    engine = new AnalysisEngine()
    progressCallback = vi.fn()
    engine.setProgressCallback(progressCallback)

    mockRepository = {
      getRepositoryInfo: vi.fn(),
      streamCommits: vi.fn()
    } as any

    vi.mocked(GitRepository).mockImplementation(() => mockRepository)
  })

  describe('constructor', () => {
    it('should create engine with default logger', () => {
      const newEngine = new AnalysisEngine()
      expect(newEngine).toBeDefined()
    })

    it('should create engine with custom logger', () => {
      const mockLogger = { info: vi.fn(), error: vi.fn() } as any
      const newEngine = new AnalysisEngine(mockLogger)
      expect(newEngine).toBeDefined()
    })
  })

  describe('setProgressCallback', () => {
    it('should set progress callback', () => {
      const callback = vi.fn()
      engine.setProgressCallback(callback)
      expect(engine['progressCallback']).toBe(callback)
    })
  })

  describe('analyze', () => {
    beforeEach(() => {
      vi.mocked(mockRepository.getRepositoryInfo).mockResolvedValue({
        path: '/test/repo',
        isValid: true,
        currentBranch: 'main',
        totalCommits: 1,
        remotes: ['origin']
      })

      vi.mocked(mockRepository.streamCommits).mockImplementation(async function* () {
        yield mockCommit
      })
    })

    it('should analyze valid repository', async () => {
      const result = await engine.analyze('/test/repo')
      
      expect(result).toBeDefined()
      expect(result.repository.path).toBe('/test/repo')
      expect(result.history.commits).toHaveLength(1)
      expect(result.currentState.contributors.size).toBe(1)
      expect(result.currentState.fileMetrics.size).toBe(1)
      expect(result.timeSeries).toBeDefined()
    })

    it('should throw error for invalid repository', async () => {
      vi.mocked(mockRepository.getRepositoryInfo).mockResolvedValue({
        path: '/test/repo',
        isValid: false,
        currentBranch: null,
        totalCommits: 0,
        remotes: []
      })

      await expect(engine.analyze('/test/repo')).rejects.toThrow(AnalysisEngineError)
    })

    it('should respect maxCommits option', async () => {
      vi.mocked(mockRepository.streamCommits).mockImplementation(async function* () {
        yield mockCommit
        yield { ...mockCommit, sha: 'def456' }
        yield { ...mockCommit, sha: 'ghi789' }
      })

      const result = await engine.analyze('/test/repo', { maxCommits: 2 })
      expect(result.history.commits).toHaveLength(2)
    })

    it('should emit progress events', async () => {
      await engine.analyze('/test/repo')

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'initialization',
          processed: 0,
          total: 4
        })
      )

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'commit_processing',
          processed: 1,
          total: 1
        })
      )

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'finalization',
          processed: 3,
          total: 4
        })
      )
    })

    it('should calculate contributor statistics correctly', async () => {
      const multipleCommits: CommitInfo[] = [
        mockCommit,
        {
          sha: 'def456',
          author: 'Jane Smith',
          email: 'jane@example.com',
          timestamp: new Date('2024-01-02'),
          message: 'Second commit',
          stats: {
            filesChanged: 1,
            additions: 20,
            deletions: 10,
            files: [{
              path: 'other.js',
              additions: 20,
              deletions: 10,
              status: 'modified'
            }]
          }
        }
      ]

      vi.mocked(mockRepository.streamCommits).mockImplementation(async function* () {
        for (const commit of multipleCommits) {
          yield commit
        }
      })

      const result = await engine.analyze('/test/repo')
      
      // Contributors are now in a Map, not an array
      expect(result.currentState.contributors.size).toBe(2)
      
      const jane = result.currentState.contributors.get('jane@example.com')
      const john = result.currentState.contributors.get('john@example.com')
      
      expect(jane).toBeDefined()
      expect(jane?.commits).toBe(1)
      expect(jane?.additions).toBe(20)
      expect(jane?.deletions).toBe(10)
      
      expect(john).toBeDefined()
      expect(john?.commits).toBe(1)
    })

    it('should calculate file statistics correctly', async () => {
      const result = await engine.analyze('/test/repo')
      
      expect(result.currentState.fileMetrics.size).toBe(1)
      const fileMetric = result.currentState.fileMetrics.get('test.js')
      expect(fileMetric).toBeDefined()
      expect(fileMetric?.path).toBe('test.js')
      // Check totals from history
      expect(result.currentState.totalLines).toBeGreaterThan(0)
      expect(result.currentState.totalFiles).toBe(1)
    })

    it('should generate time series data', async () => {
      const result = await engine.analyze('/test/repo')
      
      expect(result.timeSeries).toBeDefined()
      expect(result.timeSeries.commits.points).toHaveLength(1)
      expect(result.timeSeries.commits.points[0].value).toBe(1)
      expect(result.timeSeries.linesOfCode.points[0].value).toBe(10)
      expect(result.timeSeries.contributors.points[0].value).toBe(1)
    })

    it('should handle different time series intervals', async () => {
      const result = await engine.analyze('/test/repo', { granularity: 'day' })
      
      expect(result.timeSeries).toBeDefined()
      expect(result.timeSeries.commits.points).toHaveLength(1)
    })

    it('should handle analysis errors gracefully', async () => {
      vi.mocked(mockRepository.streamCommits).mockImplementation(async function* () {
        throw new Error('Git parsing failed')
      })

      await expect(engine.analyze('/test/repo')).rejects.toThrow(AnalysisEngineError)
    })

    it('should include metadata in results', async () => {
      const options = { maxCommits: 100 }
      const result = await engine.analyze('/test/repo', options)
      
      expect(result.config).toEqual(options)
      expect(result.analyzedAt).toBeInstanceOf(Date)
      expect(result.repository.path).toBe('/test/repo')
    })
  })
})