# Silent Error Handling Anti-Pattern

## Problem
- **Location**: `src/git/parser.ts:86-89`, `src/git/parser.ts:191-194`, `src/git/parser.ts:238-240`
- **Description**: Errors are silently caught and ignored, making debugging difficult
- **Current vs Expected**: Silent try/catch blocks vs proper error handling or logging

## Solution
Add proper error handling with context:

```typescript
// Instead of:
} catch (error) {
  // Silent fail - not all repos have GitHub remotes
}

// Use:
} catch (error) {
  // Log for debugging but don't fail the operation
  console.debug('No GitHub remote found for repository:', error.message)
}

// For critical operations, let errors bubble up:
} catch (error) {
  throw new Error(`Failed to get repository size for commit ${commitHash}: ${error.message}`)
}
```

## Impact
- **Type**: Behavior change - better error visibility
- **Risk**: Low 
- **Complexity**: Simple
- **Benefit**: Medium impact - improves debugging

## Implementation Notes
Distinguish between expected failures (like missing GitHub remotes) and unexpected errors. Expected failures can be logged at debug level, while unexpected errors should bubble up.

## Implementation Plan

### Analysis
Found 5 instances of silent error handling in `src/git/parser.ts`:
1. Line 103-105: GitHub remote detection - expected failure
2. Line 172-174: Diff stats parsing - returns defaults on error
3. Line 196-198: Individual file size reading - expected failure for deleted/binary files
4. Line 202-204: Repository size calculation - returns null on error
5. Line 243-245: Bytes changed calculation - returns defaults on error

### Approach
Based on CLAUDE.md guidelines:
- Avoid try/catch as default error handling
- When used, add explanation comments
- Let exceptions bubble up for broken state

### Categories of Errors:
1. **Expected failures** (GitHub remote, individual file reads):
   - Keep the catch but add explanatory comments
   - Don't log to avoid noise (especially in loops)

2. **Calculation failures** (diff stats, bytes changed):
   - Add console.warn with context for debugging
   - Still return safe defaults to avoid breaking reports

3. **Repository size calculation**:
   - Already returns null which signals failure appropriately
   - Add comment explaining why we catch here

### Implementation Steps:

1. **Update getGitHubUrl** (line 103-105):
   - Add comment explaining this is an expected case
   - No logging needed (not all repos have GitHub remotes)

2. **Update parseDiffOutput** (line 172-174):
   - Add console.warn with the unparseable output
   - Keep returning safe defaults

3. **Update getRepositorySizeForCommit** (line 196-198):
   - Add comment explaining files might be deleted/binary
   - No logging (would be too noisy in the loop)

4. **Update getRepositorySizeForCommit return** (line 202-204):
   - Add comment explaining why null is appropriate
   - Consider if we should warn here

5. **Update getBytesChangedForCommit** (line 243-245):
   - Add console.warn with context
   - Keep returning safe defaults

### Benefits:
- Better debugging when things go wrong
- Clear intent through comments
- Maintains stability (no breaking changes)
- Follows codebase conventions