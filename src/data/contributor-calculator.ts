import type { CommitData } from '../git/parser.js'
import { isRealCommit } from '../utils/commit-filters.js'
import { assert } from '../utils/errors.js'
import type { RepoStatterConfig } from '../config/schema.js'

export interface ContributorStats {
  name: string
  commits: number
  linesAdded: number
  linesDeleted: number
}

export interface ContributorAward {
  name: string
  commits: number
  averageLinesChanged: number
}

export function getContributorStats(commits: CommitData[], config: RepoStatterConfig): ContributorStats[] {
  // Config will be used for filtering/customization in future updates
  void config
  assert(commits.length > 0, 'Cannot calculate contributor stats from empty commits array')
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


export function getContributorsByAverageLinesChanged(commits: CommitData[], config: RepoStatterConfig): ContributorAward[] {
  const contributorMap = new Map<string, { commits: number; totalLinesChanged: number }>()
  
  for (const commit of commits) {
    if (!isRealCommit(commit, config)) continue
    
    if (!contributorMap.has(commit.authorName)) {
      contributorMap.set(commit.authorName, {
        commits: 0,
        totalLinesChanged: 0
      })
    }
    
    const existing = contributorMap.get(commit.authorName)!
    existing.commits += 1
    existing.totalLinesChanged += commit.linesAdded + commit.linesDeleted
  }
  
  return Array.from(contributorMap.entries())
    .filter(([_, stats]) => stats.commits >= 5) // Only include contributors with at least 5 commits
    .map(([name, stats]) => ({
      name,
      commits: stats.commits,
      averageLinesChanged: stats.totalLinesChanged / stats.commits
    }))
}

export function getLowestAverageLinesChanged(commits: CommitData[], config: RepoStatterConfig): ContributorAward[] {
  return getContributorsByAverageLinesChanged(commits, config)
    .sort((a, b) => a.averageLinesChanged - b.averageLinesChanged)
    .slice(0, 5)
}

export function getHighestAverageLinesChanged(commits: CommitData[], config: RepoStatterConfig): ContributorAward[] {
  return getContributorsByAverageLinesChanged(commits, config)
    .sort((a, b) => b.averageLinesChanged - a.averageLinesChanged)
    .slice(0, 5)
}