# Process Recent Commits Only

## Problem
The application should be configured to only process the past n commits. By default, it should only consider the most recent 500 commits. This must be configurable from the command line.

## Current State
- The application currently processes ALL commits in the repository history (see `src/git/parser.ts:58`)
- Uses `simple-git` library's `log()` method without any limit
- For large repos with thousands of commits, this causes slow analysis

## Implementation Plan

### Step 1: Add CLI option
- Add `--max-commits <number>` option to `src/cli/handler.ts`
- Default value: 500 commits
- Pass this value through to the analysis engine

### Step 2: Update git log query
- Modify `src/git/parser.ts` to accept maxCommits parameter
- Update the `git.log()` call to include `--max-count` option
- The simple-git library supports this via the `maxCount` property

### Step 3: Update related functions
- Update `parseGitLog` function signature to accept optional `maxCommits` parameter
- Pass through from CLI → generateReport → analyzeRepository → parseGitLog

## Implementation Details

```typescript
// In CLI handler.ts:
.option('--max-commits <number>', 'Maximum number of recent commits to analyze', '500')

// In git/parser.ts:
const log = await git.log({
  format: { ... },
  strictDate: true,
  '--reverse': null,
  maxCount: maxCommits // Add this line
})
```

## Testing
- Test with default (500 commits)
- Test with custom value (e.g., --max-commits 100)
- Test with very large value to ensure it doesn't break
- Verify performance improvement on large repos

## Considerations
- This will only analyze the most recent N commits, which may miss historical data
- Progress reporting should reflect the actual number of commits being processed
- Documentation should clearly state this limitation