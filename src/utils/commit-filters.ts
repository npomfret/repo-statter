import type { CommitData } from '../git/parser.js'
import type { SimplifiedConfig } from '../config/simplified-schema.js'

export function isRealCommit(commit: CommitData, config: SimplifiedConfig): boolean {
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