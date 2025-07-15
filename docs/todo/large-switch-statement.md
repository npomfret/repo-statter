# Large Switch Statement for File Types

## Problem
- **Location**: `src/git/parser.ts:92-137`
- **Description**: Large switch statement with many hardcoded file extensions
- **Current vs Expected**: 40+ line switch statement vs data-driven approach

## Solution
Replace with a data-driven approach:

```typescript
const FILE_TYPE_MAP = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SCSS',
  '.html': 'HTML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.swift': 'Swift',
  '.kt': 'Kotlin'
} as const

function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  return FILE_TYPE_MAP[ext as keyof typeof FILE_TYPE_MAP] || ext || 'Other'
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Quick win - more maintainable

## Implementation Plan

### Analysis
- ✅ **Task is valid**: The switch statement exists at `src/git/parser.ts:122-164` 
- ✅ **Task is worthwhile**: 42-line switch statement can be replaced with simple data structure
- ✅ **Task is well-defined**: Clear solution provided with exact implementation

### Current Code (lines 120-165)
```typescript
function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'TypeScript'
    // ... 40+ more lines of case statements
    default:
      return ext || 'Other'
  }
}
```

### Implementation Steps
1. **Replace the switch statement** with a `FILE_TYPE_MAP` object (lines 122-164)
2. **Update the function logic** to use map lookup instead of switch
3. **Verify behavior is identical** - same inputs should produce same outputs
4. **Run tests** to ensure no regressions

### Technical Details
- **Location**: `src/git/parser.ts:120-165`
- **Current function**: `getFileType(fileName: string): string`
- **Dependencies**: Already imports `extname` from 'path'
- **Behavior**: Must maintain exact same return values
- **Testing**: Use `npm run test` and `npm run typecheck`

### Risk Assessment
- **Risk Level**: Very Low
- **Impact**: Pure refactoring, no behavior change
- **Rollback**: Easy to revert if issues arise
- **Testing**: Existing tests should cover this function

### Success Criteria
- [ ] Switch statement replaced with data-driven approach
- [ ] Function maintains identical behavior 
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Code is more maintainable and concise

## Implementation Notes
This makes it easier to add new file types and is more concise. Small commit preferred - this is a single, focused refactoring.