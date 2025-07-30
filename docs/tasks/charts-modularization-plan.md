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

## Detailed Implementation Plan

### Phase 1: Extract Shared Utilities

Create foundation files first:
- `src/visualization/charts/chart-utils.ts` - formatBytes, showChartError, common utilities
- `src/visualization/charts/chart-state.ts` - chartRefs, chartData, selectedFileType globals

### Phase 2: Extract Individual Chart Functions (Minimal Approach)

Keep existing function signature pattern but split into focused files:

```
src/visualization/charts/
├── chart-utils.ts          # formatBytes, showChartError, etc.
├── chart-state.ts          # chartRefs, chartData, selectedFileType
├── contributors-chart.ts   # renderContributorsChart() 
├── file-types-chart.ts     # renderFileTypesChart()
├── growth-chart.ts         # renderGrowthChart()
├── category-lines-chart.ts # renderCategoryLinesChart()
├── commit-activity-chart.ts # renderCommitActivityChart()
├── word-cloud-chart.ts     # renderWordCloudChart()
├── file-heatmap-chart.ts   # renderFileHeatmapChart()
├── top-files-chart.ts      # renderTopFilesChart() + renderTopFilesChartWithFilter()
├── time-slider-chart.ts    # renderTimeSliderChart() + updateTargetCharts()
├── user-charts.ts          # renderUserCharts() + renderUserChart() + renderUserActivityChart()
├── awards-renderer.ts      # renderAwards()
└── index.ts                # Export all functions + renderAllCharts()
```

### Phase 3: Maintain Current API

Keep exact same function signatures and behavior:
- Each chart file exports its render function(s)
- All functions use shared chartRefs/chartData from chart-state.ts
- Main index.ts re-exports everything to maintain API compatibility
- renderAllCharts() function works exactly as before

### Phase 4: Update Build System

Current bundling approach works fine - just point to new index.ts:
- Update `scripts/prebundle-charts.js` entryPoint to `src/visualization/charts/index.ts`
- Keep IIFE bundling for browser compatibility
- No changes to chart-manager.ts needed

## Migration Strategy (Small Commits)

### Commit 1: Create Foundation
- Create `src/visualization/charts/` directory
- Extract `chart-utils.ts` with formatBytes, showChartError utilities
- Extract `chart-state.ts` with chartRefs, chartData, selectedFileType globals
- Create empty `index.ts` that imports from ../charts.ts (no-op change)

### Commit 2: Extract Simple Charts (Low Risk)
- `contributors-chart.ts` - renderContributorsChart() (~80 lines)
- `file-types-chart.ts` - renderFileTypesChart() (~60 lines) 
- Update index.ts to re-export these functions
- Test functionality

### Commit 3: Extract Independent Charts
- `word-cloud-chart.ts` - renderWordCloudChart() (~56 lines)
- `file-heatmap-chart.ts` - renderFileHeatmapChart() (~115 lines)
- `commit-activity-chart.ts` - renderCommitActivityChart() (~89 lines)
- Test functionality

### Commit 4: Extract Complex Charts
- `growth-chart.ts` - renderGrowthChart() (~347 lines)
- `category-lines-chart.ts` - renderCategoryLinesChart() (~319 lines)
- Test chart interactions

### Commit 5: Extract Time-Critical Components
- `time-slider-chart.ts` - renderTimeSliderChart() + updateTargetCharts() (~275 lines)
- This is critical - test time slider interactions thoroughly

### Commit 6: Extract Remaining Components
- `top-files-chart.ts` - renderTopFilesChart() + renderTopFilesChartWithFilter() (~170 lines)
- `user-charts.ts` - renderUserCharts() + helpers (~289 lines)
- `awards-renderer.ts` - renderAwards() (~254 lines)

### Commit 7: Update Build System
- Update `scripts/prebundle-charts.js` to point to new index.ts
- Remove original `charts.ts` file
- Verify bundling works correctly

### Commit 8: Add Tests
- Create individual test files for each chart module
- Test chart interactions and functionality

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