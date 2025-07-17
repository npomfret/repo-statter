# Poor CLI Argument Parsing

## Problem
- **Location**: `src/cli/handler.ts:4-34`
- **Description**: Manual array manipulation for CLI parsing instead of proper argument parser
- **Current vs Expected**: Manual indexOf/slice operations vs proper CLI library

## ✅ COMPLETED - TASK IMPLEMENTED SUCCESSFULLY

After reviewing the current implementation in `src/cli/handler.ts`, the manual CLI parsing is indeed problematic:
- Uses `args.indexOf('--repo')` and `args[repoIndex + 1]` for argument extraction
- Manual validation and error handling
- No proper help text generation
- Doesn't handle edge cases (missing values, invalid combinations)

## DETAILED IMPLEMENTATION PLAN

### Step 1: Install commander dependency
```bash
npm install commander
npm install --save-dev @types/commander
```

### Step 2: Replace manual parsing with commander
Current logic analysis:
- Supports `--repo <path>` format
- Supports positional argument format (just `<path>`)
- Outputs to 'analysis' when using `--repo`, 'dist' when using positional
- Validates git repository before processing

New implementation approach:
```typescript
import { program } from 'commander'

export async function handleCLI(args: string[]): Promise<void> {
  program
    .name('repo-statter')
    .description('Generate repository statistics and reports')
    .version('1.0.0')
    
  program
    .argument('[repo-path]', 'Repository path (defaults to current directory)')
    .option('-r, --repo <path>', 'Repository path (alternative to positional argument)')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .action(async (repoPath, options) => {
      // Logic to handle both positional and --repo argument
      const finalRepoPath = options.repo || repoPath || process.cwd()
      const outputDir = options.repo ? 'analysis' : options.output
      
      // Existing validation and generation logic
      await validateGitRepository(finalRepoPath)
      await generateReport(finalRepoPath, outputDir)
    })
    
  program.parse(args, { from: 'user' })
}
```

### Step 3: Test the implementation
- Test with `npm run analyse -- --repo test-repo`
- Test with `npm run start test-repo`
- Test error cases (missing repo, invalid repo)
- Verify help text with `--help`

## APPROACH DECISION

I'll implement this as a single atomic commit that:
1. Adds commander dependency
2. Replaces manual parsing with commander
3. Maintains exact same behavior but with better error handling and help text
4. Preserves the existing dual-mode behavior (positional vs --repo flag)

This is a perfect small, focused task that improves code quality without changing functionality.

## Impact
- **Type**: Refactoring - better CLI experience
- **Risk**: Low - commander is well-established, behavior preserved
- **Complexity**: Simple - straightforward replacement
- **Benefit**: Better error handling, help text, and maintainability