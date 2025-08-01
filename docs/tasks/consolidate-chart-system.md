# Chart System Consolidation Plan

## Overview
Consolidate the entire chart visualization system from 2,492 lines across 12 files into a single, data-driven implementation of ~800 lines. This addresses the largest complexity hotspot in the codebase while eliminating duplication and global state management.

**Note:** This plan supersedes the charts-modularization-plan.md (now deleted) which focused on splitting files without addressing the underlying duplication. While that plan was partially implemented (extracted 5 chart modules), this consolidation plan takes a fundamentally different approach to eliminate the root causes of complexity.

## Current State Analysis
Based on code examination:
- **Total lines**: 2,492 across chart system
- **Main files**: charts.ts (1,193 lines), plus 10 chart modules (57-324 lines each)
- **Chart types identified**: 11 distinct charts
  - timeSlider, growth, categoryLines, commitActivity, fileTypes
  - topFilesSize, topFilesChurn, topFilesComplex
  - fileHeatmap, contributors, wordCloud
- **Axis toggle charts**: growth and categoryLines (both have date/commit toggle)
- **Global state usage**: All charts use chartRefs and chartData from chart-state.ts

## Current Problems
1. **Monolithic `charts.ts`** - 1,193 lines with mixed responsibilities
2. **Duplicate chart modules** - 6 files with ~300 lines each, mostly identical patterns
3. **Global state anti-patterns** - `chartRefs` and `chartData` managed globally
4. **Repeated axis toggle logic** - Despite `chart-toggle-utils.ts`, duplication remains
5. **Inconsistent patterns** - Each chart handles configuration differently

## Detailed Implementation Plan

### Commit 1: Create Chart Configuration System (Foundation)
**Goal**: Establish the data-driven architecture without breaking existing code

1. **Create src/visualization/charts/chart-definitions.ts**
   ```typescript
   import type { ApexOptions } from 'apexcharts'
   
   export interface ChartDefinition {
     type: 'line' | 'area' | 'bar' | 'donut' | 'heatmap' | 'treemap' | 'radialBar' | 'rangeBar'
     hasAxisToggle: boolean
     defaultAxis?: 'date' | 'commit' 
     height: number
     elementId: string
     dataFormatter: (data: any, options?: any) => any
     optionsBuilder: (series: any, config?: any) => ApexOptions
   }
   
   // Start with simplest chart as proof of concept
   export const CHART_DEFINITIONS: Record<string, ChartDefinition> = {
     contributors: {
       type: 'bar',
       hasAxisToggle: false,
       height: 350,
       elementId: 'contributorsChart',
       dataFormatter: (contributors: ContributorStats[], limit = 10) => {
         const topContributors = contributors.slice(0, limit)
         return [{
           data: topContributors.map(c => ({
             x: c.name,
             y: c.commits,
             meta: c // Store full data for tooltip
           }))
         }]
       },
       optionsBuilder: (series) => ({
         chart: {
           type: 'bar',
           height: 350,
           toolbar: { show: false },
           background: '#ffffff'
         },
         series,
         plotOptions: {
           bar: {
             horizontal: true,
             distributed: true,
             dataLabels: { position: 'top' }
           }
         },
         colors: ['#FFB6C1', '#FFDAB9', '#FFE4B5', '#D8BFD8', '#87CEEB', 
                  '#98D8C8', '#B0C4DE', '#E6E6FA', '#F0E68C', '#D3D3D3'],
         // ... rest of options from contributors-chart.ts
       })
     }
   }
   ```

2. **Create src/visualization/charts/chart-factory.ts**
   ```typescript
   import { CHART_DEFINITIONS } from './chart-definitions.js'
   
   export function createChart(
     chartType: keyof typeof CHART_DEFINITIONS,
     data: any,
     options?: any
   ): ApexCharts | null {
     const definition = CHART_DEFINITIONS[chartType]
     if (!definition) return null
     
     const container = document.getElementById(definition.elementId)
     if (!container) return null
     
     const series = definition.dataFormatter(data, options)
     const chartOptions = definition.optionsBuilder(series, options)
     
     const chart = new (window as any).ApexCharts(container, chartOptions)
     chart.render()
     
     return chart
   }
   ```

