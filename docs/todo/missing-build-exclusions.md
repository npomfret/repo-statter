# Missing Common Build Exclusions

## Problem
- **Location**: `src/utils/exclusions.ts:3-42`
- **Description**: The exclusion patterns miss many common build artifacts and IDE files that should be excluded from LOC calculations
- **Current vs Expected**: Limited exclusion patterns vs comprehensive coverage of common non-code files

## Solution
Add missing exclusion patterns:

```typescript
const DEFAULT_EXCLUSION_PATTERNS = [
  // ... existing patterns ...
  
  // Additional IDE and editor files
  '.vscode/**/*',
  '.idea/**/*',
  '*.swp',
  '*.swo',
  '*~',
  
  // Additional build outputs
  'coverage/**/*',
  'test-results/**/*',
  'reports/**/*',
  'out/**/*',
  'bin/**/*',
  'obj/**/*',
  
  // Additional package managers
  'Cargo.lock',
  'poetry.lock',
  'Pipfile.lock',
  'Gemfile.lock',
  
  // Additional config files
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.tmp',
  '*.cache',
  
  // Additional language specific
  '__pycache__/**/*',
  '*.pyc',
  '*.pyo',
  '*.class',
  '*.jar',
  '*.war',
  '*.ear'
]
```

## Impact
- **Type**: Behavior change - improves LOC accuracy
- **Risk**: Low (improves filtering)
- **Complexity**: Simple
- **Benefit**: Medium impact - more accurate code statistics

## Implementation Notes
Consider organizing patterns by category (IDE, build, languages) for better maintainability.