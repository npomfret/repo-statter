/**
 * Cache Manager for Repository Analysis Results
 * @module @repo-statter/core/cache/manager
 */

import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { CommitInfo } from '../types/git.js'
import { FileAnalysisResult } from '../analysis/file-analyzer.js'
import { Logger } from '../logging/logger.js'
import { RepoStatterError } from '../errors/base.js'

export class CacheError extends RepoStatterError {
  code = 'CACHE_ERROR'
  userMessage = 'Cache operation failed'
  
  constructor(message: string, originalError?: Error) {
    super(message, originalError)
    this.name = 'CacheError'
  }
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  basePath?: string
  maxSize?: number // Maximum cache size in MB
  maxAge?: number // Maximum age in milliseconds
}

export interface CacheMetadata {
  createdAt: number
  lastAccessed: number
  size: number
  gitStateHash: string
  repositoryPath: string
}

export interface CachedCommitData {
  commits: CommitInfo[]
  metadata: CacheMetadata
}

export interface CachedFileAnalysis {
  results: Map<string, FileAnalysisResult>
  metadata: CacheMetadata
}

export class CacheManager {
  private readonly logger: Logger
  private basePath: string
  private initialized = false
  
  constructor(private options: CacheOptions = {}) {
    this.logger = new Logger('CacheManager')
    this.basePath = options.basePath || join(tmpdir(), 'repo-statter-cache')
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      await fs.mkdir(this.basePath, { recursive: true })
      await fs.mkdir(join(this.basePath, 'commits'), { recursive: true })
      await fs.mkdir(join(this.basePath, 'analysis'), { recursive: true })
      
      this.logger.info('Cache manager initialized', { basePath: this.basePath })
      this.initialized = true
      
      // Clean up expired entries on startup
      await this.cleanupExpired()
    } catch (error) {
      throw new CacheError('Failed to initialize cache manager', error as Error)
    }
  }
  
  async getCachedCommits(
    repoPath: string,
    gitStateHash: string
  ): Promise<CommitInfo[] | null> {
    await this.initialize()
    
    const cacheKey = this.generateCommitCacheKey(repoPath, gitStateHash)
    const cachePath = join(this.basePath, 'commits', cacheKey)
    
    try {
      const data = await fs.readFile(cachePath, 'utf-8')
      const cached: CachedCommitData = JSON.parse(data)
      
      // Check if cache is expired
      if (this.isCacheExpired(cached.metadata)) {
        this.logger.debug('Cache expired', { cacheKey })
        await this.deleteCacheFile(cachePath)
        return null
      }
      
      // Update last accessed time
      cached.metadata.lastAccessed = Date.now()
      await fs.writeFile(cachePath, JSON.stringify(cached, null, 2))
      
      // Restore Date objects
      cached.commits.forEach(commit => {
        commit.timestamp = new Date(commit.timestamp)
      })
      
      this.logger.info('Cache hit for commits', { 
        cacheKey, 
        count: cached.commits.length,
        age: Date.now() - cached.metadata.createdAt
      })
      
      return cached.commits
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.debug('Cache miss for commits', { cacheKey })
        return null
      }
      
      this.logger.warn('Cache read error', error as Error, { cacheKey })
      return null
    }
  }
  
  async setCachedCommits(
    repoPath: string,
    gitStateHash: string,
    commits: CommitInfo[]
  ): Promise<void> {
    await this.initialize()
    
    const cacheKey = this.generateCommitCacheKey(repoPath, gitStateHash)
    const cachePath = join(this.basePath, 'commits', cacheKey)
    
    const cached: CachedCommitData = {
      commits,
      metadata: {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        size: JSON.stringify(commits).length,
        gitStateHash,
        repositoryPath: repoPath
      }
    }
    
    try {
      await fs.writeFile(cachePath, JSON.stringify(cached, null, 2))
      this.logger.info('Cache updated for commits', { 
        cacheKey, 
        count: commits.length,
        size: cached.metadata.size
      })
    } catch (error) {
      throw new CacheError('Failed to write commit cache', error as Error)
    }
  }
  
  async getCachedFileAnalysis(
    repoPath: string,
    gitStateHash: string,
    filePath: string
  ): Promise<FileAnalysisResult | null> {
    await this.initialize()
    
    const cacheKey = this.generateAnalysisCacheKey(repoPath, gitStateHash, filePath)
    const cachePath = join(this.basePath, 'analysis', cacheKey)
    
    try {
      const data = await fs.readFile(cachePath, 'utf-8')
      const cached: { result: FileAnalysisResult; metadata: CacheMetadata } = JSON.parse(data)
      
      if (this.isCacheExpired(cached.metadata)) {
        this.logger.debug('File analysis cache expired', { cacheKey })
        await this.deleteCacheFile(cachePath)
        return null
      }
      
      // Update last accessed time
      cached.metadata.lastAccessed = Date.now()
      await fs.writeFile(cachePath, JSON.stringify(cached, null, 2))
      
      this.logger.debug('Cache hit for file analysis', { 
        cacheKey, 
        filePath,
        age: Date.now() - cached.metadata.createdAt
      })
      
      return cached.result
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.debug('Cache miss for file analysis', { cacheKey, filePath })
        return null
      }
      
      this.logger.warn('File analysis cache read error', error as Error, { cacheKey })
      return null
    }
  }
  
  async setCachedFileAnalysis(
    repoPath: string,
    gitStateHash: string,
    filePath: string,
    result: FileAnalysisResult
  ): Promise<void> {
    await this.initialize()
    
    const cacheKey = this.generateAnalysisCacheKey(repoPath, gitStateHash, filePath)
    const cachePath = join(this.basePath, 'analysis', cacheKey)
    
    const cached = {
      result,
      metadata: {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        size: JSON.stringify(result).length,
        gitStateHash,
        repositoryPath: repoPath
      }
    }
    
    try {
      await fs.writeFile(cachePath, JSON.stringify(cached, null, 2))
      this.logger.debug('Cache updated for file analysis', { 
        cacheKey, 
        filePath,
        size: cached.metadata.size
      })
    } catch (error) {
      this.logger.warn('Failed to write file analysis cache', error as Error, { cacheKey })
      // Don't throw - file analysis should work without cache
    }
  }
  
  async getGitStateHash(repoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('git', ['rev-parse', 'HEAD'], { 
        cwd: repoPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000 // 5 second timeout
      })
      
      let output = ''
      let error = ''
      
      const cleanup = () => {
        if (!process.killed) {
          process.kill('SIGKILL')
        }
      }
      
      const timeout = setTimeout(() => {
        cleanup()
        reject(new CacheError('Git command timed out'))
      }, 5000)
      
      process.stdout.on('data', chunk => {
        output += chunk.toString()
      })
      
      process.stderr.on('data', chunk => {
        error += chunk.toString()
      })
      
      process.on('error', (err) => {
        clearTimeout(timeout)
        cleanup()
        reject(new CacheError(`Failed to spawn git process: ${err.message}`))
      })
      
      process.on('close', code => {
        clearTimeout(timeout)
        if (code !== 0) {
          reject(new CacheError(`Failed to get git state: ${error.trim()}`))
        } else {
          const hash = output.trim()
          // Include repository path in hash for uniqueness
          const fullHash = createHash('sha256')
            .update(repoPath)
            .update(hash)
            .digest('hex')
          
          resolve(fullHash)
        }
      })
    })
  }
  
  private generateCommitCacheKey(repoPath: string, gitStateHash: string): string {
    const hash = createHash('sha256')
    hash.update('commits')
    hash.update(repoPath)
    hash.update(gitStateHash)
    return `commits-${hash.digest('hex').substring(0, 16)}.json`
  }
  
  private generateAnalysisCacheKey(repoPath: string, gitStateHash: string, filePath: string): string {
    const hash = createHash('sha256')
    hash.update('analysis')
    hash.update(repoPath)
    hash.update(gitStateHash)
    hash.update(filePath)
    return `analysis-${hash.digest('hex').substring(0, 16)}.json`
  }
  
  private isCacheExpired(metadata: CacheMetadata): boolean {
    if (!this.options.ttl && !this.options.maxAge) {
      return false
    }
    
    const now = Date.now()
    
    // Check TTL (time since last access)
    if (this.options.ttl) {
      const timeSinceAccess = now - metadata.lastAccessed
      if (timeSinceAccess > this.options.ttl) {
        return true
      }
    }
    
    // Check max age (time since creation)
    if (this.options.maxAge) {
      const age = now - metadata.createdAt
      if (age > this.options.maxAge) {
        return true
      }
    }
    
    return false
  }
  
  private async deleteCacheFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('Failed to delete cache file', error as Error, { filePath })
      }
    }
  }
  
  async cleanupExpired(): Promise<void> {
    if (!this.initialized) return
    
    const startTime = Date.now()
    let deletedCount = 0
    
    try {
      // Clean commits cache
      const commitFiles = await fs.readdir(join(this.basePath, 'commits'))
      for (const file of commitFiles) {
        const filePath = join(this.basePath, 'commits', file)
        try {
          const data = await fs.readFile(filePath, 'utf-8')
          const cached: CachedCommitData = JSON.parse(data)
          
          if (this.isCacheExpired(cached.metadata)) {
            await this.deleteCacheFile(filePath)
            deletedCount++
          }
        } catch (error) {
          // Delete corrupted cache files
          await this.deleteCacheFile(filePath)
          deletedCount++
        }
      }
      
      // Clean analysis cache
      const analysisFiles = await fs.readdir(join(this.basePath, 'analysis'))
      for (const file of analysisFiles) {
        const filePath = join(this.basePath, 'analysis', file)
        try {
          const data = await fs.readFile(filePath, 'utf-8')
          const cached: { metadata: CacheMetadata } = JSON.parse(data)
          
          if (this.isCacheExpired(cached.metadata)) {
            await this.deleteCacheFile(filePath)
            deletedCount++
          }
        } catch (error) {
          // Delete corrupted cache files
          await this.deleteCacheFile(filePath)
          deletedCount++
        }
      }
      
      this.logger.info('Cache cleanup completed', {
        deletedCount,
        duration: Date.now() - startTime
      })
    } catch (error) {
      this.logger.error('Cache cleanup failed', error as Error)
    }
  }
  
  async getCacheStats(): Promise<{
    totalFiles: number
    totalSize: number
    oldestEntry: number | null
    newestEntry: number | null
  }> {
    await this.initialize()
    
    let totalFiles = 0
    let totalSize = 0
    let oldestEntry: number | null = null
    let newestEntry: number | null = null
    
    try {
      const commitFiles = await fs.readdir(join(this.basePath, 'commits'))
      const analysisFiles = await fs.readdir(join(this.basePath, 'analysis'))
      
      for (const file of [...commitFiles, ...analysisFiles]) {
        const dir = commitFiles.includes(file) ? 'commits' : 'analysis'
        const filePath = join(this.basePath, dir, file)
        
        try {
          const stats = await fs.stat(filePath)
          totalFiles++
          totalSize += stats.size
          
          const mtime = stats.mtime.getTime()
          if (oldestEntry === null || mtime < oldestEntry) {
            oldestEntry = mtime
          }
          if (newestEntry === null || mtime > newestEntry) {
            newestEntry = mtime
          }
        } catch (error) {
          // Skip inaccessible files
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get cache stats', error as Error)
    }
    
    return {
      totalFiles,
      totalSize,
      oldestEntry,
      newestEntry
    }
  }
  
  async clearCache(): Promise<void> {
    await this.initialize()
    
    try {
      const commitFiles = await fs.readdir(join(this.basePath, 'commits'))
      const analysisFiles = await fs.readdir(join(this.basePath, 'analysis'))
      
      await Promise.all([
        ...commitFiles.map(file => this.deleteCacheFile(join(this.basePath, 'commits', file))),
        ...analysisFiles.map(file => this.deleteCacheFile(join(this.basePath, 'analysis', file)))
      ])
      
      this.logger.info('Cache cleared', { 
        deletedFiles: commitFiles.length + analysisFiles.length 
      })
    } catch (error) {
      throw new CacheError('Failed to clear cache', error as Error)
    }
  }
}