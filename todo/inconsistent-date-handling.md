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

## Implementation Notes
This makes the date handling logic more readable and reusable.