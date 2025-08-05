# Phase 2: Git Operations and Data Extraction

## Overview
Implement robust, streaming git operations that can handle repositories of any size without memory issues. This phase focuses on extracting data from git efficiently and reliably.

## Goals
1. Create streaming git log parser
2. Implement file content analysis
3. Build complexity calculation
4. Create efficient caching layer
5. Handle all edge cases gracefully

## Tasks

### 2.1 Streaming Git Log Parser

#### Description
Parse git log output in a streaming fashion to handle large repositories without loading everything into memory.

#### packages/core/src/git/GitStreamReader.ts
```typescript
import { spawn } from 'child_process'
import { Readable } from 'stream'
import { CommitInfo, FileChange } from '../types/git'
import { GitOperationError } from '../errors/base'
import { Logger } from '../logging/logger'

export interface GitStreamOptions {
  maxCommits?: number
  startDate?: Date
  endDate?: Date
  branch?: string
  followRenames?: boolean
}

export class GitStreamReader {
  private logger = new Logger('GitStreamReader')
  
  async *streamCommits(
    repoPath: string,
    options: GitStreamOptions = {}
  ): AsyncGenerator<CommitInfo, void, unknown> {
    this.logger.info('Starting commit stream', { repoPath, options })
    
    const args = this.buildGitArgs(options)
    const process = spawn('git', args, {
      cwd: repoPath,
      env: { ...process.env, GIT_PAGER: '' }
    })
    
    let buffer = ''
    let commitCount = 0
    
    for await (const chunk of process.stdout) {
      buffer += chunk.toString()
      
      // Parse complete commits from buffer
      const commits = this.parseCommitsFromBuffer(buffer)
      buffer = commits.remainder
      
      for (const commit of commits.parsed) {
        commitCount++
        if (options.maxCommits && commitCount > options.maxCommits) {
          process.kill()
          return
        }
        
        yield commit
      }
    }
    
    // Handle any remaining data
    if (buffer.trim()) {
      const finalCommits = this.parseCommitsFromBuffer(buffer + '\n')
      for (const commit of finalCommits.parsed) {
        yield commit
      }
    }
    
    // Check for errors
    const errorOutput = await this.streamToString(process.stderr)
    if (errorOutput) {
      throw new GitOperationError(`Git command failed: ${errorOutput}`)
    }
    
    this.logger.info('Commit stream complete', { commitCount })
  }
  
  private buildGitArgs(options: GitStreamOptions): string[] {
    const args = [
      'log',
      '--format=COMMIT_START%n%H%n%an%n%ae%n%at%n%P%n%s%n%b%nCOMMIT_END',
      '--numstat',
      '--no-merges'
    ]
    
    if (options.followRenames) {
      args.push('--follow', '-M')
    }
    
    if (options.startDate) {
      args.push(`--since=${options.startDate.toISOString()}`)
    }
    
    if (options.endDate) {
      args.push(`--until=${options.endDate.toISOString()}`)
    }
    
    if (options.branch) {
      args.push(options.branch)
    }
    
    return args
  }
  
  private parseCommitsFromBuffer(buffer: string): {
    parsed: CommitInfo[]
    remainder: string
  } {
    const commits: CommitInfo[] = []
    const parts = buffer.split('COMMIT_START')
    
    // First part is before any commits
    parts.shift()
    
    // Last part might be incomplete
    const remainder = parts.pop() || ''
    
    for (const part of parts) {
      const commit = this.parseCommit(part)
      if (commit) {
        commits.push(commit)
      }
    }
    
    return { parsed: commits, remainder: 'COMMIT_START' + remainder }
  }
  
  private parseCommit(text: string): CommitInfo | null {
    const lines = text.split('\n')
    const endIndex = lines.indexOf('COMMIT_END')
    if (endIndex === -1) return null
    
    const [sha, author, email, timestamp, _parent, ...messageLines] = lines
    const message = messageLines.slice(0, endIndex - 5).join('\n').trim()
    
    // Parse numstat data
    const numstatLines = lines.slice(endIndex + 1).filter(line => line.trim())
    const files = this.parseNumstat(numstatLines)
    
    return {
      sha: sha.trim(),
      author: author.trim(),
      email: email.trim(),
      timestamp: new Date(parseInt(timestamp.trim()) * 1000),
      message,
      stats: {
        filesChanged: files.length,
        additions: files.reduce((sum, f) => sum + f.additions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0),
        files
      }
    }
  }
  
  private parseNumstat(lines: string[]): FileChange[] {
    return lines
      .map(line => {
        const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/)
        if (!match) return null
        
        const [, additions, deletions, path] = match
        
        // Handle renames
        const renameParts = path.split(' => ')
        if (renameParts.length === 2) {
          return {
            path: renameParts[1],
            oldPath: renameParts[0],
            additions: additions === '-' ? 0 : parseInt(additions),
            deletions: deletions === '-' ? 0 : parseInt(deletions),
            status: 'renamed' as const
          }
        }
        
        return {
          path,
          additions: additions === '-' ? 0 : parseInt(additions),
          deletions: deletions === '-' ? 0 : parseInt(deletions),
          status: 'modified' as const
        }
      })
      .filter((f): f is FileChange => f !== null)
  }
  
  private async streamToString(stream: Readable): Promise<string> {
    let result = ''
    for await (const chunk of stream) {
      result += chunk.toString()
    }
    return result
  }
}
```

