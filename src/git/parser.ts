import { simpleGit } from 'simple-git'
import { validateGitRepository } from '../utils/git-validation.js'
import { parseCommitDiff as parseCommitDiffData } from '../data/git-extractor.js'
import type { ProgressReporter } from '../utils/progress-reporter.js'
import { GitParseError, formatError } from '../utils/errors.js'
import { generateRepositoryHash, loadCache, saveCache, clearCache } from '../cache/git-cache.js'
import type { RepoStatterConfig } from '../config/schema.js'
import { isFileExcluded } from '../utils/exclusions.js'

// Assert utilities for fail-fast error handling
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new GitParseError(message)
  }
}

export interface FileChange {
  fileName: string
  linesAdded: number
  linesDeleted: number
  fileType: string
  bytesAdded?: number
  bytesDeleted?: number
}

export interface CommitData {
  sha: string
  authorName: string
  authorEmail: string
  date: string
  message: string
  linesAdded: number
  linesDeleted: number
  bytesAdded?: number
  bytesDeleted?: number
  filesChanged: FileChange[]
}

export interface CacheOptions {
  useCache?: boolean
  clearCache?: boolean
}

export async function parseCommitHistory(repoPath: string, progressReporter: ProgressReporter | undefined, maxCommits: number | undefined, cacheOptions: CacheOptions, config: RepoStatterConfig): Promise<CommitData[]> {
  // Validate input
  assert(repoPath.length > 0, 'Repository path cannot be empty')
  
  // Validate git repository
  await validateGitRepository(repoPath)
  
  const git = simpleGit(repoPath)
  
  // Test git access
  try {
    await git.status()
  } catch (error) {
    throw new GitParseError(`Cannot access git repository: ${formatError(error)}`, error instanceof Error ? error : undefined)
  }
  
  // Generate repository hash for caching
  const repoHash = await generateRepositoryHash(repoPath)
  
  // Clear cache if requested
  if (cacheOptions.clearCache) {
    await clearCache(repoHash, config.performance.cacheDirName)
    progressReporter?.report('Cleared existing cache')
  }
  
  // Check for existing cache if caching is enabled
  let cachedCommits: CommitData[] = []
  let lastCachedSha: string | null = null
  
  if (cacheOptions.useCache !== false && !cacheOptions.clearCache && !maxCommits) {
    progressReporter?.report('Checking for cached data')
    const cache = await loadCache(repoHash, config.performance.cacheVersion, config.performance.cacheDirName)
    if (cache && cache.commits.length > 0) {
      cachedCommits = cache.commits
      lastCachedSha = cache.lastCommitSha
      progressReporter?.report(`Found cached data with ${cachedCommits.length} commits`)
    }
  }
  
  progressReporter?.report('Fetching commit history')
  
  const logOptions: any = {
    format: {
      hash: '%H',
      author_name: '%an',
      author_email: '%ae',
      date: '%ai',
      message: '%s'
    },
    strictDate: true,
    '--reverse': null
  }
  
  // If we have cached data, only fetch commits after the last cached commit
  if (lastCachedSha) {
    logOptions.from = lastCachedSha
    progressReporter?.report('Fetching new commits since last cache')
  }
  
  if (maxCommits) {
    logOptions.maxCount = maxCommits
  }
  
  const log = await git.log(logOptions)
  
  // Filter out the lastCachedSha commit if it's included (git log includes the 'from' commit)
  const newCommits = lastCachedSha 
    ? log.all.filter(commit => commit.hash !== lastCachedSha)
    : log.all
  
  // Start with cached commits
  const commits: CommitData[] = [...cachedCommits]
  let cumulativeBytes = 0
  let processedCommits = 0
  const totalNewCommits = newCommits.length
  
  if (totalNewCommits === 0 && cachedCommits.length > 0) {
    progressReporter?.report(`Using cached data: ${cachedCommits.length} commits`)
    return cachedCommits
  }
  
  progressReporter?.report(`Processing ${totalNewCommits} new commits${cachedCommits.length > 0 ? ` (${cachedCommits.length} cached)` : ''}`)
  
  for (const commit of newCommits) {
    const diffStats = await parseCommitDiff(repoPath, commit.hash, config)
    const bytesAdded = diffStats.bytesAdded ?? 0
    const bytesDeleted = diffStats.bytesDeleted ?? 0
    cumulativeBytes += (bytesAdded - bytesDeleted)
    
    // Convert git date format "YYYY-MM-DD HH:MM:SS +TZTZ" to ISO 8601
    // First replace the space between date and time with 'T'
    // Then remove the space before the timezone
    const isoDate = commit.date.replace(' ', 'T').replace(' +', '+').replace(' -', '-')
    
    const commitData = {
      sha: commit.hash,
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      date: isoDate,
      message: commit.message,
      linesAdded: diffStats.linesAdded,
      linesDeleted: diffStats.linesDeleted,
      bytesAdded,
      bytesDeleted,
      filesChanged: diffStats.filesChanged
    }
    
    commits.push(commitData)
    
    processedCommits++
    
    // Report progress every 100 commits or at the end
    if (processedCommits % 100 === 0 || processedCommits === totalNewCommits) {
      const shortHash = commitData.sha.substring(0, 7)
      const progressMessage = `Processing commit: ${shortHash} by ${commitData.authorName} at ${commitData.date}`
      progressReporter?.report(progressMessage, processedCommits, totalNewCommits)
    }
  }
  
  // Save to cache if caching is enabled and we processed new commits
  if (cacheOptions.useCache !== false && !maxCommits && (totalNewCommits > 0 || cachedCommits.length === 0)) {
    try {
      await saveCache(repoHash, commits, config.performance.cacheVersion, config.performance.cacheDirName)
      progressReporter?.report(`Cached ${commits.length} commits for future runs`)
    } catch (error) {
      // Don't fail the entire operation if caching fails
      progressReporter?.report('Warning: Failed to save cache data')
    }
  }
  
  return commits
}

