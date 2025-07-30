# Optimize Git Commit Reading for Performance

## Problem Statement

The current implementation has several performance and correctness issues:

1. **Performance**: When analyzing only recent commits (e.g., `--max-commits 1000`), the system reads from the beginning of repository history, not the most recent commits
2. **Incorrect Behavior**: The `--max-commits` flag with `git log --reverse` returns the **oldest** N commits, not the most recent ones as the CLI description suggests
3. **Cache Limitations**: The cache doesn't handle changing commit limits properly (e.g., user cached 1000 commits, now wants 2000)

## Current Implementation Analysis

### How Commits Are Currently Read

```typescript
// In src/git/parser.ts
const logOptions: any = {
  format: { ... },
  strictDate: true,
  '--reverse': null  // This causes oldest-first ordering
}

if (maxCommits) {
  logOptions.maxCount = maxCommits  // This limits to FIRST N commits when combined with --reverse
}
```

### State Dependencies

The system tracks cumulative state that requires chronological processing:

1. **Cumulative Lines/Bytes**: Running totals that accumulate as commits are processed
   ```typescript
   cumulativeLines += commit.linesAdded - commit.linesDeleted
   cumulativeBytes += (commit.bytesAdded ?? 0) - (commit.bytesDeleted ?? 0)
   ```

2. **File State Tracking**: Files are tracked through their lifecycle
   - File heat maps track modification frequency and recency
   - File type statistics aggregate lines added per file type
   - Current file existence is verified against repository state

3. **Time Series Data**: Builds cumulative totals per time period (hourly/daily)
   - Each time period accumulates changes from all commits in that period
   - Cumulative values are carried forward to subsequent periods

## Proposed Solution

### Two-Phase Commit Reading

To maintain correctness while improving performance:

```typescript
async function parseCommitHistory(repoPath: string, ..., maxCommits?: number, ...) {
  // ... existing validation ...

  let commits: CommitData[] = []
  
  if (maxCommits && !lastCachedSha) {
    // Phase 1: Get the SHAs of the most recent N commits
    const recentShas = await git.log({
      maxCount: maxCommits,
      format: '%H',
      // No --reverse, so we get newest first
    })
    
    if (recentShas.all.length > 0) {
      // Phase 2: Get full commit data in chronological order
      const oldestSha = recentShas.all[recentShas.all.length - 1].hash
      const newestSha = recentShas.all[0].hash
      
      const log = await git.log({
        format: { ... },
        strictDate: true,
        '--reverse': null,  // Process in chronological order
        from: oldestSha + '^',  // Include the oldest commit
        to: newestSha
      })
      
      // Process commits...
    }
  } else {
    // Existing logic for full history or cached scenarios
  }
}
```

### Enhanced Cache Handling

The cache system needs to handle changing commit limits:

```typescript
interface CacheMetadata {
  version: string
  lastCommitSha: string
  commitCount: number
  isPartialCache: boolean  // New field
  maxCommitsUsed?: number  // New field
}

async function loadCache(...): Promise<CacheData | null> {
  const cache = await loadExistingCache(...)
  
  // If user wants more commits than cached, invalidate partial caches
  if (cache && cache.metadata.isPartialCache && maxCommits) {
    if (maxCommits > (cache.metadata.maxCommitsUsed || 0)) {
      return null  // Force fresh analysis
    }
  }
  
  return cache
}

async function saveCache(..., maxCommits?: number) {
  const metadata: CacheMetadata = {
    version: cacheVersion,
    lastCommitSha: lastCommit.sha,
    commitCount: commits.length,
    isPartialCache: !!maxCommits,
    maxCommitsUsed: maxCommits
  }
  
  // Save with metadata...
}
```

### Handling State for Partial History

When analyzing only recent commits, cumulative values won't reflect the full repository state:

**Option 1: Accept Zero-Based State** (Recommended)
- Start cumulative values at 0 for the analyzed period
- Document this behavior clearly
- This is acceptable since we're analyzing a subset of history

**Option 2: Calculate Initial State** (Complex)
- Would require analyzing all commits up to the starting point
- Defeats the performance optimization
- Not recommended

## Implementation Plan

1. **Fix the immediate bug**: Update git log options to get recent commits when `--max-commits` is specified
2. **Enhance cache metadata**: Add fields to track partial cache state
3. **Update cache validation**: Invalidate cache when requesting more commits than previously cached
4. **Update documentation**: Clarify that cumulative values are relative to the analyzed period

## Benefits

1. **Significant Performance Improvement**: For large repositories, analyzing last 1000 commits will be much faster
2. **Correct Behavior**: `--max-commits` will actually return recent commits as users expect
3. **Flexible Caching**: Users can change their analysis scope without manual cache clearing
4. **Backwards Compatible**: Existing full-history analyses continue to work unchanged

## Risks and Mitigations

1. **Risk**: Cumulative values won't match full repository state
   - **Mitigation**: Document this clearly in output and CLI help

2. **Risk**: Cache version compatibility
   - **Mitigation**: Bump cache version to force regeneration

3. **Risk**: Git command complexity with commit ranges
   - **Mitigation**: Thorough testing with edge cases (single commit, empty repos, etc.)

## Testing Strategy

1. Test with repositories of various sizes
2. Verify correct commit selection (newest N commits)
3. Test cache invalidation scenarios
4. Verify cumulative calculations remain correct within the analyzed period
5. Test edge cases: 
   - Single commit repos
   - Requesting more commits than exist
   - Switching between full and partial analysis