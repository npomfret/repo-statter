import type { CommitData } from '../git/parser.js'

export interface CommitAward {
  sha: string
  authorName: string
  date: string
  message: string
  value: number
}

function isRealCommit(commit: CommitData): boolean {
  const message = commit.message.toLowerCase()
  
  if (message.startsWith('merge remote-tracking branch') ||
      message.startsWith('merge branch') ||
      message.startsWith('merge pull request')) {
    return false
  }
  
  const automatedPatterns = [
    'resolved conflict',
    'resolving conflict',
    'accept.*conflict',
    'conflict.*accept',
    'auto-merge',
    'automated merge',
    'revert "',
    'bump version',
    'update dependencies',
    'update dependency',
    'renovate\\[bot\\]',
    'dependabot\\[bot\\]',
    'whitesource',
    'accepting remote',
    'accepting local',
    'accepting incoming',
    'accepting current'
  ]
  
  return !automatedPatterns.some(pattern => 
    new RegExp(pattern).test(message)
  )
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
      value: commit.bytesAdded ?? 0
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
      value: commit.bytesDeleted ?? 0
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