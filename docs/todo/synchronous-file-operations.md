# Synchronous File Operations

## Problem
- **Location**: `src/cli/handler.ts:15`, `src/cli/handler.ts:27`
- **Description**: Using synchronous `existsSync` instead of async operations
- **Current vs Expected**: Blocking file operations vs non-blocking async operations

## Solution
Use async file operations:

```typescript
import { access } from 'fs/promises'

export async function handleCLI(args: string[]): Promise<void> {
  if (args.includes('--repo')) {
    const repoIndex = args.indexOf('--repo')
    const repoPath = args[repoIndex + 1]
    
    if (!repoPath) {
      console.error('Error: --repo requires a path argument')
      console.error('Usage: npm run analyse -- --repo /path/to/repository')
      process.exit(1)
    }
    
    try {
      await access(repoPath)
    } catch {
      console.error(`Error: Repository path does not exist: ${repoPath}`)
      process.exit(1)
    }
    
    await generateReport(repoPath, 'analysis')
  }
  // ... rest of function
}
```

Update the caller in `src/index.ts`:
```typescript
if (process.argv[1]?.endsWith('index.ts')) {
  const args = process.argv.slice(2)
  await handleCLI(args)
}
```

## Impact
- **Type**: Behavior change - better async handling
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Quick win - follows async patterns

## Implementation Plan

### Analysis
Current implementation in `src/cli/handler.ts`:
- Uses `existsSync()` at line 15 which blocks the event loop
- Function signature is synchronous: `handleCLI(args: string[]): void`
- Called synchronously from `src/index.ts:13`

### Decision
Convert to async/await pattern to maintain consistency with project style:
1. Replace `existsSync()` with `access()` from `fs/promises`
2. Update function signature to async
3. Update caller to await the function

### Implementation Steps
1. **Update `src/cli/handler.ts`**:
   - Replace `import { existsSync } from 'fs'` with `import { access } from 'fs/promises'`
   - Change function signature to `async function handleCLI(args: string[]): Promise<void>`
   - Replace `existsSync(repoPath)` with try/catch using `await access(repoPath)`
   - Remove `.catch()` from `generateReport()` calls since function is now async

2. **Update `src/index.ts`**:
   - Change `handleCLI(args)` to `await handleCLI(args)`

### Approach
- Use `fs.access()` instead of `existsSync()` for async consistency
- Follow existing async/await patterns in the codebase
- Keep error handling consistent with current behavior
- Minimal changes - only convert sync to async, no logic changes

### Code Changes
```typescript
// src/cli/handler.ts
import { access } from 'fs/promises'
import { generateReport } from '../report/generator.js'

export async function handleCLI(args: string[]): Promise<void> {
  if (args.includes('--repo')) {
    const repoIndex = args.indexOf('--repo')
    const repoPath = args[repoIndex + 1]
    
    if (!repoPath) {
      console.error('Error: --repo requires a path argument')
      console.error('Usage: npm run analyse -- --repo /path/to/repository')
      process.exit(1)
    }
    
    try {
      await access(repoPath)
    } catch {
      console.error(`Error: Repository path does not exist: ${repoPath}`)
      process.exit(1)
    }
    
    await generateReport(repoPath, 'analysis')
  } else if (args.length > 0 && args[0]) {
    await generateReport(args[0], 'dist')
  } else {
    console.error('Usage:')
    console.error('  npm run start <repo-path>')
    console.error('  npm run analyse -- --repo <repo-path>')
    process.exit(1)
  }
}
```

```typescript
// src/index.ts
if (process.argv[1]?.endsWith('index.ts')) {
  const args = process.argv.slice(2)
  await handleCLI(args)
}
```

### Risk Assessment
- **Low risk** - Only converting sync operations to async
- **No breaking changes** - Same functionality, better performance
- **Follows project patterns** - Aligns with async/await style and prevents blocking event loop

## Implementation Notes
Consistent async usage prevents blocking the event loop.