3. **Test with renderContributorsChart**
   - Temporarily modify contributors-chart.ts to use new system
   - Verify identical rendering
   - Revert changes (keep both implementations during migration)

### Commit 2: Create Chart Manager (State Management)
**Goal**: Replace global state with encapsulated state management

1. **Create src/visualization/charts/chart-manager.ts**
   ```typescript
   export class ChartManager {
     private charts = new Map<string, { 
       instance: ApexCharts, 
       data: any,
       definition: ChartDefinition 
     }>()
     
     register(id: string, instance: ApexCharts, data: any, definition: ChartDefinition) {
       this.charts.set(id, { instance, data, definition })
     }
     
     get(id: string) {
       return this.charts.get(id)
     }
     
     destroy(id: string) {
       const chart = this.charts.get(id)
       if (chart) {
         chart.instance.destroy()
         this.charts.delete(id)
       }
     }
     
     destroyAll() {
       this.charts.forEach(({ instance }) => instance.destroy())
       this.charts.clear()
     }
     
     // File type filtering support
     updateWithFileTypeFilter(fileType: string | null) {
       // Update relevant charts based on filter
     }
   }
   ```

2. **Update chart-factory.ts to use manager**
   ```typescript
   export function createChart(
     manager: ChartManager,
     chartType: string,
     data: any,
     options?: any
   ): ApexCharts | null {
     const chart = createChartInternal(chartType, data, options)
     if (chart) {
       const definition = CHART_DEFINITIONS[chartType]
       manager.register(chartType, chart, data, definition)
     }
     return chart
   }
   ```

### Commit 3: Migrate Simple Charts (No Toggles)
**Goal**: Migrate charts without axis toggles to prove the pattern works

1. **Add to chart-definitions.ts:**
   - fileTypes (donut chart)
   - wordCloud (treemap)
   - contributorsChart (already done)
   - fileHeatmap (heatmap)
   - commitActivity (rangeBar)

2. **Update charts.ts to use new system for these charts**
   ```typescript
   // Before:
   renderContributorsChart(data.contributors, limit)
   
   // After:
   createChart(manager, 'contributors', data.contributors, { limit })
   ```

3. **Keep old implementations but mark as deprecated**

### Commit 4: Implement Unified Axis Toggle System  
**Goal**: Consolidate axis toggle logic for growth and categoryLines charts

1. **Create src/visualization/charts/chart-toggles.ts**
   ```typescript
   export function setupAxisToggle(
     manager: ChartManager,
     chartId: string,
     toggleElementPrefix: string
   ) {
     const dateBtn = document.getElementById(`${toggleElementPrefix}Date`)
     const commitBtn = document.getElementById(`${toggleElementPrefix}Commit`)
     
     const updateAxis = (mode: 'date' | 'commit') => {
       const chart = manager.get(chartId)
       if (!chart) return
       
       localStorage.setItem(`${chartId}XAxis`, mode)
       
       // Destroy and recreate with new axis
       manager.destroy(chartId)
       createChart(manager, chartId, chart.data, { axisMode: mode })
     }
     
     dateBtn?.addEventListener('change', () => {
       if ((dateBtn as HTMLInputElement).checked) updateAxis('date')
     })
     
     commitBtn?.addEventListener('change', () => {
       if ((commitBtn as HTMLInputElement).checked) updateAxis('commit')  
     })
   }
   ```

2. **Add growth and categoryLines to chart-definitions.ts**
   - Include both date and commit formatters
   - Use axisMode option to determine which to use

### Commit 5: Migrate Complex Charts
**Goal**: Migrate the remaining complex charts

1. **Migrate timeSlider chart**
   - Special handling for brush selection
   - Integration with other charts

2. **Migrate topFiles charts (3 variants)**
   - Size, churn, complexity
   - Share common configuration

3. **Migrate user-defined charts**
   - Dynamic chart generation
   - Use factory pattern for each

### Commit 6: Remove Old Implementation
**Goal**: Clean up all deprecated code

1. **Delete old chart module files:**
   - contributors-chart.ts ✓
   - file-types-chart.ts ✓
   - word-cloud-chart.ts ✓
   - file-heatmap-chart.ts ✓
   - commit-activity-chart.ts ✓
   - growth-chart.ts ✓
   - category-lines-chart.ts ✓

