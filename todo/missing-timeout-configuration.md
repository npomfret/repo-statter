# Missing Timeout Configuration for Shell Commands

## Problem
- **Location**: `src/git/parser.ts:174-209` (various shell commands)
- **Description**: Shell commands in git parser have no timeout configuration, which can cause the tool to hang indefinitely on large repositories or slow filesystems
- **Current vs Expected**: No timeouts vs configurable timeouts for all shell operations

## Solution
Add timeout configuration to all shell commands:

```typescript
const DEFAULT_TIMEOUT = 30000 // 30 seconds

async function execWithTimeout(command: string, options: { timeout?: number } = {}): Promise<string> {
  const { timeout = DEFAULT_TIMEOUT } = options
  
  try {
    const { stdout } = await execAsync(command, { timeout })
    return stdout.trim()
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Command timed out after ${timeout}ms: ${command}`)
    }
    throw error
  }
}

// Use in parseCommitDiff:
const diffOutput = await execWithTimeout(
  `cd ${JSON.stringify(repoPath)} && git show ${commitHash} --name-only --format=""`,
  { timeout: 15000 }
)
```

## Impact
- **Type**: Behavior change - prevents hanging
- **Risk**: Low (adds timeout protection)
- **Complexity**: Simple
- **Benefit**: Medium impact - prevents tool from hanging on slow operations

## Implementation Notes
Consider making timeout configurable through environment variables or config files for different use cases.