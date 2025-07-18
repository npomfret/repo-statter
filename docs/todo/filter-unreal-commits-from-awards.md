# Bug Report: Non-substantive Commits in Awards

## Summary

The "Awards" section includes commits that do not represent substantive work, such as automated merge conflict resolutions. These "unreal" commits are skewing the award results.

## Problem Description

The current filtering mechanism, located in the `isRealCommit` function within `src/data/award-calculator.ts`, is intended to filter out merge commits and other non-substantive commit messages. However, it is not comprehensive enough.

As a result, commits with messages that indicate they are merely resolving conflicts are still being included in the award calculations. For example, a commit with the message "Resolved conflicts by accepting remote component" has been observed in the "Most Lines Removed" award category.

## Expected Behavior

Commits that are solely for the purpose of resolving merge conflicts or other automated processes should be excluded from all award calculations to ensure the awards reflect meaningful contributions.

## Analysis

The `isRealCommit` function currently filters for a few specific prefixes and substrings:

```typescript
function isRealCommit(commit: CommitData): boolean {
  const message = commit.message.toLowerCase()
  return !message.startsWith('merge remote-tracking branch') && 
         !message.startsWith('merge branch') &&
         !message.startsWith('resolved conflicts') &&
         !message.includes('merge pull request')
}
```

While this covers some common cases, it is not exhaustive. The list of patterns needs to be expanded to catch other variations of merge and conflict resolution messages.

## Proposed Action

The `isRealCommit` function in `src/data/award-calculator.ts` should be updated to include more patterns to identify and filter out non-substantive commits. The goal is to make the filter more robust against various forms of automated or process-related commit messages.