#### Testing
```typescript
describe('GitStreamReader', () => {
  it('should stream commits from a repository', async () => {
    const reader = new GitStreamReader()
    const commits: CommitInfo[] = []
    
    for await (const commit of reader.streamCommits('./test-repo')) {
      commits.push(commit)
    }
    
    expect(commits).toHaveLength(100)
    expect(commits[0]).toHaveProperty('sha')
    expect(commits[0]).toHaveProperty('author')
    expect(commits[0].stats.files).toBeInstanceOf(Array)
  })
  
  it('should respect maxCommits option', async () => {
    const reader = new GitStreamReader()
    const commits: CommitInfo[] = []
    
    for await (const commit of reader.streamCommits('./test-repo', { maxCommits: 10 })) {
      commits.push(commit)
    }
    
    expect(commits).toHaveLength(10)
  })
  
  it('should handle rename detection', async () => {
    const reader = new GitStreamReader()
    const commits: CommitInfo[] = []
    
    for await (const commit of reader.streamCommits('./test-repo', { followRenames: true })) {
      commits.push(commit)
    }
    
    const renameCommit = commits.find(c => 
      c.stats.files.some(f => f.status === 'renamed')
    )
    expect(renameCommit).toBeDefined()
  })
})
```

### 2.2 File Content Analyzer

#### Description
Analyze file contents at specific commits to calculate current lines of code and complexity.

