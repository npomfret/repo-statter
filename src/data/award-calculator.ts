import type { CommitData } from '../git/parser.js'
import { isRealCommit } from '../utils/commit-filters.js'

export interface CommitAward {
  sha: string
  authorName: string
  date: string
  message: string
  value: number
}

function getTopCommitsByMetric(
  commits: CommitData[],
  getValue: (commit: CommitData) => number,
  additionalFilter?: (commit: CommitData) => boolean
): CommitAward[] {
  return commits
    .filter(commit => isRealCommit(commit) && (!additionalFilter || additionalFilter(commit)))
    .map(commit => ({
      sha: commit.sha,
      authorName: commit.authorName,
      date: commit.date,
      message: commit.message,
      value: getValue(commit)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function getTopCommitsByFilesModified(commits: CommitData[]): CommitAward[] {
  return getTopCommitsByMetric(commits, commit => commit.filesChanged.length)
}

export function getTopCommitsByBytesAdded(commits: CommitData[]): CommitAward[] {
  return getTopCommitsByMetric(
    commits,
    commit => commit.bytesAdded ?? 0,
    commit => commit.bytesAdded !== undefined
  )
}

export function getTopCommitsByBytesRemoved(commits: CommitData[]): CommitAward[] {
  return getTopCommitsByMetric(
    commits,
    commit => commit.bytesDeleted ?? 0,
    commit => commit.bytesDeleted !== undefined
  )
}

export function getTopCommitsByLinesAdded(commits: CommitData[]): CommitAward[] {
  return getTopCommitsByMetric(commits, commit => commit.linesAdded)
}

export function getTopCommitsByLinesRemoved(commits: CommitData[]): CommitAward[] {
  return getTopCommitsByMetric(commits, commit => commit.linesDeleted)
}