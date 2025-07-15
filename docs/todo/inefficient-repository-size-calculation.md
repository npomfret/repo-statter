# Inefficient Repository Size Calculation

## Problem
- **Location**: `src/git/parser.ts:172-200`
- **Description**: Repository size calculation iterates through all files in each commit, running individual git commands - this is extremely inefficient
- **Current vs Expected**: O(n*m) operations where n=commits, m=files vs more efficient approach

## Solution
Optimize the repository size calculation:

```typescript
// Option 1: Calculate size differentially
async function getRepositorySizeEfficient(repoPath: string, commitHash: string, previousSize: number = 0): Promise<number> {
  // Only calculate the diff from previous commit
  const { stdout } = await execAsync(`cd ${JSON.stringify(repoPath)} && git diff --stat ${commitHash}^..${commitHash}`)
  // Parse size changes and add to previous size
  return previousSize + parseSizeChange(stdout)
}

// Option 2: Remove feature entirely if not essential
// Remove totalBytes tracking from CommitData interface
```

## Impact
- **Type**: Behavior change - performance improvement
- **Risk**: Medium
- **Complexity**: Moderate
- **Benefit**: High value - significant performance gain

## Implementation Notes
For large repositories, this optimization could reduce analysis time from hours to minutes. Consider if repository size tracking is essential for the use case.