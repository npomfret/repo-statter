# Generator.ts Refactoring Guide

## Overview

The original `generator.ts` file was 1520 lines long and mixed multiple concerns. This refactoring splits it into modular, testable components.

## New Structure

### 1. Type Definitions (`src/types/index.ts`)
- Defines all interfaces and types used across the application
- Replaces `any` types with proper TypeScript interfaces
- Exports: `ChartData`, `FilterState`, `ChartInstances`, `FilteredData`, etc.

### 2. Utility Functions

#### `src/utils/formatters.ts`
- `formatBytes()` - Format byte values with appropriate units
- `formatNumber()` - Format numbers with locale-specific formatting
- `createYAxisFormatter()` - Create formatters for chart Y-axes
- `createTooltipFormatter()` - Create formatters for tooltips
- `truncateMessage()` - Truncate long commit messages

#### `src/utils/chart-builders.ts`
- `buildTimeSeriesData()` - Build time series data for charts
- `buildUserTimeSeriesData()` - Build user-specific time series data

#### `src/utils/tooltip-builders.ts`
- `createCommitTooltip()` - Create tooltips for commit data points
- `createUserChartTooltip()` - Create tooltips for user charts

### 3. Chart Components (`src/charts/`)

#### Base Class (`base-chart.ts`)
- Abstract base class for all charts
- Handles theme detection
- Provides error handling
- Manages chart lifecycle

#### Chart Implementations
- `contributors-chart.ts` - Bar chart for contributor statistics
- `lines-of-code-chart.ts` - Area chart for lines of code growth
- `file-types-chart.ts` - Donut chart for file type distribution
- (Other charts to be implemented following the same pattern)

### 4. Filter Management (`src/filters/`)

#### `filter-manager.ts`
- Manages filter state
- Applies filters to commit data
- Provides filter metadata (authors, file types, date ranges)

#### `data-recalculator.ts`
- Recalculates all derived data when filters change
- Handles contributors, file types, time series, word cloud, etc.

### 5. Chart Manager (`src/charts/chart-manager.ts`)
- Orchestrates all chart rendering
- Manages chart instances
- Handles theme changes
- Provides centralized error handling

### 6. Template Engine (`src/report/`)

#### `template-engine.ts`
- Handles template placeholder replacement
- Validates template structure
- Injects script content

#### `script-builder.ts`
- Builds the client-side JavaScript
- Validates data before injection
- (Future: Can be replaced with bundled modules)

## Migration Path

### Phase 1: Current State
- All new modules are created alongside the existing `generator.ts`
- The original file continues to work unchanged
- New modules can be tested independently

### Phase 2: Gradual Migration
1. Import new utilities into `generator.ts`
2. Replace inline functions with imported ones
3. Test each replacement thoroughly

### Phase 3: Full Migration
1. Create client-side bundle using esbuild/rollup
2. Replace inline script with bundled modules
3. Remove old `generator.ts` file

## Benefits

1. **Testability** - Each module can be unit tested independently
2. **Type Safety** - Full TypeScript support throughout
3. **Maintainability** - Clear separation of concerns
4. **Error Handling** - Comprehensive error handling at each level
5. **Reusability** - Utilities and components can be reused
6. **Performance** - Client bundle can be optimized and cached

## Example Usage

```typescript
import { generateReport } from './report/generator-refactored.js'

// Generate report with full error handling
try {
  await generateReport('./my-repo', 'dist')
} catch (error) {
  console.error('Report generation failed:', error)
}
```

## Testing Strategy

Each module should have corresponding tests:
- `formatters.test.ts` - Test formatting functions
- `chart-builders.test.ts` - Test data transformation
- `filter-manager.test.ts` - Test filtering logic
- `base-chart.test.ts` - Test chart base functionality

## Next Steps

1. Implement remaining chart modules
2. Create comprehensive test suite
3. Set up build process for client bundle
4. Gradually migrate existing code
5. Remove original generator.ts file