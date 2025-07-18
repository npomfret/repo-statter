import { simpleGit } from 'simple-git'
import { exec } from 'child_process'
import { promisify } from 'util'
import { validateGitRepository } from '../utils/git-validation.js'
import { parseCommitDiff as parseCommitDiffData, parseByteChanges } from '../data/git-extractor.js'
import { isFileExcluded } from '../utils/exclusions.js'
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

export async function parseCommitHistory(repoPath: string, progressReporter?: ProgressReporter): Promise<CommitData[]> {
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
  
  const log = await git.log({
    format: {
      hash: '%H',
      author_name: '%an',
      author_email: '%ae',
      date: '%ai',
      message: '%s'
    },
    strictDate: true,
    '--reverse': null
  })
  
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
    
    commits.push({
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
    })
    
    processedCommits++
    
    // Report progress every 100 commits or at the end
    if (processedCommits % 100 === 0 || processedCommits === totalCommits) {
      progressReporter?.report('Processing commits', processedCommits, totalCommits)
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
  
  const diffSummary = await git.diffSummary([commitHash + '^!'])
  
  // Get byte changes using git diff --stat
  const byteChanges = await getByteChanges(repoPath, commitHash)
  
  // Use the extracted pure function
  return parseCommitDiffData(diffSummary, byteChanges)
}


export function parseLsTreeOutput(lsTreeOutput: string): Record<string, number> {
  const sizeMap: Record<string, number> = {}
  const lines = lsTreeOutput.trim().split('\n').filter(l => l.trim())
  
  for (const line of lines) {
    // Format: <mode> <type> <hash> <size> <path>
    const match = line.match(/^\d{6}\s+blob\s+\w+\s+(\d+)\s+(.+)$/)
    if (match && match[1] && match[2]) {
      const [, size, path] = match
      sizeMap[path] = parseInt(size) || 0
    }
  }
  
  return sizeMap
}

export function calculateByteChanges(
  currentSizes: string,
  parentSizes: string,
  changedFiles: string
): { totalBytesAdded: number; totalBytesDeleted: number; fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> } {
  const currentSizeMap = parseLsTreeOutput(currentSizes)
  const parentSizeMap = parseLsTreeOutput(parentSizes)
  
  const fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> = {}
  let totalBytesAdded = 0
  let totalBytesDeleted = 0
  
  const changes = changedFiles.trim().split('\n').filter(l => l.trim())
  
  for (const change of changes) {
    const [status, ...fileNameParts] = change.split('\t')
    const fileName = fileNameParts.join('\t')
    
    if (!fileName || isFileExcluded(fileName)) continue
    
    let bytesAdded = 0
    let bytesDeleted = 0
    
    if (status === 'A') {
      bytesAdded = currentSizeMap[fileName] || 0
    } else if (status === 'D') {
      bytesDeleted = parentSizeMap[fileName] || 0
    } else if (status === 'M') {
      const currentSize = currentSizeMap[fileName] || 0
      const parentSize = parentSizeMap[fileName] || 0
      const diff = currentSize - parentSize
      if (diff > 0) {
        bytesAdded = diff
      } else {
        bytesDeleted = -diff
      }
    }
    
    if (bytesAdded > 0 || bytesDeleted > 0) {
      fileChanges[fileName] = { bytesAdded, bytesDeleted }
      totalBytesAdded += bytesAdded
      totalBytesDeleted += bytesDeleted
    }
  }
  
  return { totalBytesAdded, totalBytesDeleted, fileChanges }
}

async function getByteChanges(repoPath: string, commitHash: string): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  try {
    // Get file sizes at current commit
    const { stdout: currentSizes } = await execAsync(
      `cd "${repoPath}" && git ls-tree -r -l ${commitHash}`,
      { timeout: 10000 }
    )
    
    // Get file sizes at parent commit (if not first commit)
    let parentSizes = ''
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git ls-tree -r -l ${commitHash}^`,
        { timeout: 10000 }
      )
      parentSizes = stdout
    } catch {
      // First commit - no parent
    }
    
    // Get list of changed files with status
    let changedFiles: string
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git diff-tree --no-commit-id --name-status -r ${commitHash}`,
      { timeout: 10000 }
    )
    
    // If no changes detected (first commit), get all files as additions
    if (!stdout.trim()) {
      const { stdout: showOutput } = await execAsync(
        `cd "${repoPath}" && git show ${commitHash} --name-status --format=""`,
        { timeout: 10000 }
      )
      changedFiles = showOutput
    } else {
      changedFiles = stdout
    }
    
    return calculateByteChanges(currentSizes, parentSizes, changedFiles)
  } catch (error) {
    console.warn(`Failed to calculate exact byte changes for ${commitHash}, falling back to estimation`)
    // Fall back to numstat estimation
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git show ${commitHash} --numstat --format=""`,
      { timeout: 10000 }
    )
    return parseByteChanges(stdout)
  }
}