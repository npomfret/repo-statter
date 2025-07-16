# Missing Git Repository Validation

## Problem
- **Location**: `src/cli/handler.ts:15-18`, `src/git/parser.ts:32-33`
- **Description**: The code checks if a path exists but doesn't validate if it's actually a git repository before trying to parse it
- **Current vs Expected**: Basic path existence check vs proper git repository validation

## Solution
Add proper git repository validation:

```typescript
// In src/utils/git-validation.ts
import { existsSync } from 'fs'
import { join } from 'path'
import { simpleGit } from 'simple-git'

export async function validateGitRepository(repoPath: string): Promise<void> {
  // Check if path exists
  if (!existsSync(repoPath)) {
    throw new Error(`Path does not exist: ${repoPath}`)
  }
  
  // Check if it's a git repository
  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${repoPath}`)
  }
  
  // Check if we can access the repository
  try {
    const git = simpleGit(repoPath)
    await git.status()
  } catch (error) {
    throw new Error(`Cannot access git repository at ${repoPath}: ${error.message}`)
  }
}

// Use in CLI handler:
export async function handleCLI(args: string[]): Promise<void> {
  // ... existing argument parsing ...
  
  await validateGitRepository(repoPath)
  
  await generateReport(repoPath, 'analysis')
}
```

## Impact
- **Type**: Behavior change - improves error handling
- **Risk**: Low (adds validation)
- **Complexity**: Simple
- **Benefit**: Medium impact - provides better error messages

## Implementation Notes
Consider adding additional validation like checking if the repository has commits or is not corrupted.

## Implementation Plan

### Analysis
The current code only checks if a path exists, but doesn't validate if it's actually a git repository. This can lead to confusing errors when users provide a non-git directory.

### Approach
1. Create a new validation utility in `src/utils/git-validation.ts`
2. Implement validation that checks:
   - Path exists
   - Contains .git directory
   - Can be accessed by simple-git
3. Update CLI handler to use the validation
4. Update git parser to use the same validation
5. Add proper error messages for each failure case

### Implementation Steps
1. **Create git-validation.ts utility**
   - Export `validateGitRepository` function
   - Check path existence
   - Check for .git directory
   - Verify simple-git can access it

2. **Update CLI handler**
   - Import the validation function
   - Replace existing `access` check with validation
   - Keep existing error handling structure

3. **Update git parser**
   - Import the validation function
   - Add validation at the start of `parseCommitHistory`
   - Remove redundant checks

### Benefits
- Clear error messages when path is not a git repository
- Consistent validation across the codebase
- Early failure with helpful diagnostics

### Testing Strategy
- Test with valid git repository
- Test with non-existent path
- Test with directory that's not a git repo
- Test with corrupted git repository (if possible)