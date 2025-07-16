import type { CommitData } from '../git/parser.js'

export interface ContributorStats {
  name: string
  commits: number
  linesAdded: number
  linesDeleted: number
}

export interface CommitAward {
  sha: string
  authorName: string
  date: string
  message: string
  value: number
}

export interface FileTypeStats {
  type: string
  lines: number
  percentage: number
}

export interface FileHeatData {
  fileName: string
  heatScore: number
  commitCount: number
  lastModified: string
  totalLines: number
  fileType: string
}

export function getContributorStats(commits: CommitData[]): ContributorStats[] {
  const contributorMap = new Map<string, ContributorStats>()
  
  for (const commit of commits) {
    if (!contributorMap.has(commit.authorName)) {
      contributorMap.set(commit.authorName, {
        name: commit.authorName,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0
      })
    }
    
    const existing = contributorMap.get(commit.authorName)!
    existing.commits += 1
    existing.linesAdded += commit.linesAdded
    existing.linesDeleted += commit.linesDeleted
  }
  
  return Array.from(contributorMap.values())
    .sort((a, b) => b.commits - a.commits)
}

export function getFileTypeStats(commits: CommitData[]): FileTypeStats[] {
  const fileTypeMap = new Map<string, number>()
  
  for (const commit of commits) {
    for (const fileChange of commit.filesChanged) {
      const existing = fileTypeMap.get(fileChange.fileType) ?? 0
      fileTypeMap.set(fileChange.fileType, existing + fileChange.linesAdded)
    }
  }
  
  const total = Array.from(fileTypeMap.values()).reduce((sum, lines) => sum + lines, 0)
  
  return Array.from(fileTypeMap.entries())
    .map(([type, lines]) => ({
      type,
      lines,
      percentage: total > 0 ? (lines / total) * 100 : 0
    }))
    .sort((a, b) => b.lines - a.lines)
}

export function getFileHeatData(commits: CommitData[]): FileHeatData[] {
  const fileMap = new Map<string, { commitCount: number; lastModified: Date; totalLines: number; fileType: string }>()
  
  for (const commit of commits) {
    const commitDate = new Date(commit.date)
    
    for (const fileChange of commit.filesChanged) {
      const existing = fileMap.get(fileChange.fileName)
      
      if (!existing) {
        fileMap.set(fileChange.fileName, {
          commitCount: 1,
          lastModified: commitDate,
          totalLines: fileChange.linesAdded,
          fileType: fileChange.fileType
        })
      } else {
        existing.commitCount += 1
        existing.totalLines += fileChange.linesAdded
        if (commitDate > existing.lastModified) {
          existing.lastModified = commitDate
        }
      }
    }
  }
  
  const now = new Date()
  const results: FileHeatData[] = []
  
  for (const [fileName, data] of fileMap.entries()) {
    const daysSinceLastModification = (now.getTime() - data.lastModified.getTime()) / (1000 * 60 * 60 * 24)
    const frequency = data.commitCount
    const recency = Math.exp(-daysSinceLastModification / 30)
    const heatScore = (frequency * 0.4) + (recency * 0.6)
    
    results.push({
      fileName,
      heatScore,
      commitCount: data.commitCount,
      lastModified: data.lastModified.toISOString(),
      totalLines: Math.max(data.totalLines, 1),
      fileType: data.fileType
    })
  }
  
  return results.sort((a, b) => b.heatScore - a.heatScore)
}

function isRealCommit(commit: CommitData): boolean {
  const message = commit.message.toLowerCase()
  return !message.startsWith('merge remote-tracking branch') && 
         !message.startsWith('merge branch') &&
         !message.startsWith('resolved conflicts') &&
         !message.includes('merge pull request')
}

export function getTopCommitsByFilesModified(commits: CommitData[]): CommitAward[] {
  return commits
    .filter(isRealCommit)
    .map(commit => ({
      sha: commit.sha,
      authorName: commit.authorName,
      date: commit.date,
      message: commit.message,
      value: commit.filesChanged.length
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function getTopCommitsByBytesAdded(commits: CommitData[]): CommitAward[] {
  return commits
    .filter(commit => commit.bytesAdded !== undefined && isRealCommit(commit))
    .map(commit => ({
      sha: commit.sha,
      authorName: commit.authorName,
      date: commit.date,
      message: commit.message,
      value: commit.bytesAdded || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function getTopCommitsByBytesRemoved(commits: CommitData[]): CommitAward[] {
  return commits
    .filter(commit => commit.bytesDeleted !== undefined && isRealCommit(commit))
    .map(commit => ({
      sha: commit.sha,
      authorName: commit.authorName,
      date: commit.date,
      message: commit.message,
      value: commit.bytesDeleted || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function getTopCommitsByLinesAdded(commits: CommitData[]): CommitAward[] {
  return commits
    .filter(isRealCommit)
    .map(commit => ({
      sha: commit.sha,
      authorName: commit.authorName,
      date: commit.date,
      message: commit.message,
      value: commit.linesAdded
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function getTopCommitsByLinesRemoved(commits: CommitData[]): CommitAward[] {
  return commits
    .filter(isRealCommit)
    .map(commit => ({
      sha: commit.sha,
      authorName: commit.authorName,
      date: commit.date,
      message: commit.message,
      value: commit.linesDeleted
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}