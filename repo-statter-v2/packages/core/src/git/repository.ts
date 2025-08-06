/**
 * Git Repository Operations
 * @module @repo-statter/core/git/repository
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { GitBranch, GitTag } from '../types/git.js'
import { RepoStatterError } from '../errors/base.js'
import { StreamingGitParser } from './streaming-parser.js'

export class GitRepositoryError extends RepoStatterError {
  code = 'GIT_ERROR'
  userMessage = 'Git operation failed'
  
  constructor(message: string, originalError?: Error) {
    super(message, originalError)
    this.name = 'GitRepositoryError'
  }
}

export interface RepositoryInfo {
  path: string
  isValid: boolean
  currentBranch: string | null
  totalCommits: number
  remotes: string[]
}

export class GitRepository {
  private readonly repoPath: string
  private _isValid: boolean | null = null

  constructor(repoPath: string) {
    this.repoPath = resolve(repoPath)
  }

  get path(): string {
    return this.repoPath
  }

  async isValidRepository(): Promise<boolean> {
    if (this._isValid !== null) {
      return this._isValid
    }

    try {
      const gitDir = join(this.repoPath, '.git')
      const stats = await fs.stat(gitDir)
      this._isValid = stats.isDirectory()
    } catch {
      this._isValid = false
    }

    return this._isValid
  }

  async getRepositoryInfo(): Promise<RepositoryInfo> {
    const isValid = await this.isValidRepository()
    
    if (!isValid) {
      return {
        path: this.repoPath,
        isValid: false,
        currentBranch: null,
        totalCommits: 0,
        remotes: []
      }
    }

    const [currentBranch, totalCommits, remotes] = await Promise.all([
      this.getCurrentBranch(),
      this.getTotalCommitCount(),
      this.getRemotes()
    ])

    return {
      path: this.repoPath,
      isValid: true,
      currentBranch,
      totalCommits,
      remotes
    }
  }

  async getCurrentBranch(): Promise<string | null> {
    try {
      const result = await this.executeGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'])
      return result.trim() || null
    } catch {
      return null
    }
  }

  async getTotalCommitCount(): Promise<number> {
    try {
      const result = await this.executeGitCommand(['rev-list', '--count', 'HEAD'])
      return parseInt(result.trim(), 10) || 0
    } catch {
      return 0
    }
  }

  async getRemotes(): Promise<string[]> {
    try {
      const result = await this.executeGitCommand(['remote'])
      return result.trim().split('\n').filter(remote => remote.length > 0)
    } catch {
      return []
    }
  }

  async getBranches(): Promise<GitBranch[]> {
    try {
      const result = await this.executeGitCommand(['branch', '-r', '--format=%(refname:short)\t%(committerdate:iso8601)\t%(objectname)'])
      
      return result
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [name, , sha] = line.split('\t')
          return {
            name: name?.trim() || '',
            sha: sha?.trim() || '',
            isCurrent: false,
            isRemote: true
          }
        })
    } catch (error) {
      throw new GitRepositoryError('Failed to retrieve branches', error as Error)
    }
  }

  async getTags(): Promise<GitTag[]> {
    try {
      const result = await this.executeGitCommand(['tag', '--format=%(refname:short)\t%(taggerdate:iso8601)\t%(objectname)'])
      
      return result
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [name, date, sha] = line.split('\t')
          return {
            name: name?.trim() || '',
            sha: sha?.trim() || '',
            date: date ? new Date(date.trim()) : undefined
          }
        })
    } catch (error) {
      throw new GitRepositoryError('Failed to retrieve tags', error as Error)
    }
  }

  createStreamingParser(): StreamingGitParser {
    return new StreamingGitParser()
  }

  async *streamCommits(): AsyncGenerator<any, void, unknown> {
    // Simple implementation that returns mock commit data
    // In real implementation, this would spawn git log and pipe through StreamingGitParser
    const mockCommit = {
      sha: 'abc123def456',
      author: { name: 'Mock User', email: 'mock@example.com' },
      committer: { name: 'Mock User', email: 'mock@example.com' },
      date: new Date(),
      message: 'Mock commit message',
      stats: { insertions: 10, deletions: 5, files: 1 },
      files: [{
        path: 'mock-file.ts',
        insertions: 10,
        deletions: 5,
        status: 'modified' as const
      }]
    }
    
    // Yield a single mock commit for now
    yield mockCommit
  }

  private executeGitCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', args, {
        cwd: this.repoPath,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      gitProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      gitProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new GitRepositoryError(`Git command failed: git ${args.join(' ')} (exit code: ${code})`))
        }
      })

      gitProcess.on('error', (error) => {
        reject(new GitRepositoryError(`Failed to execute git command: ${error.message}`, error))
      })
    })
  }
}