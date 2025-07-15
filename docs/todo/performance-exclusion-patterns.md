# Performance Issue with Exclusion Pattern Matching

## Problem
- **Location**: `src/utils/exclusions.ts:45`
- **Description**: The `minimatch` function is called for every pattern on every file, which can be slow for repositories with many files
- **Current vs Expected**: O(n*m) pattern matching vs optimized pattern matching with caching

## Solution
Cache compiled minimatch patterns for better performance:

```typescript
import { Minimatch } from 'minimatch'

// Cache compiled patterns
const compiledPatterns = new Map<string, Minimatch>()

function getCompiledPattern(pattern: string): Minimatch {
  if (!compiledPatterns.has(pattern)) {
    compiledPatterns.set(pattern, new Minimatch(pattern))
  }
  return compiledPatterns.get(pattern)!
}

export function isFileExcluded(filePath: string, patterns: string[] = DEFAULT_EXCLUSION_PATTERNS): boolean {
  return patterns.some(pattern => {
    const compiled = getCompiledPattern(pattern)
    return compiled.match(filePath)
  })
}

// Alternative: Pre-compile all default patterns
const DEFAULT_COMPILED_PATTERNS = DEFAULT_EXCLUSION_PATTERNS.map(pattern => new Minimatch(pattern))

export function isFileExcludedFast(filePath: string): boolean {
  return DEFAULT_COMPILED_PATTERNS.some(pattern => pattern.match(filePath))
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Medium impact - improves performance for large repositories

## Implementation Notes
The performance improvement will be most noticeable in repositories with many files. Consider benchmarking before and after the change.