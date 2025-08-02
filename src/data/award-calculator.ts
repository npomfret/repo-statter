import type { CommitData } from '../git/parser.js'
import { isRealCommit } from '../utils/commit-filters.js'
import type { AnalysisContext } from '../report/generator.js'
import type { CommitAward } from './types.js'

function getTopCommitsByMetric(
  context: AnalysisContext,
  getValue: (commit: CommitData) => number,
  additionalFilter?: (commit: CommitData) => boolean
): CommitAward[] {
  const { commits, config } = context
  return commits
    .filter(commit => isRealCommit(commit, config) && (!additionalFilter || additionalFilter(commit)))
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

export function getTopCommitsByFilesModified(context: AnalysisContext): CommitAward[] {
  return getTopCommitsByMetric(context, commit => commit.filesChanged.length)
}

export function getTopCommitsByBytesAdded(context: AnalysisContext): CommitAward[] {
  return getTopCommitsByMetric(
    context,
    commit => commit.bytesAdded ?? 0,
    commit => commit.bytesAdded !== undefined
  )
}

export function getTopCommitsByBytesRemoved(context: AnalysisContext): CommitAward[] {
  return getTopCommitsByMetric(
    context,
    commit => commit.bytesDeleted ?? 0,
    commit => commit.bytesDeleted !== undefined
  )
}

export function getTopCommitsByLinesAdded(context: AnalysisContext): CommitAward[] {
  return getTopCommitsByMetric(context, commit => commit.linesAdded)
}

export function getTopCommitsByLinesRemoved(context: AnalysisContext): CommitAward[] {
  return getTopCommitsByMetric(context, commit => commit.linesDeleted)
}