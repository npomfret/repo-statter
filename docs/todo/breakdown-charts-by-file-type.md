# Plan: Breakdown Charts by File Type Category

## Objective
Enhance the "Lines of Code" and "Repository Size" charts to display a breakdown of file types by category (e.g., Application Code, Tests, Build, Documentation, Other). This will provide a more insightful view of the repository's composition over time, rather than just showing a total.

## Analysis of Current Implementation

After examining the codebase, I found:

- **Time Series Data**: Uses `TimeSeriesPoint` interface with simple number fields for metrics
- **File Type Stats**: Already exists in `src/data/file-calculator.ts` with `FileTypeStats` interface
- **Chart Rendering**: Uses ApexCharts with TypeScript classes in `src/charts/` directory  
- **Data Flow**: Git parsing → data transformation → report generation with self-contained HTML

## Detailed Implementation Plan

### Step 1: Create File Category Mapping
**File**: `src/utils/file-categories.ts` (new file)
**Action**: Create categorization logic that leverages existing `FILE_TYPE_MAP` from file-calculator.ts

```typescript
export type FileCategory = 'Application' | 'Test' | 'Build' | 'Documentation' | 'Other';

export function getFileCategory(filePath: string): FileCategory {
  // Use existing file type detection logic
  const fileType = getFileType(filePath);
  
  // Map file types to categories
  const categoryMap: Record<string, FileCategory> = {
    'TypeScript': 'Application',
    'JavaScript': 'Application', 
    'Python': 'Application',
    'Java': 'Application',
    'C++': 'Application',
    'C': 'Application',
    'Go': 'Application',
    'Rust': 'Application',
    'PHP': 'Application',
    'Ruby': 'Application',
    'Swift': 'Application',
    'Kotlin': 'Application',
    'Scala': 'Application',
    'C#': 'Application',
    'Dart': 'Application',
    'JSON': 'Build',
    'YAML': 'Build', 
    'XML': 'Build',
    'Shell': 'Build',
    'Dockerfile': 'Build',
    'Makefile': 'Build',
    'Markdown': 'Documentation',
    'Text': 'Documentation',
  };
  
  // Special handling for test files
  if (filePath.includes('.test.') || filePath.includes('.spec.') || 
      filePath.includes('test/') || filePath.includes('tests/') ||
      filePath.includes('__tests__/')) {
    return 'Test';
  }
  
  return categoryMap[fileType] || 'Other';
}
```

### Step 2: Update Data Structures
**File**: `src/data/time-series-transformer.ts`
**Action**: Extend `TimeSeriesPoint` interface to include category breakdown

```typescript
interface CategoryBreakdown {
  total: number;
  application: number;
  test: number;
  build: number;
  documentation: number;
  other: number;
}

interface TimeSeriesPoint {
  date: string;
  commits: number;
  linesAdded: CategoryBreakdown;
  linesDeleted: CategoryBreakdown;
  cumulativeLines: CategoryBreakdown;
  bytesAdded: CategoryBreakdown;
  bytesDeleted: CategoryBreakdown;
  cumulativeBytes: CategoryBreakdown;
}
```

### Step 3: Update Time Series Calculation
**File**: `src/data/time-series-transformer.ts`
**Action**: Modify `getTimeSeriesData` to aggregate by category

Logic:
1. For each commit in time bucket, categorize file changes
2. Aggregate lines/bytes by category
3. Calculate cumulative totals per category
4. Maintain backwards compatibility with existing charts

### Step 4: Update Chart Classes
**File**: `src/charts/growth-over-time.ts`
**Action**: Modify to support stacked area charts with category breakdown

```typescript
// Add toggle for total vs breakdown view
// Create series array with one series per category
// Use ApexCharts stacked area configuration
```

### Step 5: Update Report Generation
**File**: `src/report/generator.ts`
**Action**: Pass category breakdown data to charts

### Step 6: Add UI Controls
**File**: `src/report/template.html`
**Action**: Add toggle switch to choose between total and breakdown view

## Minimal Implementation Steps

### Phase 1: Core Infrastructure (1 commit)
- Create `src/utils/file-categories.ts` 
- Update `TimeSeriesPoint` interface
- Update time series calculation logic

### Phase 2: Chart Integration (1 commit)
- Modify growth-over-time chart to support breakdown
- Add UI toggle for total vs breakdown view

### Phase 3: Testing & Polish (1 commit)
- Test with various repositories
- Ensure charts render correctly
- Add any missing category mappings

## Risk Assessment
- **Low Risk**: Builds on existing file type detection
- **Backwards Compatible**: Maintains existing chart functionality
- **Performance**: Minimal overhead as categorization happens during existing file processing
- **Testing**: Can use existing test repositories to validate

## Next Steps
1. Create file categorization utility
2. Update time series data structure
3. Implement breakdown calculation
4. Update chart rendering
5. Add UI controls
6. Test and validate

This approach leverages the existing robust file type detection and chart infrastructure while adding the requested category breakdown functionality.
