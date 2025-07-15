import type { CommitData } from '../git/parser.js'

export interface ContributorStats {
  name: string
  commits: number
  linesAdded: number
  linesDeleted: number
}

export interface FileTypeStats {
  type: string
  lines: number
  percentage: number
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