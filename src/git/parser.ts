import { simpleGit } from 'simple-git'
import { extname } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { isFileExcluded } from '../utils/exclusions.js'
import { validateGitRepository } from '../utils/git-validation.js'

const execAsync = promisify(exec)

// Assert utilities for fail-fast error handling
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function assertDefined<T>(value: T | undefined | null, name: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required but was ${value}`)
  }
}

function assertNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${name} must be a valid number, got ${typeof value}: ${value}`)
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

export async function parseCommitHistory(repoPath: string): Promise<CommitData[]> {
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
  
  for (const commit of log.all) {
    const diffStats = await parseCommitDiff(repoPath, commit.hash)
    const bytesAdded = diffStats.bytesAdded ?? 0
    const bytesDeleted = diffStats.bytesDeleted ?? 0
    cumulativeBytes += (bytesAdded - bytesDeleted)
    
    commits.push({
      sha: commit.hash,
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      date: commit.date,
      message: commit.message,
      linesAdded: diffStats.linesAdded,
      linesDeleted: diffStats.linesDeleted,
      bytesAdded,
      bytesDeleted,
      filesChanged: diffStats.filesChanged
    })
    
    processedCommits++
    if (processedCommits % 25 === 0) {
      const commitInfo = commit.hash.substring(0, 7) + ' ' +
                         new Date(commit.date).toLocaleString() + ' ' +
                         commit.author_name + ': ' +
                         commit.message.substring(0, 20) + (commit.message.length > 20 ? '...' : '')
      console.log(`Processed ${processedCommits} commits: ${commitInfo}`)
    }
  }
  
  return commits
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

const FILE_TYPE_MAP = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SCSS',
  '.html': 'HTML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.swift': 'Swift',
  '.kt': 'Kotlin'
} as const

function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  return FILE_TYPE_MAP[ext as keyof typeof FILE_TYPE_MAP] ?? ext ?? 'Other'
}

async function parseCommitDiff(repoPath: string, commitHash: string): Promise<{ linesAdded: number; linesDeleted: number; bytesAdded: number; bytesDeleted: number; filesChanged: FileChange[] }> {
  const git = simpleGit(repoPath)
  
  const diffSummary = await git.diffSummary([commitHash + '^!'])
  
  // Get byte changes using git diff --stat
  const byteChanges = await getByteChanges(repoPath, commitHash)
  
  const filesChanged: FileChange[] = diffSummary.files
    .filter(file => !isFileExcluded(file.file))
    .map(file => ({
      fileName: file.file,
      linesAdded: 'insertions' in file ? file.insertions : 0,
      linesDeleted: 'deletions' in file ? file.deletions : 0,
      fileType: getFileType(file.file),
      bytesAdded: byteChanges.fileChanges[file.file]?.bytesAdded ?? 0,
      bytesDeleted: byteChanges.fileChanges[file.file]?.bytesDeleted ?? 0
    }))
  
  const linesAdded = filesChanged.reduce((sum, file) => sum + file.linesAdded, 0)
  const linesDeleted = filesChanged.reduce((sum, file) => sum + file.linesDeleted, 0)
  
  const bytesAdded = filesChanged.reduce((sum, file) => sum + (file.bytesAdded ?? 0), 0)
  const bytesDeleted = filesChanged.reduce((sum, file) => sum + (file.bytesDeleted ?? 0), 0)
  
  return { 
    linesAdded, 
    linesDeleted, 
    bytesAdded,
    bytesDeleted,
    filesChanged 
  }
}


async function getByteChanges(repoPath: string, commitHash: string): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  const { stdout } = await execAsync(`cd "${repoPath}" && git show ${commitHash} --numstat --format=""`, { 
    timeout: 10000 
  })
  
  const fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> = {}
  let totalBytesAdded = 0
  let totalBytesDeleted = 0
  
  const lines = stdout.trim().split('\n').filter(l => l.trim())
  
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 3) {
      const added = parseInt(parts[0] ?? '0')
      const deleted = parseInt(parts[1] ?? '0')
      assertNumber(added, 'lines added')
      assertNumber(deleted, 'lines deleted')
      const fileName = parts[2]
      assertDefined(fileName, 'file name in numstat output')
      
      if (!isFileExcluded(fileName)) {
        // Rough estimate: 1 line ≈ 50 bytes (average line length)
        const bytesAdded = added * 50
        const bytesDeleted = deleted * 50
        
        fileChanges[fileName] = { bytesAdded, bytesDeleted }
        totalBytesAdded += bytesAdded
        totalBytesDeleted += bytesDeleted
      }
    }
  }
  
  return { totalBytesAdded, totalBytesDeleted, fileChanges }
}