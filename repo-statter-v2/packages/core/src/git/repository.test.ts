/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GitRepository, GitRepositoryError } from './repository.js'
import { promises as fs } from 'fs'
import { spawn } from 'child_process'

vi.mock('fs', () => ({
  promises: {
    stat: vi.fn()
  }
}))

vi.mock('child_process')

describe('GitRepository', () => {
  let repository: GitRepository
  const mockRepoPath = '/test/repo'

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new GitRepository(mockRepoPath)
  })

  describe('constructor', () => {
    it('should set the repository path', () => {
      expect(repository.path).toBe(mockRepoPath)
    })

    it('should resolve relative paths', () => {
      const relativeRepo = new GitRepository('./test')
      expect(relativeRepo.path).toMatch(/test$/)
    })
  })

  describe('isValidRepository', () => {
    it('should return true for valid git repository', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true
      } as any)

      const isValid = await repository.isValidRepository()
      expect(isValid).toBe(true)
    })

    it('should return false for invalid git repository', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))

      const isValid = await repository.isValidRepository()
      expect(isValid).toBe(false)
    })

    it('should cache validation result', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true
      } as any)

      await repository.isValidRepository()
      await repository.isValidRepository()

      expect(fs.stat).toHaveBeenCalledTimes(1)
    })
  })

  describe('getRepositoryInfo', () => {
    it('should return invalid info for non-git directory', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))

      const info = await repository.getRepositoryInfo()
      expect(info).toEqual({
        path: mockRepoPath,
        isValid: false,
        currentBranch: null,
        totalCommits: 0,
        remotes: []
      })
    })

    it('should return complete info for valid repository', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true
      } as any)

      const mockSpawn = vi.mocked(spawn)
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      // Mock git commands
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback(0)
        }
      })

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // Simulate different git commands based on call order
          callback('main\n') // current branch
          callback('42\n')   // commit count
          callback('origin\n') // remotes
        }
      })

      const info = await repository.getRepositoryInfo()
      expect(info.isValid).toBe(true)
      expect(info.path).toBe(mockRepoPath)
    })
  })

  describe('git command execution', () => {
    it('should handle git command errors gracefully', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true
      } as any)

      const mockSpawn = vi.mocked(spawn)
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback(128) // Git error exit code
        }
      })

      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback('fatal: not a git repository\n')
        }
      })

      await expect(repository.getBranches()).rejects.toThrow(GitRepositoryError)
    })

    it('should handle process spawn errors', async () => {
      const mockSpawn = vi.mocked(spawn)
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('spawn ENOENT'))
        }
      })

      await expect(repository.getBranches()).rejects.toThrow(GitRepositoryError)
    })
  })

  describe('createStreamingParser', () => {
    it('should create a streaming parser with repository path', () => {
      const parser = repository.createStreamingParser()
      expect(parser).toBeDefined()
    })

    it('should pass config to streaming parser', () => {
      const config = { maxCommits: 100 }
      const parser = repository.createStreamingParser(config)
      expect(parser).toBeDefined()
    })
  })

  describe('streamCommits', () => {
    it('should create async generator for commits', async () => {
      const commitStream = repository.streamCommits()
      expect(commitStream).toBeDefined()
      expect(typeof commitStream[Symbol.asyncIterator]).toBe('function')
    })
  })
})