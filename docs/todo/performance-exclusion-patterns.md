# Performance Issue with Exclusion Pattern Matching

## Problem
- **Location**: `src/utils/exclusions.ts:78`
- **Description**: The `minimatch` function is called for every pattern on every file, which can be slow for repositories with many files
- **Current vs Expected**: O(n*m) pattern matching vs optimized pattern matching with caching

## Analysis
Current implementation calls `minimatch(filePath, pattern)` for each pattern on each file check. The `minimatch` function internally compiles the pattern every time, which is wasteful when the same patterns are used repeatedly.

## Implementation Plan

### Step 1: Cache Compiled Patterns
- Update `src/utils/exclusions.ts` to use pre-compiled Minimatch instances
- Cache compiled patterns using a Map for custom patterns
- Pre-compile all default patterns at module load time

### Step 2: Optimize the isFileExcluded Function
- Replace the current `minimatch` call with cached compiled patterns
- Maintain backward compatibility for custom patterns
- Keep the existing API unchanged

### Step 3: Test Performance
- Use existing test cases to verify functionality
- Consider adding a simple benchmark test for large file sets

## Solution
Cache compiled minimatch patterns for better performance:

```typescript
import { Minimatch } from 'minimatch'

// Pre-compile all default patterns at module load time
const DEFAULT_COMPILED_PATTERNS = DEFAULT_EXCLUSION_PATTERNS.map(pattern => new Minimatch(pattern))

// Cache for custom patterns
const compiledPatterns = new Map<string, Minimatch>()

function getCompiledPattern(pattern: string): Minimatch {
  if (!compiledPatterns.has(pattern)) {
    compiledPatterns.set(pattern, new Minimatch(pattern))
  }
  return compiledPatterns.get(pattern)!
}

export function isFileExcluded(filePath: string, patterns: string[] = DEFAULT_EXCLUSION_PATTERNS): boolean {
  // Fast path for default patterns
  if (patterns === DEFAULT_EXCLUSION_PATTERNS) {
    return DEFAULT_COMPILED_PATTERNS.some(pattern => pattern.match(filePath))
  }
  
  // Cached path for custom patterns
  return patterns.some(pattern => {
    const compiled = getCompiledPattern(pattern)
    return compiled.match(filePath)
  })
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Medium impact - improves performance for large repositories

## Implementation Notes
The performance improvement will be most noticeable in repositories with many files. The optimization maintains the existing API while providing significant performance gains through pattern caching.