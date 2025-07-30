# Charts Modularization Plan

## Problem Statement

The `src/visualization/charts.ts` file is a 2,336-line monolith that violates core engineering principles:
- Massive maintenance burden (15+ chart functions in one file)
- No modularity - can't work on one chart without affecting others
- Complex bundling requirements with special esbuild scripts
- Global state management through `chartRefs` and `chartData` objects
- Hard to test individual chart components
- Browser/Node code mixing requiring custom bundling

## Solution Overview

Split the monolithic charts file into individual, focused chart modules with a lightweight coordinator to manage shared state and interactions.

## Implementation Plan

### Phase 1: Extract Individual Chart Modules

Create separate files for each chart type:

```
src/visualization/charts/
├── base-chart.ts           # Common chart utilities and interfaces
├── contributors-chart.ts   # renderContributorsChart()
├── file-types-chart.ts     # renderFileTypesChart()
├── growth-chart.ts         # renderGrowthChart()
├── category-lines-chart.ts # renderCategoryLinesChart()
├── commit-activity-chart.ts # renderCommitActivityChart()
├── word-cloud-chart.ts     # renderWordCloudChart()
├── file-heatmap-chart.ts   # renderFileHeatmapChart()
├── top-files-chart.ts      # renderTopFilesChart()
├── time-slider-chart.ts    # renderTimeSliderChart()
├── user-charts.ts          # renderUserCharts() + related functions
├── awards-renderer.ts      # renderAwards() - not a chart but awards display
└── chart-coordinator.ts    # Manages chartRefs, chartData, and interactions
```

### Phase 2: Create Chart Coordinator

Replace global `chartRefs` and `chartData` with a proper coordinator:

```typescript
// chart-coordinator.ts
export class ChartCoordinator {
  private chartRefs: Map<string, any> = new Map()
  private chartData: Map<string, any> = new Map()
  
  registerChart(id: string, chartInstance: any): void
  getChart(id: string): any | undefined
  updateTargetCharts(min: number, max: number): void
  // ... other coordination methods
}
```

### Phase 3: Standardize Chart Interface

Each chart module follows a consistent pattern:

```typescript
// base-chart.ts
export interface ChartModule {
  render(containerId: string, data: any, config?: any): Promise<any>
  update?(data: any): void
  destroy?(): void
}

export abstract class BaseChart implements ChartModule {
  // Common utilities like formatBytes, showChartError, etc.
}
```

### Phase 4: Update Build System

- Remove special `prebundle-charts.js` script
- Use standard TypeScript module resolution
- Update `chart-manager.ts` to work with new modular system
- Ensure browser bundling works with standard imports

### Phase 5: Update Main Entry Point

Replace `renderAllCharts()` with coordinator-based approach:

```typescript
// charts/index.ts
export { ChartCoordinator } from './chart-coordinator.js'
export * from './contributors-chart.js'
export * from './growth-chart.js'
// ... other exports

// Main render function
export async function renderAllCharts(data: ChartData): Promise<void> {
  const coordinator = new ChartCoordinator()
  
  // Render each chart independently
  await Promise.allSettled([
    new ContributorsChart(coordinator).render('contributorsChart', data.contributors),
    new GrowthChart(coordinator).render('growthChart', { linearSeries: data.linearSeries, timeSeries: data.timeSeries }),
    // ... etc
  ])
}
```

## Migration Strategy

### Step 1: Extract One Chart Module
- Start with `contributors-chart.ts` (simplest, ~80 lines)
- Create base infrastructure (BaseChart, ChartCoordinator skeleton)
- Update tests to verify functionality

### Step 2: Extract Time-Critical Charts
- `time-slider-chart.ts` (controls other charts)
- `growth-chart.ts` (frequently modified)
- Ensure time slider interactions still work

### Step 3: Extract Remaining Charts
- Move remaining chart functions one by one
- Test each extraction thoroughly

### Step 4: Clean Up
- Remove original `charts.ts` file
- Update build scripts
- Remove special bundling requirements
- Update documentation

## Testing Strategy

- Each chart module gets its own test file
- Mock ChartCoordinator for isolated testing
- Integration tests for chart interactions
- Visual regression tests for chart appearance

## Benefits

1. **Maintainability**: Work on individual charts without affecting others
2. **Testability**: Isolated unit tests for each chart type
3. **Performance**: Lazy loading of chart modules if needed
4. **Clarity**: Clear separation of concerns
5. **Build Simplicity**: Standard TypeScript imports, no special bundling
6. **Follows Directives**: Aggressive deletion of complex abstractions

## Risk Mitigation

- Maintain backward compatibility during transition
- Extensive testing of chart interactions (especially time slider)
- Gradual migration - one chart at a time
- Keep original file until all charts are extracted and tested

## Success Metrics

- [ ] `charts.ts` file eliminated
- [ ] Each chart in separate, focused file (<200 lines each)
- [ ] No special bundling scripts required
- [ ] All chart interactions work (time slider, filtering)
- [ ] Individual chart unit tests pass
- [ ] Build time and bundle size maintained or improved