/**
 * Git Repository Operations
 * @module @repo-statter/core/git/repository
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { GitBranch, GitTag, CommitInfo } from '../types/git.js'
import { GitOperationError } from '../errors/base.js'
import { StreamingGitParser } from './streaming-parser.js'
import { createLogger } from '../logging/logger.js'

export interface RepositoryInfo {
  path: string
  isValid: boolean
  currentBranch: string | null
  totalCommits: number
  remotes: string[]
}

export interface GitStreamOptions {
  maxCommits?: number
  branch?: string
  since?: Date
  until?: Date
  followRenames?: boolean
  includeStats?: boolean
}

export class GitRepository {
  private readonly repoPath: string
  private _isValid: boolean | null = null
  private readonly logger = createLogger('GitRepository')

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
      throw new GitOperationError('Failed to retrieve branches', error as Error)
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
      throw new GitOperationError('Failed to retrieve tags', error as Error)
    }
  }

  createStreamingParser(): StreamingGitParser {
    return new StreamingGitParser()
  }

  async *streamCommits(options: GitStreamOptions = {}): AsyncGenerator<CommitInfo, void, unknown> {
    this.logger.info('Starting git log stream', { repoPath: this.repoPath, options })
    
    // Validate repository first
    const isValid = await this.isValidRepository()
    if (!isValid) {
      throw new GitOperationError('Not a valid git repository')
    }

    // Build git log arguments
    const args = this.buildGitLogArgs(options)
    
    // Spawn git log process
    const gitProcess = spawn('git', args, {
      cwd: this.repoPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_PAGER: '' }
    })

    // Create streaming parser
    const parser = new StreamingGitParser({
      maxCommits: options.maxCommits,
      emitProgress: true,
      progressInterval: 100
    })

    // Handle git process errors
    let gitError = ''
    gitProcess.stderr.on('data', (chunk) => {
      gitError += chunk.toString()
    })

    gitProcess.on('error', (error) => {
      this.logger.error('Git process error', error)
      parser.destroy(new GitOperationError(`Failed to start git process: ${error.message}`, error))
    })

    gitProcess.on('close', (code) => {
      if (code !== 0) {
        this.logger.error('Git process exited with error', undefined, { code, stderr: gitError })
        parser.destroy(new GitOperationError(`Git log failed (exit ${code}): ${gitError}`))
      } else {
        parser.end()
      }
    })

    // Pipe git output to parser
    gitProcess.stdout.pipe(parser, { end: false })

    let commitCount = 0
    try {
      // Yield parsed commits
      for await (const commit of parser) {
        commitCount++
        this.logger.trace(`Yielding commit ${commit.sha.slice(0, 7)}`)
        yield commit
        
        // Check if we've hit the limit
        if (options.maxCommits && commitCount >= options.maxCommits) {
          this.logger.info(`Reached commit limit: ${options.maxCommits}`)
          gitProcess.kill('SIGTERM')
          break
        }
      }
    } catch (error) {
      this.logger.error('Error streaming commits', error as Error)
      gitProcess.kill('SIGTERM')
      throw error
    } finally {
      this.logger.info(`Git log stream complete: ${commitCount} commits processed`)
    }
  }

  private buildGitLogArgs(options: GitStreamOptions): string[] {
    const args = [
      'log',
      '--format=commit %H%nAuthor: %an <%ae>%nDate: %ad%n%n%s%n%b%n',
      '--date=rfc'
    ]

    // Add numstat for file change information if requested
    if (options.includeStats !== false) {
      args.push('--numstat')
    }

    // Add branch specification
    if (options.branch) {
      args.push(options.branch)
    }

    // Add date filtering
    if (options.since) {
      args.push(`--since=${options.since.toISOString()}`)
    }
    
    if (options.until) {
      args.push(`--until=${options.until.toISOString()}`)
    }

    // Add rename following
    if (options.followRenames) {
      args.push('--follow', '-M')
    }

    this.logger.debug('Built git log args', { args })
    return args
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
          reject(new GitOperationError(`Git command failed: git ${args.join(' ')} (exit code: ${code})`))
        }
      })

      gitProcess.on('error', (error) => {
        reject(new GitOperationError(`Failed to execute git command: ${error.message}`, error))
      })
    })
  }
}