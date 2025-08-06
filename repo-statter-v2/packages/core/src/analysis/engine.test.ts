/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalysisEngine, AnalysisEngineError, AnalysisProgress } from './engine.js'
import { GitRepository } from '../git/repository.js'
import { GitCommit } from '../types/git.js'

vi.mock('../git/repository.js')

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine
  let mockRepository: GitRepository
  let progressCallback: vi.MockedFunction<(progress: AnalysisProgress) => void>

  const mockCommit: GitCommit = {
    sha: 'abc123',
    author: { name: 'John Doe', email: 'john@example.com' },
    committer: { name: 'John Doe', email: 'john@example.com' },
    date: new Date('2024-01-01'),
    message: 'Test commit',
    stats: { insertions: 10, deletions: 5, files: 1 },
    files: [{
      path: 'test.js',
      insertions: 10,
      deletions: 5,
      status: 'modified'
    }]
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
      expect(result.commits).toHaveLength(1)
      expect(result.contributors).toHaveLength(1)
      expect(result.files).toHaveLength(1)
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
      expect(result.commits).toHaveLength(2)
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
          total: 3
        })
      )
    })

    it('should calculate contributor statistics correctly', async () => {
      const multipleCommits = [
        mockCommit,
        {
          ...mockCommit,
          sha: 'def456',
          author: { name: 'Jane Smith', email: 'jane@example.com' },
          committer: { name: 'Jane Smith', email: 'jane@example.com' },
          stats: { insertions: 20, deletions: 10, files: 2 }
        }
      ]

      vi.mocked(mockRepository.streamCommits).mockImplementation(async function* () {
        for (const commit of multipleCommits) {
          yield commit as GitCommit
        }
      })

      const result = await engine.analyze('/test/repo')
      
      expect(result.contributors).toHaveLength(2)
      // Both contributors have 1 commit, so order is not guaranteed
      const jane = result.contributors.find(c => c.email === 'jane@example.com')
      const john = result.contributors.find(c => c.email === 'john@example.com')
      
      expect(jane).toBeDefined()
      expect(jane?.commitCount).toBe(1)
      expect(jane?.linesAdded).toBe(20)
      expect(jane?.linesNet).toBe(10)
      
      expect(john).toBeDefined()
      expect(john?.commitCount).toBe(1)
    })

    it('should calculate file statistics correctly', async () => {
      const result = await engine.analyze('/test/repo')
      
      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('test.js')
      expect(result.files[0].changeCount).toBe(1)
      expect(result.files[0].linesAdded).toBe(10)
      expect(result.files[0].linesDeleted).toBe(5)
      expect(result.files[0].contributorCount).toBe(1)
    })

    it('should generate time series data', async () => {
      const result = await engine.analyze('/test/repo')
      
      expect(result.timeSeries).toHaveLength(1)
      expect(result.timeSeries[0].period).toBe('2024-01')
      expect(result.timeSeries[0].commitCount).toBe(1)
      expect(result.timeSeries[0].linesAdded).toBe(10)
      expect(result.timeSeries[0].contributorCount).toBe(1)
    })

    it('should handle different time series intervals', async () => {
      const result = await engine.analyze('/test/repo', { timeSeriesInterval: 'day' })
      
      expect(result.timeSeries).toHaveLength(1)
      expect(result.timeSeries[0].period).toBe('2024-01-01')
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
      
      expect(result.metadata.analysisOptions).toEqual(options)
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0)
      expect(result.metadata.version).toBe('2.0.0-alpha.0')
    })
  })
})