#### packages/core/src/git/FileAnalyzer.ts
```typescript
import { spawn } from 'child_process'
import { FileMetrics } from '../types/analysis'
import { Logger } from '../logging/logger'

export class FileAnalyzer {
  private logger = new Logger('FileAnalyzer')
  private fileCache = new Map<string, string>()
  
  async analyzeFileAtCommit(
    repoPath: string,
    filePath: string,
    commitSha: string
  ): Promise<Partial<FileMetrics>> {
    const cacheKey = `${commitSha}:${filePath}`
    
    // Check cache
    let content = this.fileCache.get(cacheKey)
    if (!content) {
      content = await this.getFileContent(repoPath, filePath, commitSha)
      this.fileCache.set(cacheKey, content)
    }
    
    const lines = content.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim().length > 0)
    
    return {
      path: filePath,
      currentLines: lines.length,
      complexity: this.calculateComplexity(content, filePath)
    }
  }
  
  private async getFileContent(
    repoPath: string,
    filePath: string,
    commitSha: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('git', ['show', `${commitSha}:${filePath}`], {
        cwd: repoPath
      })
      
      let content = ''
      let error = ''
      
      process.stdout.on('data', chunk => {
        content += chunk.toString()
      })
      
      process.stderr.on('data', chunk => {
        error += chunk.toString()
      })
      
      process.on('close', code => {
        if (code !== 0) {
          // File might not exist at this commit
          resolve('')
        } else {
          resolve(content)
        }
      })
    })
  }
  
  private calculateComplexity(content: string, filePath: string): number {
    const ext = filePath.split('.').pop()?.toLowerCase()
    
    if (!ext || !this.isCodeFile(ext)) {
      return 0
    }
    
    // Simple cyclomatic complexity calculation
    let complexity = 1 // Base complexity
    
    // Count decision points
    const patterns = {
      typescript: [
        /\bif\s*\(/g,
        /\belse\s+if\s*\(/g,
        /\bwhile\s*\(/g,
        /\bfor\s*\(/g,
        /\bcase\s+/g,
        /\bcatch\s*\(/g,
        /\?\s*[^:]+\s*:/g, // ternary operator
        /&&/g,
        /\|\|/g
      ],
      python: [
        /\bif\s+/g,
        /\belif\s+/g,
        /\bwhile\s+/g,
        /\bfor\s+/g,
        /\bexcept\s*:/g,
        /\band\b/g,
        /\bor\b/g
      ]
    }
    
    const languagePatterns = this.getLanguagePatterns(ext)
    
    for (const pattern of languagePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        complexity += matches.length
      }
    }
    
    return complexity
  }
  
  private isCodeFile(ext: string): boolean {
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'rb', 'go', 'rs', 'php']
    return codeExtensions.includes(ext)
  }
  
  private getLanguagePatterns(ext: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      js: this.getJSPatterns(),
      ts: this.getJSPatterns(),
      jsx: this.getJSPatterns(),
      tsx: this.getJSPatterns(),
      py: this.getPythonPatterns(),
      // Add more languages as needed
    }
    
    return patterns[ext] || []
  }
  
  private getJSPatterns(): RegExp[] {
    return [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*[^:]+\s*:/g,
      /&&/g,
      /\|\|/g
    ]
  }
  
  private getPythonPatterns(): RegExp[] {
    return [
      /\bif\s+/g,
      /\belif\s+/g,
      /\bwhile\s+/g,
      /\bfor\s+/g,
      /\bexcept\s*:/g,
      /\band\b/g,
      /\bor\b/g
    ]
  }
}
```

#### Testing
```typescript
describe('FileAnalyzer', () => {
  it('should analyze file content', async () => {
    const analyzer = new FileAnalyzer()
    const metrics = await analyzer.analyzeFileAtCommit(
      './test-repo',
      'src/index.ts',
      'abc123'
    )
    
    expect(metrics.currentLines).toBeGreaterThan(0)
    expect(metrics.complexity).toBeGreaterThan(0)
  })
  
  it('should calculate complexity correctly', async () => {
    // Test with known code samples
    const analyzer = new FileAnalyzer()
    const simpleFile = await analyzer.analyzeFileAtCommit(
      './test-repo',
      'src/simple.ts',
      'abc123'
    )
    const complexFile = await analyzer.analyzeFileAtCommit(
      './test-repo',
      'src/complex.ts',
      'abc123'
    )
    
    expect(complexFile.complexity).toBeGreaterThan(simpleFile.complexity!)
  })
})
```

### 2.3 Repository Information Extractor

#### Description
Extract basic repository information and validate git repository.

