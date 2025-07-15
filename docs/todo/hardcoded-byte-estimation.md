# Hardcoded Byte Estimation

## Problem
- **Location**: `src/git/parser.ts:226-228`
- **Description**: Byte calculation uses hardcoded 50 bytes per line estimate, which is inaccurate
- **Current vs Expected**: Rough estimate vs actual byte counting or remove the feature

## Solution
Either remove the byte calculation feature entirely or implement proper byte counting:

```typescript
// Option 1: Remove bytes calculation entirely
// Remove bytesAdded, bytesDeleted from interfaces and functions

// Option 2: Implement actual byte counting
async function getActualByteChanges(repoPath: string, commitHash: string): Promise<{
  totalBytesAdded: number; 
  totalBytesDeleted: number; 
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> 
}> {
  // Use git diff --stat or git show --stat to get actual byte changes
  const { stdout } = await execAsync(`cd ${JSON.stringify(repoPath)} && git diff --stat ${commitHash}^..${commitHash}`)
  // Parse actual byte changes from git output
}
```

## Impact
- **Type**: Behavior change - more accurate data or simplified API
- **Risk**: Medium
- **Complexity**: Moderate
- **Benefit**: Medium impact - improves data accuracy

## Implementation Notes
Consider whether byte tracking is actually needed for the use case. If not, removing it simplifies the code significantly.