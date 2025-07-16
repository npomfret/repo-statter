# Hardcoded Byte Estimation

## Problem
- **Location**: `src/data/git-extractor.ts:146-148` (in parseByteChanges function)
- **Description**: Byte calculation uses hardcoded 50 bytes per line estimate, which is inaccurate
- **Current vs Expected**: Rough estimate vs actual byte counting or remove the feature
- **Example**: For a commit with 23 lines added, current estimation shows 1150 bytes but actual change was 663 bytes (73% overestimation)

## Analysis
The byte information is actively used in:
- Repository Size chart in the report
- Tooltips showing bytes added/deleted and total repository size
- Time series data tracking cumulative bytes

Since this data is prominently displayed, we should implement accurate byte counting rather than removing the feature.

Current code flow:
1. `git/parser.ts`: getByteChanges() runs `git show --numstat`
2. `data/git-extractor.ts`: parseByteChanges() parses output and applies 50 bytes/line estimation
3. This data is then used in parseCommitDiff() to populate FileChange objects

## Solution
### Approach 1: git ls-tree for accurate sizes (CHOSEN)
Use `git ls-tree -l` which provides actual file sizes efficiently:
- More performant than multiple `git show | wc -c` calls
- Single command to get all file sizes at a commit
- Works well with the existing architecture

### Approach 2: git show | wc -c (from task description)
Individual file size queries as suggested in the task - less efficient for many files

### Implementation Details (Approach 1)
```typescript
// In src/git/parser.ts - replace existing getByteChanges
async function getByteChanges(repoPath: string, commitHash: string): Promise<ByteChanges> {
  try {
    // Get file sizes at current commit
    const { stdout: currentSizes } = await execAsync(
      `cd "${repoPath}" && git ls-tree -r -l ${commitHash}`,
      { timeout: 10000 }
    )
    
    // Get file sizes at parent commit (if not first commit)
    let parentSizes = ''
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git ls-tree -r -l ${commitHash}^`,
        { timeout: 10000 }
      )
      parentSizes = stdout
    } catch {
      // First commit - no parent
    }
    
    // Get list of changed files with status
    const { stdout: changedFiles } = await execAsync(
      `cd "${repoPath}" && git diff-tree --no-commit-id --name-status -r ${commitHash}`,
      { timeout: 10000 }
    )
    
    return calculateByteChanges(currentSizes, parentSizes, changedFiles)
  } catch (error) {
    console.warn(`Failed to calculate exact byte changes for ${commitHash}, falling back to estimation`)
    // Fall back to numstat estimation
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git show ${commitHash} --numstat --format=""`,
      { timeout: 10000 }
    )
    return parseByteChanges(stdout)
  }
}

// New helper function to calculate byte changes from ls-tree output
function calculateByteChanges(
  currentSizes: string,
  parentSizes: string,
  changedFiles: string
): ByteChanges {
  // Parse ls-tree output into size maps
  const currentSizeMap = parseLsTreeOutput(currentSizes)
  const parentSizeMap = parseLsTreeOutput(parentSizes)
  
  // Process changed files
  const fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> = {}
  let totalBytesAdded = 0
  let totalBytesDeleted = 0
  
  const changes = changedFiles.trim().split('\n').filter(l => l.trim())
  
  for (const change of changes) {
    const [status, ...fileNameParts] = change.split('\t')
    const fileName = fileNameParts.join('\t')
    
    if (!fileName || isFileExcluded(fileName)) continue
    
    let bytesAdded = 0
    let bytesDeleted = 0
    
    if (status === 'A') {
      bytesAdded = currentSizeMap[fileName] || 0
    } else if (status === 'D') {
      bytesDeleted = parentSizeMap[fileName] || 0
    } else if (status === 'M') {
      const currentSize = currentSizeMap[fileName] || 0
      const parentSize = parentSizeMap[fileName] || 0
      const diff = currentSize - parentSize
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
}

// Parse git ls-tree -l output to get file sizes
function parseLsTreeOutput(lsTreeOutput: string): Record<string, number> {
  const sizeMap: Record<string, number> = {}
  const lines = lsTreeOutput.trim().split('\n').filter(l => l.trim())
  
  for (const line of lines) {
    // Format: <mode> <type> <hash> <size> <path>
    const match = line.match(/^\d{6}\s+blob\s+\w+\s+(\d+)\s+(.+)$/)
    if (match) {
      const [, size, path] = match
      sizeMap[path] = parseInt(size) || 0
    }
  }
  
  return sizeMap
}
```

## Implementation Plan

### Phase 1: Core Implementation
1. **Create calculateByteChanges helper function** (new in src/git/parser.ts)
   - Parse ls-tree output to build file size maps
   - Calculate actual byte differences based on file status
   - Return ByteChanges object matching existing interface

2. **Create parseLsTreeOutput helper function** (new in src/git/parser.ts)
   - Parse git ls-tree -l output format
   - Build map of filename to size
   - Handle edge cases (symlinks, submodules)

3. **Update getByteChanges function** (src/git/parser.ts:128-139)
   - Replace current implementation with ls-tree approach
   - Keep existing function signature
   - Add try/catch with fallback to current parseByteChanges

### Phase 2: Keep Estimation as Fallback
1. **Keep parseByteChanges in git-extractor.ts unchanged**
   - Still needed as fallback for when exact calculation fails
   - Will be called from getByteChanges catch block

### Phase 3: Testing
1. **Test edge cases**
   - First commit (no parent)
   - Binary files
   - Renamed files
   - Symlinks
   - Very large files

2. **Performance testing**
   - Compare performance with current approach
   - Test on large repositories

## Commits
This can be done in a single commit since:
- We're replacing one implementation with another
- The interface remains the same
- We have a fallback to existing behavior

## Impact
- **Type**: Behavior change - more accurate data
- **Risk**: Low (includes fallback to current behavior)
- **Complexity**: Moderate
- **Benefit**: High impact - significantly improves data accuracy
- **Performance**: Should be similar or better (fewer git commands for repos with many changed files)

## Notes
- Using git ls-tree is more efficient than multiple git show | wc -c calls
- The existing parseByteChanges will remain as the fallback mechanism
- No changes needed to calling code or data structures