#### packages/core/src/git/RepositoryInfo.ts
```typescript
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { RepositoryInfo } from '../types/git'
import { GitOperationError } from '../errors/base'

export class RepositoryInfoExtractor {
  async getRepositoryInfo(repoPath: string): Promise<RepositoryInfo> {
    // Validate it's a git repository
    await this.validateGitRepository(repoPath)
    
    const [name, remote, branch, totalCommits, firstCommit, lastCommit] = await Promise.all([
      this.getRepositoryName(repoPath),
      this.getRemoteUrl(repoPath),
      this.getCurrentBranch(repoPath),
      this.getTotalCommitCount(repoPath),
      this.getFirstCommit(repoPath),
      this.getLastCommit(repoPath)
    ])
    
    return {
      path: repoPath,
      name,
      remote,
      branch,
      totalCommits,
      firstCommitDate: firstCommit.date,
      lastCommitDate: lastCommit.date
    }
  }
  
  private async validateGitRepository(repoPath: string): Promise<void> {
    try {
      await fs.access(join(repoPath, '.git'))
    } catch {
      throw new GitOperationError('Not a git repository')
    }
    
    // Check if git is available
    try {
      await this.runGitCommand(repoPath, ['--version'])
    } catch {
      throw new GitOperationError('Git is not installed or not in PATH')
    }
  }
  
  private async getRepositoryName(repoPath: string): Promise<string> {
    const parts = repoPath.split(/[/\\]/)
    return parts[parts.length - 1] || 'unknown'
  }
  
  private async getRemoteUrl(repoPath: string): Promise<string | undefined> {
    try {
      const output = await this.runGitCommand(repoPath, ['remote', 'get-url', 'origin'])
      return output.trim()
    } catch {
      return undefined
    }
  }
  
  private async getCurrentBranch(repoPath: string): Promise<string> {
    const output = await this.runGitCommand(repoPath, ['branch', '--show-current'])
    return output.trim() || 'HEAD'
  }
  
  private async getTotalCommitCount(repoPath: string): Promise<number> {
    const output = await this.runGitCommand(repoPath, ['rev-list', '--count', 'HEAD'])
    return parseInt(output.trim())
  }
  
  private async getFirstCommit(repoPath: string): Promise<{ sha: string; date: Date }> {
    const output = await this.runGitCommand(repoPath, [
      'log', '--reverse', '--format=%H|%at', '-1'
    ])
    const [sha, timestamp] = output.trim().split('|')
    return {
      sha,
      date: new Date(parseInt(timestamp) * 1000)
    }
  }
  
  private async getLastCommit(repoPath: string): Promise<{ sha: string; date: Date }> {
    const output = await this.runGitCommand(repoPath, [
      'log', '--format=%H|%at', '-1'
    ])
    const [sha, timestamp] = output.trim().split('|')
    return {
      sha,
      date: new Date(parseInt(timestamp) * 1000)
    }
  }
  
  private runGitCommand(cwd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('git', args, { cwd })
      let stdout = ''
      let stderr = ''
      
      process.stdout.on('data', chunk => {
        stdout += chunk.toString()
      })
      
      process.stderr.on('data', chunk => {
        stderr += chunk.toString()
      })
      
      process.on('close', code => {
        if (code !== 0) {
          reject(new GitOperationError(`Git command failed: ${stderr}`))
        } else {
          resolve(stdout)
        }
      })
    })
  }
}
```

### 2.4 Caching Layer

#### Description
Implement efficient caching for processed commit data.

