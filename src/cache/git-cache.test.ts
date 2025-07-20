import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateRepositoryHash, loadCache, saveCache, clearCache, isCacheValid } from './git-cache.js'
import type { CommitData } from '../git/parser.js'

describe('git-cache', () => {
  const testRepoPath = process.cwd() // Use current repo for testing
  let testRepoHash: string
  const TEST_CACHE_VERSION = '1.0'
  const TEST_CACHE_DIR = 'repo-statter-cache-test'
  
  beforeEach(async () => {
    testRepoHash = await generateRepositoryHash(testRepoPath)
  })
  
  afterEach(async () => {
    await clearCache(testRepoHash, TEST_CACHE_DIR)
  })

  describe('generateRepositoryHash', () => {
    it('should generate consistent hash for same repo path', async () => {
      const hash1 = await generateRepositoryHash(process.cwd())
      const hash2 = await generateRepositoryHash(process.cwd())
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different repo paths', async () => {
      const hash1 = await generateRepositoryHash(process.cwd())
      const hash2 = await generateRepositoryHash(process.cwd() + '/different')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('cache operations', () => {
    const mockCommits: CommitData[] = [
      {
        sha: 'abc123',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-20T10:00:00+0100',
        message: 'Test commit',
        linesAdded: 10,
        linesDeleted: 5,
        filesChanged: []
      }
    ]

    it('should return null for non-existent cache', async () => {
      const cache = await loadCache('nonexistent', TEST_CACHE_VERSION, TEST_CACHE_DIR)
      expect(cache).toBeNull()
    })

    it('should save and load cache data', async () => {
      await saveCache(testRepoHash, mockCommits, TEST_CACHE_VERSION, TEST_CACHE_DIR)
      const cache = await loadCache(testRepoHash, TEST_CACHE_VERSION, TEST_CACHE_DIR)
      
      expect(cache).not.toBeNull()
      expect(cache!.commits).toHaveLength(1)
      expect(cache!.commits[0]!.sha).toBe('abc123')
      expect(cache!.lastCommitSha).toBe('abc123')
    })

    it('should validate cache correctly', async () => {
      expect(await isCacheValid(testRepoHash, TEST_CACHE_VERSION, TEST_CACHE_DIR)).toBe(false)
      
      await saveCache(testRepoHash, mockCommits, TEST_CACHE_VERSION, TEST_CACHE_DIR)
      expect(await isCacheValid(testRepoHash, TEST_CACHE_VERSION, TEST_CACHE_DIR)).toBe(true)
    })

    it('should clear cache successfully', async () => {
      await saveCache(testRepoHash, mockCommits, TEST_CACHE_VERSION, TEST_CACHE_DIR)
      expect(await isCacheValid(testRepoHash, TEST_CACHE_VERSION, TEST_CACHE_DIR)).toBe(true)
      
      await clearCache(testRepoHash, TEST_CACHE_DIR)
      expect(await isCacheValid(testRepoHash, TEST_CACHE_VERSION, TEST_CACHE_DIR)).toBe(false)
    })
  })
})