# Hardcoded Byte Estimation

## Problem
- **Location**: `src/git/parser.ts:226-228`
- **Description**: Byte calculation uses hardcoded 50 bytes per line estimate, which is inaccurate
- **Current vs Expected**: Rough estimate vs actual byte counting or remove the feature
- **Example**: For a commit with 23 lines added, current estimation shows 1150 bytes but actual change was 663 bytes (73% overestimation)

## Analysis
The byte information is actively used in:
- Repository Size chart in the report
- Tooltips showing bytes added/deleted and total repository size
- Time series data tracking cumulative bytes

Since this data is prominently displayed, we should implement accurate byte counting rather than removing the feature.

## Solution
Implement actual byte counting by comparing file sizes between commits:

```typescript
async function getByteChanges(repoPath: string, commitHash: string): Promise<{ 
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  try {
    // Get list of changed files
    const { stdout: filesOutput } = await execAsync(
      `cd "${repoPath}" && git diff-tree --no-commit-id --name-status -r ${commitHash}`,
      { timeout: 10000 }
    )
    
    const fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> = {}
    let totalBytesAdded = 0
    let totalBytesDeleted = 0
    
    const lines = filesOutput.trim().split('\n').filter(l => l.trim())
    
    for (const line of lines) {
      const [status, fileName] = line.split('\t')
      if (!fileName || isFileExcluded(fileName)) continue
      
      let bytesAdded = 0
      let bytesDeleted = 0
      
      if (status === 'A') {
        // Added file - get current size
        const size = await getFileSize(repoPath, commitHash, fileName)
        bytesAdded = size
      } else if (status === 'D') {
        // Deleted file - get previous size
        const size = await getFileSize(repoPath, `${commitHash}^`, fileName)
        bytesDeleted = size
      } else if (status === 'M') {
        // Modified file - compare sizes
        const prevSize = await getFileSize(repoPath, `${commitHash}^`, fileName)
        const currSize = await getFileSize(repoPath, commitHash, fileName)
        const diff = currSize - prevSize
        if (diff > 0) {
          bytesAdded = diff
        } else {
          bytesDeleted = -diff
        }
      }
      
      if (bytesAdded > 0 || bytesDeleted > 0) {
        fileChanges[fileName] = { bytesAdded, bytesDeleted }
        totalBytesAdded += bytesAdded
        totalBytesDeleted += bytesDeleted
      }
    }
    
    return { totalBytesAdded, totalBytesDeleted, fileChanges }
  } catch (error) {
    console.warn(`Failed to calculate byte changes for commit ${commitHash}:`, error instanceof Error ? error.message : String(error))
    // Fall back to line-based estimation
    return getByteChangesFromLines(repoPath, commitHash)
  }
}

async function getFileSize(repoPath: string, commitHash: string, fileName: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git show ${commitHash}:"${fileName}" | wc -c`,
      { timeout: 5000 }
    )
    return parseInt(stdout.trim()) || 0
  } catch {
    return 0
  }
}
```

## Implementation Plan

1. **Update getByteChanges function** (src/git/parser.ts:213-254)
   - Replace line-based estimation with actual file size comparison
   - Use git diff-tree to get changed files with their status (A/M/D)
   - Calculate actual byte changes by comparing file sizes

2. **Add helper function getFileSize**
   - Get actual file size at specific commit using git show and wc -c
   - Handle errors gracefully (deleted files, binary files, etc.)

3. **Keep fallback to line-based estimation**
   - If actual byte calculation fails, fall back to current estimation
   - Add console.warn to track when fallback is used

4. **Test with various scenarios**
   - New files (status A)
   - Deleted files (status D)  
   - Modified files (status M)
   - Binary files
   - Large repositories

## Impact
- **Type**: Behavior change - more accurate data
- **Risk**: Low (includes fallback to current behavior)
- **Complexity**: Moderate
- **Benefit**: High impact - significantly improves data accuracy

## Notes
- The current implementation is already prepared for this change with try/catch blocks
- The function signature remains the same, so no changes needed in calling code
- Performance impact should be minimal as we're already running git commands