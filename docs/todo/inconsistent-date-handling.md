# Inconsistent Date Handling

## Problem
- **Location**: `src/chart/data-transformer.ts:42-44`, `src/chart/data-transformer.ts:62-64`
- **Description**: Complex date key generation with inconsistent logic for hourly vs daily grouping
- **Current vs Expected**: Complex date manipulation vs cleaner date handling utilities

## Solution
Create utility functions for date handling:

```typescript
function getDateKey(date: Date, useHourly: boolean): string {
  if (useHourly) {
    return date.toISOString().slice(0, 13) + ':00:00'
  }
  return date.toISOString().split('T')[0]!
}

function getStartDateKey(firstCommitDate: Date, useHourly: boolean): string {
  const startDate = new Date(firstCommitDate)
  if (useHourly) {
    startDate.setHours(startDate.getHours() - 1)
  } else {
    startDate.setDate(startDate.getDate() - 1)
  }
  return getDateKey(startDate, useHourly)
}

export function getTimeSeriesData(commits: CommitData[]): TimeSeriesPoint[] {
  if (commits.length === 0) return []
  
  const repoAgeHours = getRepoAgeInHours(commits)
  const useHourlyData = repoAgeHours < 48
  
  const firstCommit = commits[0]
  if (!firstCommit) return []
  
  const timeSeriesMap = new Map<string, TimeSeriesPoint>()
  
  // Add zero starting point
  const startDateKey = getStartDateKey(new Date(firstCommit.date), useHourlyData)
  timeSeriesMap.set(startDateKey, {
    date: startDateKey,
    commits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    cumulativeLines: 0,
    bytesAdded: 0,
    bytesDeleted: 0,
    cumulativeBytes: 0
  })
  
  // ... rest of function using getDateKey()
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Quick win - cleaner code

## Analysis
Current implementation in `src/data/time-series-transformer.ts` has duplicate date key logic:
- Lines 38-40: `startDateKey` generation with conditional logic
- Lines 57-59: `dateKey` generation with identical conditional logic
- Lines 29-34: Similar start date calculation logic

The logic is duplicated and inconsistent, making it error-prone and hard to maintain.

## Implementation Plan

### Step 1: Create date utility functions
Add helper functions to the top of `src/data/time-series-transformer.ts`:

```typescript
function getDateKey(date: Date, useHourly: boolean): string {
  if (useHourly) {
    return date.toISOString().slice(0, 13) + ':00:00'
  }
  return date.toISOString().split('T')[0]!
}

function getStartDateKey(firstCommitDate: Date, useHourly: boolean): string {
  const startDate = new Date(firstCommitDate)
  if (useHourly) {
    startDate.setHours(startDate.getHours() - 1)
  } else {
    startDate.setDate(startDate.getDate() - 1)
  }
  return getDateKey(startDate, useHourly)
}
```

### Step 2: Refactor getTimeSeriesData function
1. **Replace lines 29-40** with:
   ```typescript
   const startDateKey = getStartDateKey(firstCommitDate, useHourlyData)
   ```

2. **Replace lines 57-59** with:
   ```typescript
   const dateKey = getDateKey(new Date(commit.date), useHourlyData)
   ```

### Step 3: Testing
1. Run `npm run test` to ensure no regressions
2. Run `npm run typecheck` to verify TypeScript compilation
3. Test with `npm run analyse test-repo -- --output test-repo.html`
4. Verify time series data is identical to before refactoring

## Benefits
- **Eliminates code duplication** - Single source of truth for date key generation
- **Improves maintainability** - Changes to date logic only need to be made in one place
- **Reduces error potential** - No risk of the two date key generation methods diverging
- **Cleaner code** - More readable and self-documenting

## Implementation Notes
This is a pure refactoring that doesn't change behavior, only improves code organization. The date handling logic becomes more readable and reusable.