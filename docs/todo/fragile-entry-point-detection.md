# Fragile Entry Point Detection

## Problem
- **Location**: `src/index.ts:11`
- **Description**: Using `process.argv[1]?.endsWith('index.ts')` to detect CLI execution is unreliable and breaks when the file is compiled or run from different locations
- **Current vs Expected**: Fragile string matching vs robust entry point detection

## Solution
Use a more robust approach to detect CLI execution:

```typescript
// Option 1: Use import.meta.url (modern approach)
const isMainModule = import.meta.url === `file://${process.argv[1]}`

// Option 2: Use require.main pattern (traditional)
const isMainModule = require.main === module

// Option 3: Use explicit CLI entry point
// Create src/cli.ts:
import { handleCLI } from './cli/handler.js'

const args = process.argv.slice(2)
handleCLI(args)

// Then update package.json scripts to use src/cli.ts
```

## Impact
- **Type**: Behavior change - improves CLI reliability
- **Risk**: Low (improves robustness)
- **Complexity**: Simple
- **Benefit**: Medium impact - prevents CLI failures in different environments

## Implementation Notes
The third option (separate CLI entry point) is cleanest as it separates concerns between the library API and CLI usage.

## Task Analysis

### Current State
- The project uses `tsx` to run TypeScript files directly
- `process.argv[1]?.endsWith('index.ts')` in `src/index.ts:12` detects CLI execution
- Package.json scripts use `tsx src/index.ts` for both `start` and `analyse` commands
- The project exports library functions from index.ts for programmatic use

### Problem Validation
This is a valid and worthwhile issue:
- The current check fails when the file is compiled or run from different paths
- It relies on the exact filename ending, which is fragile
- Won't work correctly if the file is compiled to JavaScript or bundled

### Implementation Plan

**Chosen Approach**: Option 3 - Separate CLI entry point

This is the best approach because:
1. Clean separation of concerns between library API and CLI
2. No need for runtime detection hacks
3. Works reliably regardless of how the code is executed
4. Follows common Node.js patterns

**Steps**:
1. Create `src/cli.ts` as the dedicated CLI entry point
2. Move the CLI execution logic from `src/index.ts` to `src/cli.ts`
3. Update `package.json` scripts to use `src/cli.ts`
4. Remove the fragile detection code from `src/index.ts`
5. Run tests and typecheck to ensure everything works

**Files to modify**:
- Create: `src/cli.ts`
- Modify: `src/index.ts` (remove lines 12-18)
- Modify: `package.json` (update start and analyse scripts)

**Commit size**: Small - this is a simple refactoring that can be done in a single commit