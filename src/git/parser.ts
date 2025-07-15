import { simpleGit } from 'simple-git'
import { extname } from 'path'

export interface FileChange {
  fileName: string
  linesAdded: number
  linesDeleted: number
  fileType: string
}

export interface CommitData {
  sha: string
  authorName: string
  authorEmail: string
  date: string
  message: string
  linesAdded: number
  linesDeleted: number
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
  
  for (const commit of log.all) {
    const diffStats = await parseCommitDiff(repoPath, commit.hash)
    
    commits.push({
      sha: commit.hash,
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      date: commit.date,
      message: commit.message,
      linesAdded: diffStats.linesAdded,
      linesDeleted: diffStats.linesDeleted,
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

async function parseCommitDiff(repoPath: string, commitHash: string): Promise<{ linesAdded: number; linesDeleted: number; filesChanged: FileChange[] }> {
  const git = simpleGit(repoPath)
  
  try {
    const diffSummary = await git.diffSummary([commitHash + '^!'])
    
    const filesChanged: FileChange[] = diffSummary.files.map(file => ({
      fileName: file.file,
      linesAdded: 'insertions' in file ? file.insertions : 0,
      linesDeleted: 'deletions' in file ? file.deletions : 0,
      fileType: getFileType(file.file)
    }))
    
    const linesAdded = diffSummary.insertions
    const linesDeleted = diffSummary.deletions
    
    return { linesAdded, linesDeleted, filesChanged }
  } catch (error) {
    return { linesAdded: 0, linesDeleted: 0, filesChanged: [] }
  }
}