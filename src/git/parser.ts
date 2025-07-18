import { simpleGit } from 'simple-git'
import { exec } from 'child_process'
import { promisify } from 'util'
import { validateGitRepository } from '../utils/git-validation.js'
import { parseCommitDiff as parseCommitDiffData, parseByteChanges } from '../data/git-extractor.js'
import type { ProgressReporter } from '../utils/progress-reporter.js'

const execAsync = promisify(exec)

// Assert utilities for fail-fast error handling
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
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

export async function parseCommitHistory(repoPath: string, progressReporter?: ProgressReporter, maxCommits?: number): Promise<CommitData[]> {
  // Validate input
  assert(repoPath.length > 0, 'Repository path cannot be empty')
  
  // Validate git repository
  await validateGitRepository(repoPath)
  
  const git = simpleGit(repoPath)
  
  // Test git access
  try {
    await git.status()
  } catch (error) {
    throw new Error(`Cannot access git repository: ${error instanceof Error ? error.message : String(error)}`)
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
  
  if (maxCommits) {
    logOptions.maxCount = maxCommits
  }
  
  const log = await git.log(logOptions)
  
  const commits: CommitData[] = []
  let cumulativeBytes = 0
  let processedCommits = 0
  const totalCommits = log.all.length
  
  progressReporter?.report(`Processing ${totalCommits} commits`)
  
  for (const commit of log.all) {
    const diffStats = await parseCommitDiff(repoPath, commit.hash)
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
    if (processedCommits % 100 === 0 || processedCommits === totalCommits) {
      const shortHash = commitData.sha.substring(0, 7)
      const progressMessage = `Processing commit: ${shortHash} by ${commitData.authorName} at ${commitData.date}`
      progressReporter?.report(progressMessage, processedCommits, totalCommits)
    }
  }
  
  return commits
}

export async function getCurrentFiles(repoPath: string): Promise<Set<string>> {
  assert(repoPath.length > 0, 'Repository path cannot be empty')
  
  try {
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git ls-tree -r HEAD --name-only`,
      { timeout: 10000 }
    )
    
    const files = stdout.trim().split('\n').filter(line => line.trim())
    return new Set(files)
  } catch (error) {
    throw new Error(`Failed to get current files: ${error instanceof Error ? error.message : String(error)}`)
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

async function parseCommitDiff(repoPath: string, commitHash: string): Promise<{ linesAdded: number; linesDeleted: number; bytesAdded: number; bytesDeleted: number; filesChanged: FileChange[] }> {
  const git = simpleGit(repoPath)
  
  // Check if this is the first commit
  let isFirstCommit = false
  try {
    await execAsync(`cd "${repoPath}" && git rev-parse ${commitHash}^`, { timeout: 5000 })
  } catch {
    isFirstCommit = true
  }
  
  // For first commit, use proper syntax
  const diffArgs = isFirstCommit 
    ? [`4b825dc642cb6eb9a060e54bf8d69288fbee4904..${commitHash}`]
    : [commitHash + '^!']
  
  const diffSummary = await git.diffSummary(diffArgs)
  
  // Get byte changes using git diff --stat
  const byteChanges = await getByteChanges(repoPath, commitHash)
  
  // Use the extracted pure function
  return parseCommitDiffData(diffSummary, byteChanges)
}




async function getByteChanges(repoPath: string, commitHash: string): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  // Use numstat directly for efficient byte estimation
  const { stdout } = await execAsync(
    `cd "${repoPath}" && git show ${commitHash} --numstat --format=""`,
    { timeout: 10000 }
  )
  return parseByteChanges(stdout)
}