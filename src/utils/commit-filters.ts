import type { CommitData } from '../git/parser.js'
import type { RepoStatterConfig } from '../config/schema.js'

export function isRealCommit(commit: CommitData, config: RepoStatterConfig): boolean {
  const message = commit.message.toLowerCase()
  
  // Check merge patterns
  const isMergeCommit = config.commitFilters.mergePatterns.some(pattern =>
    message.startsWith(pattern.toLowerCase())
  )
  if (isMergeCommit) {
    return false
  }
  
  // Check automated patterns
  return !config.commitFilters.automatedPatterns.some(pattern => 
    new RegExp(pattern).test(message)
  )
}