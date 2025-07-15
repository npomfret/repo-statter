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

## Implementation Notes
Early validation provides clearer error messages and prevents wasted processing time.