2. **Delete deprecated utilities:**
   - chart-state.ts (replaced by ChartManager)
   - chart-toggle-utils.ts (replaced by chart-toggles.ts)

3. **Simplify charts.ts:**
   - Remove all old render functions
   - Keep only HTML generation and initialization
   - Update renderAllCharts to use manager

### Commit 7: Final Integration and Testing
**Goal**: Ensure everything works together seamlessly

1. **Update charts.ts exports**
2. **Update build configuration if needed**
3. **Run full test suite**
4. **Manual testing of all charts**
5. **Performance comparison**

## Key Implementation Details

### Chart Definition Structure
Each chart will be defined as a configuration object containing:
- **type**: ApexCharts chart type
- **elementId**: DOM element ID for rendering
- **height**: Chart height in pixels
- **hasAxisToggle**: Whether chart supports date/commit axis toggle
- **dataFormatter**: Function to transform raw data into ApexCharts series format
- **optionsBuilder**: Function to build ApexCharts options object

### State Management Strategy
- Replace global `chartRefs` and `chartData` with encapsulated ChartManager
- Each chart registration includes instance, data, and definition
- File type filtering handled through manager methods
- No more global state pollution or circular dependencies

### Axis Toggle Consolidation
- Single toggle handler for all charts with axis support
- Store preference in localStorage with consistent keys
- Destroy and recreate charts on axis change (ApexCharts pattern)
- Unified button state management

### Migration Strategy
- Build new system alongside existing code
- Migrate one chart at a time, starting with simplest
- Validate each migration before proceeding
- Delete old code only after full migration complete

## Expected Outcomes
- **Code reduction**: ~2,500 lines → ~800 lines (68% reduction)
- **File reduction**: 7 files → 4 files
- **Duplication eliminated**: No more repeated ApexCharts configs
- **Global state removed**: Explicit state management
- **Maintainability improved**: Single pattern for all charts
- **Testing simplified**: Can test chart configs in isolation

## Risks and Mitigations
1. **Risk**: Breaking existing functionality
   - **Mitigation**: Implement alongside existing code, migrate gradually

2. **Risk**: Performance regression
   - **Mitigation**: Chart configs are static, no runtime overhead

3. **Risk**: Customization limitations
   - **Mitigation**: `optionsBuilder` allows chart-specific customization

## Success Criteria
- All charts render identically to current implementation
- Axis toggles work for all applicable charts
- No global state dependencies
- Code coverage maintained or improved
- Performance metrics unchanged

## File Changes Summary by Commit

### Commit 1: Foundation
- **Add**: src/visualization/charts/chart-definitions.ts (~100 lines)
- **Add**: src/visualization/charts/chart-factory.ts (~50 lines)
- **Modify**: None (building alongside existing)

### Commit 2: State Management  
- **Add**: src/visualization/charts/chart-manager.ts (~80 lines)
- **Modify**: src/visualization/charts/chart-factory.ts (integrate manager)

### Commit 3: Simple Charts
- **Modify**: src/visualization/charts/chart-definitions.ts (add 5 charts)
- **Modify**: src/visualization/charts.ts (use factory for simple charts)

### Commit 4: Axis Toggles
- **Add**: src/visualization/charts/chart-toggles.ts (~60 lines)
- **Modify**: src/visualization/charts/chart-definitions.ts (add growth, categoryLines)
- **Modify**: src/visualization/charts.ts (use new toggle system)

### Commit 5: Complex Charts
- **Modify**: src/visualization/charts/chart-definitions.ts (add remaining charts)
- **Modify**: src/visualization/charts.ts (complete migration)

### Commit 6: Cleanup
- **Delete**: 7 chart module files (315 + 324 + 150 + 117 + 80 + 63 + 57 = 1,106 lines)
- **Delete**: chart-state.ts (39 lines)
- **Delete**: chart-toggle-utils.ts (99 lines)
- **Modify**: src/visualization/charts.ts (remove ~900 lines)

### Commit 7: Final
- **Modify**: src/visualization/charts/index.ts (update exports)
- **Add**: Tests for new system
- **Update**: Documentation

## Total Impact
- **Lines removed**: ~2,250
- **Lines added**: ~800
- **Net reduction**: ~1,450 lines (58% reduction)
- **Files removed**: 9
- **Files added**: 4
- **Net file reduction**: 5 files