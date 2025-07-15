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