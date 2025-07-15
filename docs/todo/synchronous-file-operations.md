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

## Implementation Notes
Consistent async usage prevents blocking the event loop.