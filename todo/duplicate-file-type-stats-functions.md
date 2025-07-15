# Duplicate File Type Stats Functions

## Problem
- **Location**: `src/stats/calculator.ts:39-58` and `src/report/renderer.ts:72-91`
- **Description**: The `getFileTypeStats` function is duplicated across two files with identical logic
- **Current vs Expected**: Two identical functions exist vs single implementation imported where needed

## Solution
Remove the duplicate function from `src/report/renderer.ts` and import it from `src/stats/calculator.ts`:

```typescript
// In src/report/renderer.ts, remove lines 72-91 and add import:
import { getFileTypeStats } from '../stats/calculator.js'
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low 
- **Complexity**: Simple
- **Benefit**: Quick win - reduces code duplication

## Implementation Notes
The function in `src/stats/calculator.ts` should be kept as it's the canonical location for statistics calculations.