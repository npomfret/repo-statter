# Inconsistent Error Handling Patterns

## Problem
- **Location**: `src/git/parser.ts:87-89`, `src/cli/handler.ts:20-28`
- **Description**: The codebase mixes different error handling patterns: silent failures, process.exit(), and thrown errors, making it hard to debug and handle errors consistently
- **Current vs Expected**: Mixed error handling vs consistent error handling strategy

## Solution
Standardize error handling across the codebase:

```typescript
// Create src/utils/errors.ts
export class RepoStatError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message)
    this.name = 'RepoStatError'
  }
}

export class GitParseError extends RepoStatError {
  constructor(message: string, cause?: Error) {
    super(message, 'GIT_PARSE_ERROR', cause)
  }
}

export class CLIError extends RepoStatError {
  constructor(message: string, cause?: Error) {
    super(message, 'CLI_ERROR', cause)
  }
}

// Use in git parser:
export async function getGitHubUrl(repoPath: string): Promise<string | null> {
  const git = simpleGit(repoPath)
  try {
    const remotes = await git.getRemotes(true)
    // ... existing logic
  } catch (error) {
    throw new GitParseError(`Failed to get GitHub URL for ${repoPath}`, error)
  }
  return null
}

// Use in CLI handler:
export function handleCLI(args: string[]): void {
  try {
    // ... existing logic
  } catch (error) {
    console.error('Error:', error.message)
    if (error instanceof RepoStatError) {
      console.error('Error code:', error.code)
    }
    process.exit(1)
  }
}
```

## Impact
- **Type**: Behavior change - improves error handling
- **Risk**: Low (improves error handling)
- **Complexity**: Moderate
- **Benefit**: High value - better debugging and error handling

## Implementation Notes
Consider adding error logging and structured error reporting for better debugging.