#### packages/core/src/cache/CacheManager.ts
```typescript
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { CommitInfo } from '../types/git'
import { Logger } from '../logging/logger'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  basePath?: string
}

export class CacheManager {
  private logger = new Logger('CacheManager')
  private basePath: string
  
  constructor(private options: CacheOptions = {}) {
    this.basePath = options.basePath || join(tmpdir(), 'repo-statter-cache')
  }
  
  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true })
  }
  
  async getCachedCommits(
    repoPath: string,
    gitStateHash: string
  ): Promise<CommitInfo[] | null> {
    const cacheKey = this.generateCacheKey(repoPath, gitStateHash)
    const cachePath = join(this.basePath, cacheKey)
    
    try {
      const stats = await fs.stat(cachePath)
      
      // Check if cache is expired
      if (this.options.ttl) {
        const age = Date.now() - stats.mtime.getTime()
        if (age > this.options.ttl) {
          this.logger.debug('Cache expired', { cacheKey, age })
          return null
        }
      }
      
      const data = await fs.readFile(cachePath, 'utf-8')
      const commits = JSON.parse(data) as CommitInfo[]
      
      // Restore Date objects
      commits.forEach(commit => {
        commit.timestamp = new Date(commit.timestamp)
      })
      
      this.logger.info('Cache hit', { cacheKey, count: commits.length })
      return commits
    } catch {
      this.logger.debug('Cache miss', { cacheKey })
      return null
    }
  }
  
  async setCachedCommits(
    repoPath: string,
    gitStateHash: string,
    commits: CommitInfo[]
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(repoPath, gitStateHash)
    const cachePath = join(this.basePath, cacheKey)
    
    await fs.writeFile(cachePath, JSON.stringify(commits, null, 2))
    this.logger.info('Cache updated', { cacheKey, count: commits.length })
  }
  
  async getGitStateHash(repoPath: string): Promise<string> {
    // Get hash of current git state (HEAD + config)
    const { spawn } = await import('child_process')
    
    return new Promise((resolve, reject) => {
      const process = spawn('git', ['rev-parse', 'HEAD'], { cwd: repoPath })
      let output = ''
      
      process.stdout.on('data', chunk => {
        output += chunk.toString()
      })
      
      process.on('close', code => {
        if (code !== 0) {
          reject(new Error('Failed to get git state'))
        } else {
          resolve(output.trim())
        }
      })
    })
  }
  
  private generateCacheKey(repoPath: string, gitStateHash: string): string {
    const hash = createHash('sha256')
    hash.update(repoPath)
    hash.update(gitStateHash)
    return `commits-${hash.digest('hex')}.json`
  }
  
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.basePath)
      await Promise.all(
        files.map(file => fs.unlink(join(this.basePath, file)))
      )
      this.logger.info('Cache cleared')
    } catch (error) {
      this.logger.error('Failed to clear cache', error as Error)
    }
  }
}
```

#### Testing
```typescript
describe('CacheManager', () => {
  let cache: CacheManager
  
  beforeEach(async () => {
    cache = new CacheManager({ basePath: './test-cache' })
    await cache.initialize()
  })
  
  afterEach(async () => {
    await cache.clearCache()
  })
  
  it('should cache and retrieve commits', async () => {
    const commits: CommitInfo[] = [
      {
        sha: 'abc123',
        author: 'Test Author',
        email: 'test@example.com',
        timestamp: new Date(),
        message: 'Test commit',
        stats: {
          filesChanged: 1,
          additions: 10,
          deletions: 5,
          files: []
        }
      }
    ]
    
    await cache.setCachedCommits('./test-repo', 'hash123', commits)
    const retrieved = await cache.getCachedCommits('./test-repo', 'hash123')
    
    expect(retrieved).toEqual(commits)
  })
  
  it('should return null for expired cache', async () => {
    const cache = new CacheManager({ ttl: 1 }) // 1ms TTL
    await cache.initialize()
    
    await cache.setCachedCommits('./test-repo', 'hash123', [])
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const retrieved = await cache.getCachedCommits('./test-repo', 'hash123')
    expect(retrieved).toBeNull()
  })
})
```

### 2.5 File Filter Implementation

#### Description
Implement configurable file filtering to exclude certain paths from analysis.

