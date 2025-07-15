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

## Implementation Notes
This makes it easier to add new file types and is more concise.