export async function getCurrentFiles(repoPath: string): Promise<Set<string>> {
  assert(repoPath.length > 0, 'Repository path cannot be empty')
  
  try {
    const git = simpleGit(repoPath)
    const stdout = await git.raw(['ls-tree', '-r', 'HEAD', '--name-only'])
    
    const files = stdout.trim().split('\n').filter(line => line.trim())
    return new Set(files)
  } catch (error) {
    throw new GitParseError(`Failed to get current files: ${formatError(error)}`, error instanceof Error ? error : undefined)
  }
}

export async function getGitHubUrl(repoPath: string): Promise<string | null> {
  const git = simpleGit(repoPath)
  const remotes = await git.getRemotes(true)
  const origin = remotes.find(r => r.name === 'origin')
  if (origin && origin.refs.fetch) {
    const match = origin.refs.fetch.match(/github\.com[:/](.+?)(?:\.git)?$/)
    if (match) {
      return `https://github.com/${match[1]}`
    }
  }
  return null
}

async function parseCommitDiff(repoPath: string, commitHash: string, config: RepoStatterConfig): Promise<{ linesAdded: number; linesDeleted: number; bytesAdded: number; bytesDeleted: number; filesChanged: FileChange[] }> {
  const git = simpleGit(repoPath)
  
  // Check if this is the first commit
  let isFirstCommit = false
  try {
    await git.revparse([`${commitHash}^`])
  } catch {
    isFirstCommit = true
  }
  
  // For first commit, use proper syntax
  // 4b825dc642cb6eb9a060e54bf8d69288fbee4904 is Git's empty tree hash - represents an empty repository
  // This allows us to diff the first commit against "nothing" to see all changes introduced
  const diffArgs = isFirstCommit 
    ? [`4b825dc642cb6eb9a060e54bf8d69288fbee4904..${commitHash}`]
    : [commitHash + '^!']
  
  const diffSummary = await git.diffSummary(diffArgs)
  
  // Get byte changes using git diff --stat
  const byteChanges = await getByteChanges(repoPath, commitHash, config)
  
  // Use the extracted pure function
  return parseCommitDiffData(diffSummary, byteChanges, config)
}




async function getByteChanges(repoPath: string, commitHash: string, config: RepoStatterConfig): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  const git = simpleGit(repoPath)
  
  // Get the raw diff output with blob hashes
  const rawDiff = await git.show([commitHash, '--raw', '--format='])
  const lines = rawDiff.trim().split('\n').filter(l => l.trim())
  
  const fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> = {}
  let totalBytesAdded = 0
  let totalBytesDeleted = 0
  
  // Collect all blob hashes we need to check
  const blobsToCheck: string[] = []
  const fileInfo: Array<{ fileName: string; oldBlob: string; newBlob: string }> = []
  
  for (const line of lines) {
    // Parse raw diff format: :100644 100644 oldblob newblob M filename
    const match = line.match(/^:(\d+)\s+(\d+)\s+([0-9a-f]+)\s+([0-9a-f]+)\s+([AMDRC])\s+(.+)$/)
    if (!match) continue
    
    const [, , , oldBlob, newBlob, , fileName] = match
    
    if (!oldBlob || !newBlob || !fileName) continue
    
    // Skip excluded files
    if (isFileExcluded(fileName, config.exclusions.patterns)) continue
    
    // For deletions, oldBlob exists but newBlob is 0000000
    // For additions, oldBlob is 0000000 but newBlob exists
    // For modifications, both exist
    if (oldBlob !== '0000000' && !oldBlob.startsWith('0000000')) {
      blobsToCheck.push(oldBlob)
    }
    if (newBlob !== '0000000' && !newBlob.startsWith('0000000')) {
      blobsToCheck.push(newBlob)
    }
    
    fileInfo.push({ fileName, oldBlob, newBlob })
  }
  
  // Get sizes for all blobs
  const blobSizes: Record<string, number> = {}
  for (const blob of blobsToCheck) {
    try {
      const size = await git.raw(['cat-file', '-s', blob])
      blobSizes[blob] = parseInt(size.trim()) || 0
    } catch {
      // Blob might not exist (e.g., in shallow clones)
      blobSizes[blob] = 0
    }
  }
  
  // Calculate byte changes for each file
  for (const { fileName, oldBlob, newBlob } of fileInfo) {
    const oldSize = (oldBlob === '0000000' || oldBlob.startsWith('0000000')) ? 0 : (blobSizes[oldBlob] || 0)
    const newSize = (newBlob === '0000000' || newBlob.startsWith('0000000')) ? 0 : (blobSizes[newBlob] || 0)
    
    const bytesAdded = Math.max(0, newSize - oldSize)
    const bytesDeleted = Math.max(0, oldSize - newSize)
    
    fileChanges[fileName] = { bytesAdded, bytesDeleted }
    totalBytesAdded += bytesAdded
    totalBytesDeleted += bytesDeleted
  }
  
  return { totalBytesAdded, totalBytesDeleted, fileChanges }
}