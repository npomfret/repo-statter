import type { CommitData } from '../git/parser.js'
import { isRealCommit } from '../utils/commit-filters.js'

export interface CommitAward {
  sha: string
  authorName: string
  date: string
  message: string
  value: number
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