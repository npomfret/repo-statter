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

## Implementation Plan

### Task Validity Assessment
This is a **valid and worthwhile task**. The bug report correctly identifies that the current filtering is too narrow and misses commits like "Resolved conflicts by accepting remote component" because it only checks for "resolved conflicts" at the start of the message.

### Implementation Approach

#### Option 1: Expanded Pattern Matching (Recommended)
Enhance the `isRealCommit` function to check for patterns anywhere in the message, not just at the start:

```typescript
function isRealCommit(commit: CommitData): boolean {
  const message = commit.message.toLowerCase()
  
  // Check for merge-related patterns at start
  if (message.startsWith('merge remote-tracking branch') ||
      message.startsWith('merge branch') ||
      message.startsWith('merge pull request')) {
    return false
  }
  
  // Check for conflict/automated patterns anywhere in message
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
    'renovate[bot]',
    'dependabot[bot]',
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
```

#### Option 2: Simplified Contains Check
A simpler approach using string includes:

```typescript
function isRealCommit(commit: CommitData): boolean {
  const message = commit.message.toLowerCase()
  
  const rejectPatterns = [
    'merge remote-tracking branch',
    'merge branch',
    'merge pull request',
    'resolved conflict',
    'resolving conflict',
    'accepting remote',
    'accepting local',
    'auto-merge',
    'revert "',
    'bump version',
    'update dependencies'
  ]
  
  return !rejectPatterns.some(pattern => message.includes(pattern))
}
```

### Recommended Solution
I recommend **Option 1** with regex patterns because:
1. More flexible - can match variations like "resolved conflicts", "resolving conflict", etc.
2. Can handle bot commits from common automation tools
3. More maintainable - patterns are clearly documented

### Implementation Steps

1. **Update `isRealCommit` function** in `src/data/award-calculator.ts`
   - Replace the current implementation with the enhanced pattern matching
   - Ensure all existing tests pass
   
2. **Add unit tests** for the new patterns
   - Test that "Resolved conflicts by accepting remote component" is filtered
   - Test other automated commit patterns
   - Test that legitimate commits still pass through
   
3. **Consider adding configuration** (future enhancement)
   - Allow users to customize filtered patterns via config
   - Useful for teams with custom merge/automation messages

### Testing Strategy
Create test commits with messages like:
- "Resolved conflicts by accepting remote component" ✗ (should be filtered)
- "Accepting incoming changes from upstream" ✗ (should be filtered)  
- "Bump version to 1.2.3" ✗ (should be filtered)
- "Update dependencies for security patch" ✗ (should be filtered)
- "Add new feature for conflict detection" ✓ (should pass - legitimate despite containing "conflict")
- "Implement auto-save functionality" ✓ (should pass - legitimate despite containing "auto")

### Notes
- The lowercase conversion before checking ensures case-insensitive matching
- Using regex with word boundaries might be needed for some patterns to avoid false positives
- Consider performance impact if the commit list is very large
