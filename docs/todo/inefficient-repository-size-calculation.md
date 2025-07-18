# Inefficient Repository Size Calculation

## Problem
- **Location**: `src/git/parser.ts:172-200` (getByteChanges function)
- **Description**: Repository size calculation iterates through all files in each commit, running individual git commands - this is extremely inefficient
- **Current vs Expected**: O(n*m) operations where n=commits, m=files vs more efficient approach

### Current Implementation Analysis
The current `getByteChanges` function:
1. Runs `git ls-tree -r -l ${commitHash}` to list ALL files with sizes at current commit
2. Runs `git ls-tree -r -l ${commitHash}^` to list ALL files with sizes at parent commit  
3. Gets list of changed files with `git diff-tree`
4. Compares the two complete file lists to calculate size differences

**Performance Impact**: For a repo with 1000 files and 1000 commits = 2,000,000 file operations!

## Solution
The most efficient approach is to use git's built-in capabilities to calculate size changes directly:

### Implementation Plan
1. Replace the inefficient `getByteChanges` function with a more efficient approach
2. Use `git diff --numstat` which already provides per-file line additions/deletions
3. Convert line changes to byte estimates (as already done in the fallback)
4. This eliminates the need to list ALL files for every commit

### Detailed Changes

#### 1. Simplify getByteChanges function
```typescript
async function getByteChanges(repoPath: string, commitHash: string): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  // Use numstat directly - no need for ls-tree
  const { stdout } = await execAsync(
    `cd "${repoPath}" && git show ${commitHash} --numstat --format=""`,
    { timeout: 10000 }
  )
  return parseByteChanges(stdout)
}
```

#### 2. Keep the existing parseByteChanges function
The existing `parseByteChanges` function in `git-extractor.ts` already does exactly what we need:
- Parses numstat output
- Estimates bytes as lines * 50 (reasonable average)
- Handles binary files and edge cases
- Respects file exclusions

#### 3. Remove unnecessary functions
- Remove `parseLsTreeOutput` function (no longer needed)
- Remove `calculateByteChanges` function (no longer needed)

## Impact
- **Type**: Behavior change - performance improvement
- **Risk**: Low - we're already using this approach as a fallback
- **Complexity**: Low - simplifying code by removing complexity
- **Benefit**: High value - significant performance gain

### Performance Improvement
- **Before**: O(n*m) where n=commits, m=files in repo
- **After**: O(n*k) where n=commits, k=changed files per commit (typically much smaller than m)
- For large repos, this could reduce analysis time from hours to minutes

## Testing Considerations
- The byte calculation will now always use the estimation approach (lines * 50 bytes)
- This is already the fallback behavior, so results should be consistent
- Need to verify that Repository Size chart still displays correctly