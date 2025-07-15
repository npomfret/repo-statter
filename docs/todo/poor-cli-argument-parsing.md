# Poor CLI Argument Parsing

## Problem
- **Location**: `src/cli/handler.ts:4-34`
- **Description**: Manual array manipulation for CLI parsing instead of proper argument parser
- **Current vs Expected**: Manual indexOf/slice operations vs proper CLI library

## Solution
Use a proper CLI argument parsing library:

```typescript
import { program } from 'commander'

export function handleCLI(args: string[]): void {
  program
    .name('repo-statter')
    .description('Generate repository statistics and reports')
    .version('1.0.0')
    
  program
    .command('analyse')
    .description('Analyze a repository')
    .option('-r, --repo <path>', 'Repository path')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .action(async (options) => {
      const repoPath = options.repo || process.cwd()
      await generateReport(repoPath, options.output)
    })
    
  program.parse(args, { from: 'user' })
}
```

Add commander to dependencies:
```bash
npm install commander
npm install --save-dev @types/commander
```

## Impact
- **Type**: Behavior change - better CLI experience
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Medium impact - more robust CLI

## Implementation Notes
Commander.js is a well-established library that handles edge cases and provides better help text.