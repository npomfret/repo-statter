# Missing Input Validation

## Problem
- **Location**: `src/git/parser.ts:31-73` (parseCommitHistory function)
- **Description**: No validation that the provided path is actually a git repository
- **Current vs Expected**: Assumes valid git repo vs validates input before processing

## Solution
Add validation for git repository:

```typescript
import { access } from 'fs/promises'
import { join } from 'path'

export async function parseCommitHistory(repoPath: string): Promise<CommitData[]> {
  // Validate input
  if (!repoPath || typeof repoPath !== 'string') {
    throw new Error('Repository path is required and must be a string')
  }
  
  // Check if path exists
  try {
    await access(repoPath)
  } catch {
    throw new Error(`Repository path does not exist: ${repoPath}`)
  }
  
  // Check if it's a git repository
  try {
    await access(join(repoPath, '.git'))
  } catch {
    throw new Error(`Path is not a git repository: ${repoPath}`)
  }
  
  const git = simpleGit(repoPath)
  
  // Test git access
  try {
    await git.status()
  } catch (error) {
    throw new Error(`Cannot access git repository: ${error.message}`)
  }
  
  // ... rest of function
}
```

## Impact
- **Type**: Behavior change - better error handling
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Medium impact - prevents confusing errors

## Implementation Plan

### Analysis
Current `parseCommitHistory` function (src/git/parser.ts:32):
- Takes `repoPath: string` parameter
- Immediately creates `simpleGit(repoPath)` without validation
- Calls `git.log()` which can fail with cryptic errors if path is invalid

### Decision
Add input validation at the start of `parseCommitHistory` function to:
1. Validate `repoPath` parameter is a non-empty string
2. Check if path exists using `fs.access` 
3. Check if path contains `.git` directory
4. Test git access with `git.status()`

### Implementation Steps
1. **Add validation function** - Create helper function for git repo validation
2. **Update parseCommitHistory** - Add validation call at start of function
3. **Test edge cases** - Verify error handling for invalid paths

### Approach
- Use `fs.access` instead of `fs.existsSync` for async consistency
- Provide clear, specific error messages for each validation step
- Keep changes minimal - only add validation, don't change existing logic
- Follow existing patterns in the codebase

### Code Changes
```typescript
// Add imports at top
import { access } from 'fs/promises'
import { join } from 'path'

// Add validation at start of parseCommitHistory
export async function parseCommitHistory(repoPath: string): Promise<CommitData[]> {
  // Validate input
  if (!repoPath || typeof repoPath !== 'string') {
    throw new Error('Repository path is required and must be a string')
  }
  
  // Check if path exists
  try {
    await access(repoPath)
  } catch {
    throw new Error(`Repository path does not exist: ${repoPath}`)
  }
  
  // Check if it's a git repository
  try {
    await access(join(repoPath, '.git'))
  } catch {
    throw new Error(`Path is not a git repository: ${repoPath}`)
  }
  
  const git = simpleGit(repoPath)
  
  // Test git access
  try {
    await git.status()
  } catch (error) {
    throw new Error(`Cannot access git repository: ${error.message}`)
  }
  
  // ... existing function continues unchanged
}
```

### Risk Assessment
- **Low risk** - Only adds validation, doesn't change existing behavior
- **No breaking changes** - Same function signature and return type
- **Improved error messages** - Users get clear feedback instead of cryptic git errors

## Implementation Notes
Early validation provides clearer error messages and prevents wasted processing time.