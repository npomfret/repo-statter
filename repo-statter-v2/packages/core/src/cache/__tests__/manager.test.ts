/**
 * Cache Manager Tests
 * @module @repo-statter/core/cache/__tests__/manager.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { CacheManager, CacheError } from '../manager.js'
import { CommitInfo } from '../../types/git.js'
import { FileAnalysisResult } from '../../analysis/file-analyzer.js'

describe('CacheManager', () => {
  let cacheManager: CacheManager
  let testCacheDir: string

  beforeEach(async () => {
    testCacheDir = join(tmpdir(), `repo-statter-test-cache-${Date.now()}`)
    cacheManager = new CacheManager({ basePath: testCacheDir })
  })

  afterEach(async () => {
    try {
      await cacheManager.clearCache()
      await fs.rm(testCacheDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('initialization', () => {
    it('should initialize cache directories', async () => {
      await cacheManager.initialize()

      const commitsDir = join(testCacheDir, 'commits')
      const analysisDir = join(testCacheDir, 'analysis')

      await expect(fs.access(commitsDir)).resolves.not.toThrow()
      await expect(fs.access(analysisDir)).resolves.not.toThrow()
    })

    it('should handle initialization errors gracefully', async () => {
      // Create a file where directory should be
      await fs.mkdir(testCacheDir, { recursive: true })
      await fs.writeFile(join(testCacheDir, 'commits'), 'blocked')

      await expect(cacheManager.initialize()).rejects.toThrow(CacheError)
    })
  })

  describe('commit caching', () => {
    const mockCommits: CommitInfo[] = [
      {
        sha: 'abc123',
        author: 'Test Author',
        email: 'test@example.com',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        message: 'Test commit message',
        stats: {
          filesChanged: 2,
          additions: 10,
          deletions: 5,
          files: [
            {
              path: 'src/index.ts',
              additions: 8,
              deletions: 2,
              status: 'modified'
            },
            {
              path: 'README.md',
              additions: 2,
              deletions: 3,
              status: 'modified'
            }
          ]
        }
      },
      {
        sha: 'def456',
        author: 'Another Author',
        email: 'another@example.com',
        timestamp: new Date('2023-01-02T15:30:00Z'),
        message: 'Another test commit',
        stats: {
          filesChanged: 1,
          additions: 5,
          deletions: 0,
          files: [
            {
              path: 'src/utils.ts',
              additions: 5,
              deletions: 0,
              status: 'added'
            }
          ]
        }
      }
    ]

    it('should cache and retrieve commits', async () => {
      const repoPath = '/test/repo'
      const gitStateHash = 'state123'

      // Cache should be empty initially
      const initial = await cacheManager.getCachedCommits(repoPath, gitStateHash)
      expect(initial).toBeNull()

      // Cache commits
      await cacheManager.setCachedCommits(repoPath, gitStateHash, mockCommits)

      // Retrieve cached commits
      const retrieved = await cacheManager.getCachedCommits(repoPath, gitStateHash)
      expect(retrieved).toHaveLength(2)
      expect(retrieved![0].sha).toBe('abc123')
      expect(retrieved![0].timestamp).toBeInstanceOf(Date)
      expect(retrieved![0].timestamp.getTime()).toBe(new Date('2023-01-01T10:00:00Z').getTime())
      expect(retrieved![1].sha).toBe('def456')
    })

    it('should return null for non-existent cache', async () => {
      const result = await cacheManager.getCachedCommits('/nonexistent', 'hash123')
      expect(result).toBeNull()
    })

    it('should handle cache with different git state hash', async () => {
      const repoPath = '/test/repo'
      
      await cacheManager.setCachedCommits(repoPath, 'state1', mockCommits)
      
      // Different state hash should not return cached data
      const result = await cacheManager.getCachedCommits(repoPath, 'state2')
      expect(result).toBeNull()
    })
  })

  describe('file analysis caching', () => {
    const mockAnalysis: FileAnalysisResult = {
      path: 'src/index.ts',
      language: 'typescript',
      complexity: 5,
      linesOfCode: 150,
      isBinary: false
    }

    it('should cache and retrieve file analysis', async () => {
      const repoPath = '/test/repo'
      const gitStateHash = 'state123'
      const filePath = 'src/index.ts'

      // Cache should be empty initially
      const initial = await cacheManager.getCachedFileAnalysis(repoPath, gitStateHash, filePath)
      expect(initial).toBeNull()

      // Cache analysis
      await cacheManager.setCachedFileAnalysis(repoPath, gitStateHash, filePath, mockAnalysis)

      // Retrieve cached analysis
      const retrieved = await cacheManager.getCachedFileAnalysis(repoPath, gitStateHash, filePath)
      expect(retrieved).toEqual(mockAnalysis)
    })

    it('should handle different file paths separately', async () => {
      const repoPath = '/test/repo'
      const gitStateHash = 'state123'

      await cacheManager.setCachedFileAnalysis(repoPath, gitStateHash, 'file1.ts', mockAnalysis)

      const result1 = await cacheManager.getCachedFileAnalysis(repoPath, gitStateHash, 'file1.ts')
      const result2 = await cacheManager.getCachedFileAnalysis(repoPath, gitStateHash, 'file2.ts')

      expect(result1).toEqual(mockAnalysis)
      expect(result2).toBeNull()
    })
  })

  describe('cache expiration', () => {
    it('should expire cache based on TTL', async () => {
      const shortTtlCache = new CacheManager({ 
        basePath: testCacheDir, 
        ttl: 50 // 50ms
      })

      const repoPath = '/test/repo'
      const gitStateHash = 'state123'

      await shortTtlCache.setCachedCommits(repoPath, gitStateHash, [])

      // Should be cached immediately
      const immediate = await shortTtlCache.getCachedCommits(repoPath, gitStateHash)
      expect(immediate).toEqual([])

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should be expired
      const expired = await shortTtlCache.getCachedCommits(repoPath, gitStateHash)
      expect(expired).toBeNull()
    })

    it('should expire cache based on max age', async () => {
      const shortAgeCache = new CacheManager({ 
        basePath: testCacheDir, 
        maxAge: 50 // 50ms
      })

      const repoPath = '/test/repo'
      const gitStateHash = 'state123'

      await shortAgeCache.setCachedCommits(repoPath, gitStateHash, [])

      // Should be cached immediately
      const immediate = await shortAgeCache.getCachedCommits(repoPath, gitStateHash)
      expect(immediate).toEqual([])

      // Wait for max age to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should be expired
      const expired = await shortAgeCache.getCachedCommits(repoPath, gitStateHash)
      expect(expired).toBeNull()
    })
  })

  describe('cache cleanup', () => {
    it('should clean up expired entries', async () => {
      const shortTtlCache = new CacheManager({ 
        basePath: testCacheDir, 
        ttl: 10 
      })

      await shortTtlCache.setCachedCommits('/test/repo1', 'state1', [])
      await shortTtlCache.setCachedCommits('/test/repo2', 'state2', [])

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50))

      await shortTtlCache.cleanupExpired()

      // Both should be cleaned up
      const result1 = await shortTtlCache.getCachedCommits('/test/repo1', 'state1')
      const result2 = await shortTtlCache.getCachedCommits('/test/repo2', 'state2')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('cache statistics', () => {
    it('should return cache statistics', async () => {
      await cacheManager.setCachedCommits('/test/repo', 'state1', [])
      await cacheManager.setCachedFileAnalysis('/test/repo', 'state1', 'file1.ts', {
        path: 'file1.ts',
        language: 'typescript',
        complexity: 3,
        linesOfCode: 100,
        isBinary: false
      })

      const stats = await cacheManager.getCacheStats()

      expect(stats.totalFiles).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.oldestEntry).toBeLessThanOrEqual(Date.now())
      expect(stats.newestEntry).toBeLessThanOrEqual(Date.now())
    })

    it('should handle empty cache statistics', async () => {
      const stats = await cacheManager.getCacheStats()

      expect(stats.totalFiles).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.oldestEntry).toBeNull()
      expect(stats.newestEntry).toBeNull()
    })
  })

  describe('cache clearing', () => {
    it('should clear all cached data', async () => {
      await cacheManager.setCachedCommits('/test/repo1', 'state1', [])
      await cacheManager.setCachedCommits('/test/repo2', 'state2', [])

      let stats = await cacheManager.getCacheStats()
      expect(stats.totalFiles).toBe(2)

      await cacheManager.clearCache()

      stats = await cacheManager.getCacheStats()
      expect(stats.totalFiles).toBe(0)
    })
  })

  describe('git state hash generation', () => {
    it('should throw error for non-existent repository', async () => {
      // This test verifies error handling for invalid repositories
      await expect(cacheManager.getGitStateHash('/nonexistent/repo'))
        .rejects.toThrow(/Failed to spawn git process|Failed to get git state|Git command timed out/)
    }, 7000) // Allow time for timeout
  })
})