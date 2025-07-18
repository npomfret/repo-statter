import type { CommitData } from '../git/parser.js'

export function isRealCommit(commit: CommitData): boolean {
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