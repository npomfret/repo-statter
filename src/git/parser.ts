import { simpleGit } from 'simple-git'
import { extname } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
  totalBytes?: number
  filesChanged: FileChange[]
}

export async function parseCommitHistory(repoPath: string): Promise<CommitData[]> {
  const git = simpleGit(repoPath)
  
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
  
  for (const commit of log.all) {
    const diffStats = await parseCommitDiff(repoPath, commit.hash)
    const totalBytes = await getRepositorySize(repoPath, commit.hash)
    
    const bytesAdded = diffStats.bytesAdded || 0
    const bytesDeleted = diffStats.bytesDeleted || 0
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
      totalBytes: totalBytes || cumulativeBytes,
      filesChanged: diffStats.filesChanged
    })
  }
  
  return commits
}

export async function getGitHubUrl(repoPath: string): Promise<string | null> {
  const git = simpleGit(repoPath)
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find(r => r.name === 'origin')
    if (origin && origin.refs.fetch) {
      const match = origin.refs.fetch.match(/github\.com[:/](.+?)(?:\.git)?$/)
      if (match) {
        return `https://github.com/${match[1]}`
      }
    }
  } catch (error) {
    // Silent fail - not all repos have GitHub remotes
  }
  return null
}

function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'TypeScript'
    case '.js':
    case '.jsx':
      return 'JavaScript'
    case '.css':
      return 'CSS'
    case '.scss':
    case '.sass':
      return 'SCSS'
    case '.html':
      return 'HTML'
    case '.json':
      return 'JSON'
    case '.md':
      return 'Markdown'
    case '.py':
      return 'Python'
    case '.java':
      return 'Java'
    case '.cpp':
    case '.cc':
    case '.cxx':
      return 'C++'
    case '.c':
      return 'C'
    case '.go':
      return 'Go'
    case '.rs':
      return 'Rust'
    case '.php':
      return 'PHP'
    case '.rb':
      return 'Ruby'
    case '.swift':
      return 'Swift'
    case '.kt':
      return 'Kotlin'
    default:
      return ext || 'Other'
  }
}

async function parseCommitDiff(repoPath: string, commitHash: string): Promise<{ linesAdded: number; linesDeleted: number; bytesAdded: number; bytesDeleted: number; filesChanged: FileChange[] }> {
  const git = simpleGit(repoPath)
  
  try {
    const diffSummary = await git.diffSummary([commitHash + '^!'])
    
    // Get byte changes using git diff --stat
    const byteChanges = await getByteChanges(repoPath, commitHash)
    
    const filesChanged: FileChange[] = diffSummary.files.map(file => ({
      fileName: file.file,
      linesAdded: 'insertions' in file ? file.insertions : 0,
      linesDeleted: 'deletions' in file ? file.deletions : 0,
      fileType: getFileType(file.file),
      bytesAdded: byteChanges.fileChanges[file.file]?.bytesAdded || 0,
      bytesDeleted: byteChanges.fileChanges[file.file]?.bytesDeleted || 0
    }))
    
    const linesAdded = diffSummary.insertions
    const linesDeleted = diffSummary.deletions
    
    return { 
      linesAdded, 
      linesDeleted, 
      bytesAdded: byteChanges.totalBytesAdded,
      bytesDeleted: byteChanges.totalBytesDeleted,
      filesChanged 
    }
  } catch (error) {
    return { linesAdded: 0, linesDeleted: 0, bytesAdded: 0, bytesDeleted: 0, filesChanged: [] }
  }
}

async function getRepositorySize(repoPath: string, commitHash: string): Promise<number | null> {
  try {
    const { stdout } = await execAsync(`cd "${repoPath}" && git show ${commitHash} --name-only --format=""`, { 
      timeout: 10000 
    })
    
    if (!stdout.trim()) {
      return null
    }
    
    const files = stdout.trim().split('\n').filter(f => f.trim())
    let totalSize = 0
    
    for (const file of files) {
      try {
        const { stdout: sizeOutput } = await execAsync(`cd "${repoPath}" && git show ${commitHash}:"${file}" | wc -c`, { 
          timeout: 5000 
        })
        totalSize += parseInt(sizeOutput.trim()) || 0
      } catch {
        // Skip files that can't be read (deleted, binary, etc.)
      }
    }
    
    return totalSize
  } catch (error) {
    return null
  }
}

async function getByteChanges(repoPath: string, commitHash: string): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  try {
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
        const added = parseInt(parts[0] || '0') || 0
        const deleted = parseInt(parts[1] || '0') || 0
        const fileName = parts[2]
        
        if (fileName) {
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
  } catch (error) {
    return { totalBytesAdded: 0, totalBytesDeleted: 0, fileChanges: {} }
  }
}