#### packages/core/src/git/FileFilter.ts
```typescript
import { minimatch } from 'minimatch'

export interface FileFilterConfig {
  exclude?: string[]
  include?: string[]
  excludeBinary?: boolean
  maxFileSize?: number
}

export class FileFilter {
  private excludePatterns: string[]
  private includePatterns: string[]
  
  constructor(private config: FileFilterConfig = {}) {
    this.excludePatterns = config.exclude || []
    this.includePatterns = config.include || []
  }
  
  shouldIncludeFile(filePath: string, fileSize?: number): boolean {
    // Check size limit
    if (this.config.maxFileSize && fileSize && fileSize > this.config.maxFileSize) {
      return false
    }
    
    // Check include patterns first
    if (this.includePatterns.length > 0) {
      const included = this.includePatterns.some(pattern => 
        minimatch(filePath, pattern, { matchBase: true })
      )
      if (!included) return false
    }
    
    // Check exclude patterns
    const excluded = this.excludePatterns.some(pattern => 
      minimatch(filePath, pattern, { matchBase: true })
    )
    if (excluded) return false
    
    // Check binary files
    if (this.config.excludeBinary && this.isBinaryFile(filePath)) {
      return false
    }
    
    return true
  }
  
  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.7z',
      '.exe', '.dll', '.so', '.dylib',
      '.ttf', '.woff', '.woff2', '.eot',
      '.mp3', '.mp4', '.avi', '.mov',
      '.sqlite', '.db'
    ]
    
    const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0]
    return ext ? binaryExtensions.includes(ext) : false
  }
}
```

#### Testing
```typescript
describe('FileFilter', () => {
  it('should filter excluded files', () => {
    const filter = new FileFilter({
      exclude: ['node_modules/**', '*.test.ts']
    })
    
    expect(filter.shouldIncludeFile('src/index.ts')).toBe(true)
    expect(filter.shouldIncludeFile('node_modules/package/index.js')).toBe(false)
    expect(filter.shouldIncludeFile('src/index.test.ts')).toBe(false)
  })
  
  it('should respect include patterns', () => {
    const filter = new FileFilter({
      include: ['src/**/*.ts']
    })
    
    expect(filter.shouldIncludeFile('src/index.ts')).toBe(true)
    expect(filter.shouldIncludeFile('test/index.ts')).toBe(false)
    expect(filter.shouldIncludeFile('src/components/Button.tsx')).toBe(false)
  })
  
  it('should filter binary files', () => {
    const filter = new FileFilter({
      excludeBinary: true
    })
    
    expect(filter.shouldIncludeFile('image.png')).toBe(false)
    expect(filter.shouldIncludeFile('document.pdf')).toBe(false)
    expect(filter.shouldIncludeFile('index.ts')).toBe(true)
  })
})
```

## Integration Test

#### packages/core/src/git/__tests__/integration.test.ts
```typescript
describe('Git Operations Integration', () => {
  it('should process a complete repository', async () => {
    const repoPath = './test-fixtures/sample-repo'
    
    // Get repository info
    const infoExtractor = new RepositoryInfoExtractor()
    const repoInfo = await infoExtractor.getRepositoryInfo(repoPath)
    
    expect(repoInfo.name).toBe('sample-repo')
    expect(repoInfo.totalCommits).toBeGreaterThan(0)
    
    // Stream commits
    const reader = new GitStreamReader()
    const commits: CommitInfo[] = []
    
    for await (const commit of reader.streamCommits(repoPath)) {
      commits.push(commit)
    }
    
    expect(commits).toHaveLength(repoInfo.totalCommits)
    
    // Analyze files
    const analyzer = new FileAnalyzer()
    const latestCommit = commits[0]
    
    for (const file of latestCommit.stats.files) {
      const metrics = await analyzer.analyzeFileAtCommit(
        repoPath,
        file.path,
        latestCommit.sha
      )
      
      expect(metrics.currentLines).toBeDefined()
      expect(metrics.complexity).toBeDefined()
    }
  })
})
```

## Deliverables

1. **GitStreamReader**: Streaming git log parser that handles large repos
2. **FileAnalyzer**: Analyzes file content and calculates complexity
3. **RepositoryInfoExtractor**: Gets basic repository information
4. **CacheManager**: Efficient caching layer for processed data
5. **FileFilter**: Configurable file filtering system

## Success Criteria

- [ ] Can stream 100k+ commits without running out of memory
- [ ] Properly handles file renames and deletions
- [ ] Calculates complexity for major languages
- [ ] Cache speeds up repeated runs by 50%+
- [ ] All edge cases handled gracefully
- [ ] 100% test coverage for critical paths

## Next Phase

With git operations in place, Phase 3 will build the analysis engine that processes this data into meaningful insights.