# Plan: Breakdown Charts by File Type Category

## Objective
Enhance the "Lines of Code" and "Repository Size" charts to display a breakdown of file types by category (e.g., Application Code, Tests, Build, Documentation, Other). This will provide a more insightful view of the repository's composition over time, rather than just showing a total.

## Implementation Plan

### 1. Define File Type Categories
-   **Action**: Create a mapping of file extensions to categories. This logic should be centralized, likely in a new utility file or within `src/utils/exclusions.ts`.
-   **Location**: A new function, e.g., `getFileCategory(filePath: string)`, will be created.

```typescript
// Example implementation in a new file, e.g., src/utils/file-categories.ts

export type FileCategory = 'Application' | 'Test' | 'Build' | 'Documentation' | 'Other';

const categoryMapping: Record<string, FileCategory> = {
  // Application Code
  '.ts': 'Application',
  '.js': 'Application',
  '.tsx': 'Application',
  '.jsx': 'Application',
  // Test Code
  '.test.ts': 'Test',
  '.spec.ts': 'Test',
  '.test.js': 'Test',
  '.spec.js': 'Test',
  // Build & Config
  '.json': 'Build',
  '.sh': 'Build',
  '.yml': 'Build',
  '.yaml': 'Build',
  // Documentation
  '.md': 'Documentation',
  '.txt': 'Documentation',
};

export function getFileCategory(filePath: string): FileCategory {
  for (const extension in categoryMapping) {
    if (filePath.endsWith(extension)) {
      return categoryMapping[extension];
    }
  }
  return 'Other';
}
```

### 2. Update Data Calculation
-   **File**: `src/data/time-series-transformer.ts` (or equivalent)
-   **Action**: Modify the `getTimeSeriesData` function to aggregate stats per category.
    -   The function currently creates a `TimeSeriesPoint` for each time interval with total lines/bytes.
    -   This will be changed to create a `TimeSeriesPoint` that contains nested objects for each category, plus a total.

```typescript
// Example of updated TimeSeriesPoint interface
interface TimeSeriesPoint {
    date: string;
    commits: number;
    linesAdded: { total: number; application: number; test: number; /* ...etc */ };
    linesDeleted: { total: number; application: number; test: number; /* ...etc */ };
    cumulativeLines: { total: number; application: number; test: number; /* ...etc */ };
    // ... same structure for bytes ...
}
```

-   **File**: `src/stats/calculator.ts`
-   **Action**: The `getFileTypeStats` function may need to be updated or supplemented to use the new categorization logic when calculating totals.

### 3. Update Chart Rendering
-   **File**: `src/report/generator.ts` (embedded JavaScript)
-   **Action**: Modify the chart rendering functions (`renderLinesOfCodeChart`, `renderRepositorySizeChart`) to create a stacked area chart.
    -   The `series` option for ApexCharts will be an array of objects, where each object represents a file category.

```javascript
// Example of new series structure for ApexCharts
const linesOfCodeSeries = [
    { name: 'Application', data: [/* ... */] },
    { name: 'Test', data: [/* ... */] },
    { name: 'Build', data: [/* ... */] },
    { name: 'Documentation', data: [/* ... */] },
    { name: 'Other', data: [/* ... */] },
];

// In the chart options:
const options = {
    // ...
    series: linesOfCodeSeries,
    chart: {
        type: 'area',
        stacked: true, // This is the key to creating a stacked chart
    },
    // ...
};
```

### 4. Update Total Size Display
-   **File**: `src/report/template.html`
-   **Action**: The display for total repository size will need to be updated to show the breakdown by category. This could be a small table or a list next to the total.

## Impact
-   **Type**: Feature enhancement.
-   **Risk**: Medium. This change affects core data processing and chart rendering. Careful testing is required to ensure the data is aggregated and displayed correctly.
-   **Complexity**: High. It involves changes to data structures, calculations, and chart configurations.
-   **Benefit**: High. Provides much deeper insight into the nature of the repository's evolution, allowing users to see how different parts of the codebase (app vs. tests) grow over time.
