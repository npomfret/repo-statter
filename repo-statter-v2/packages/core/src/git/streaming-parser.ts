/**
 * Streaming git parser for processing large repositories
 * without loading everything into memory
 */

import { Transform, TransformCallback } from 'stream'
import type { CommitInfo, FileChange } from '../types/git.js'
import { createLogger } from '../logging/logger.js'
import { ParseError } from '../errors/base.js'

const logger = createLogger('git:streaming-parser')

export interface StreamingParserOptions {
  /** Maximum number of commits to process */
  maxCommits?: number
  /** Emit progress events */
  emitProgress?: boolean
  /** Progress interval in commits */
  progressInterval?: number
}

/**
 * Streaming parser that processes git log output line by line
 * without loading the entire history into memory
 */
export class StreamingGitParser extends Transform {
  private currentCommit: Partial<CommitInfo> | null = null
  private buffer = ''
  private commitCount = 0
  private readonly maxCommits: number
  private readonly emitProgress: boolean
  private readonly progressInterval: number
  
  constructor(options: StreamingParserOptions = {}) {
    super({ objectMode: true })
    this.maxCommits = options.maxCommits ?? Infinity
    this.emitProgress = options.emitProgress ?? true
    this.progressInterval = options.progressInterval ?? 100
    
    logger.debug('StreamingGitParser initialized', {
      maxCommits: this.maxCommits,
      emitProgress: this.emitProgress,
      progressInterval: this.progressInterval
    })
  }
  
  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    try {
      this.buffer += chunk.toString()
      const lines = this.buffer.split('\n')
      
      // Keep last incomplete line in buffer
      this.buffer = lines.pop() ?? ''
      
      for (const line of lines) {
        if (this.commitCount >= this.maxCommits) {
          logger.info(`Reached maximum commits limit: ${this.maxCommits}`)
          this.push(null)
          return callback()
        }
        
        this.parseLine(line)
      }
      
      callback()
    } catch (error) {
      const parseError = new ParseError(
        `Failed to parse git output: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      )
      logger.error('Parse error in transform', parseError)
      callback(parseError)
    }
  }
  
  private parseLine(line: string): void {
    // Commit boundary
    if (line.startsWith('commit ')) {
      if (this.currentCommit?.sha) {
        this.emitCommit()
      }
      this.currentCommit = { 
        sha: line.slice(7).trim(),
        stats: {
          filesChanged: 0,
          additions: 0,
          deletions: 0,
          files: []
        }
      }
      return
    }
    
    if (!this.currentCommit) return
    
    // Parse commit metadata
    if (line.startsWith('Author: ')) {
      const match = line.match(/Author: (.*) <(.*)>/)
      if (match && match[1] && match[2]) {
        this.currentCommit.author = match[1].trim()
        this.currentCommit.email = match[2].trim()
      }
    } else if (line.startsWith('Date: ')) {
      const dateStr = line.slice(6).trim()
      this.currentCommit.timestamp = new Date(dateStr)
    } else if (line.startsWith('    ')) {
      // Commit message (indented with 4 spaces)
      const messageLine = line.slice(4)
      const currentMessage = this.currentCommit.message
      this.currentCommit.message = currentMessage 
        ? `${currentMessage}\n${messageLine}`
        : messageLine
    }
  }
  
  private emitCommit(): void {
    if (this.currentCommit && this.isCompleteCommit(this.currentCommit)) {
      const commit = this.currentCommit as CommitInfo
      
      // Ensure message is trimmed
      commit.message = commit.message.trim()
      
      this.push(commit)
      this.commitCount++
      
      logger.trace(`Emitted commit ${commit.sha.slice(0, 7)}`)
      
      // Emit progress event
      if (this.emitProgress && this.commitCount % this.progressInterval === 0) {
        this.emit('progress', {
          processed: this.commitCount,
          total: this.maxCommits === Infinity ? null : this.maxCommits,
          percentage: this.maxCommits === Infinity 
            ? null 
            : Math.round((this.commitCount / this.maxCommits) * 100)
        })
        
        logger.debug(`Progress: ${this.commitCount} commits processed`)
      }
    }
  }
  
  private isCompleteCommit(commit: Partial<CommitInfo>): commit is CommitInfo {
    return !!(
      commit.sha && 
      commit.author && 
      commit.email &&
      commit.timestamp &&
      commit.message !== undefined &&
      commit.stats
    )
  }
  
  _flush(callback: TransformCallback): void {
    try {
      // Process any remaining commit
      if (this.currentCommit?.sha) {
        this.emitCommit()
      }
      
      // Emit final progress
      if (this.emitProgress) {
        this.emit('progress', {
          processed: this.commitCount,
          total: this.commitCount,
          percentage: 100,
          complete: true
        })
      }
      
      logger.info(`Parsing complete: ${this.commitCount} commits processed`)
      callback()
    } catch (error) {
      const parseError = new ParseError(
        `Failed to flush parser: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      )
      logger.error('Error in flush', parseError)
      callback(parseError)
    }
  }
}

/**
 * Parse a file change line from git diff --numstat
 */
export function parseFileChange(line: string): FileChange | null {
  const parts = line.split('\t')
  if (parts.length < 3) return null
  
  const additionsStr = parts[0]
  const deletionsStr = parts[1]
  const path = parts[2]
  
  if (!additionsStr || !deletionsStr || !path) return null
  
  const additions = additionsStr === '-' ? 0 : parseInt(additionsStr, 10)
  const deletions = deletionsStr === '-' ? 0 : parseInt(deletionsStr, 10)
  
  // Check for binary files
  const isBinary = additionsStr === '-' && deletionsStr === '-'
  
  return {
    path,
    additions: isNaN(additions) ? 0 : additions,
    deletions: isNaN(deletions) ? 0 : deletions,
    status: 'modified',
    isBinary
  }
}

/**
 * Progress event data
 */
export interface ProgressEvent {
  /** Number of commits processed */
  processed: number
  /** Total number of commits to process (null if unknown) */
  total: number | null
  /** Percentage complete (null if total unknown) */
  percentage: number | null
  /** Processing complete flag */
  complete?: boolean
}