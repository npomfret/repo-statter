# Chart System Consolidation Plan

## Overview
Consolidate the entire chart visualization system from 2,500+ lines across 7 files into a single, data-driven implementation of ~800 lines. This addresses the largest complexity hotspot in the codebase while eliminating duplication and global state management.

**Note:** This plan supersedes the [charts-modularization-plan.md](./charts-modularization-plan.md) which focused on splitting files without addressing the underlying duplication. While that plan has been partially implemented (extracted 5 chart modules), this consolidation plan takes a fundamentally different approach to eliminate the root causes of complexity.

## Current Problems
1. **Monolithic `charts.ts`** - 1,193 lines with mixed responsibilities
2. **Duplicate chart modules** - 6 files with ~300 lines each, mostly identical patterns
3. **Global state anti-patterns** - `chartRefs` and `chartData` managed globally
4. **Repeated axis toggle logic** - Despite `chart-toggle-utils.ts`, duplication remains
5. **Inconsistent patterns** - Each chart handles configuration differently

## Implementation Plan

### Phase 1: Create Chart Configuration System
1. **Define chart type configurations**
   ```typescript
   // src/visualization/chart-config.ts
   interface ChartDefinition {
     type: 'line' | 'area' | 'bar' | 'heatmap' | 'treemap' | 'radialBar'
     hasAxisToggle: boolean
     defaultAxis?: 'date' | 'commit'
     height?: number
     stacked?: boolean
     dataFormatter: (data: any) => ApexAxisChartSeries
     optionsBuilder?: (data: any) => Partial<ApexCharts.ApexOptions>
   }
   
   export const CHART_DEFINITIONS: Record<string, ChartDefinition> = {
     growth: {
       type: 'area',
       hasAxisToggle: true,
       defaultAxis: 'commit',
       height: 400,
       stacked: true,
       dataFormatter: formatGrowthData
     },
     contributors: {
       type: 'bar',
       hasAxisToggle: false,
       height: 400,
       dataFormatter: formatContributorData
     },
     // ... other charts
   }
   ```

2. **Create unified chart factory**
   ```typescript
   // src/visualization/chart-factory.ts
   export function createChart(
     elementId: string,
     chartType: keyof typeof CHART_DEFINITIONS,
     data: any,
     options?: ChartOptions
   ): ApexCharts {
     const definition = CHART_DEFINITIONS[chartType]
     const series = definition.dataFormatter(data)
     const chartOptions = buildChartOptions(definition, series, options)
     
     const chart = new ApexCharts(
       document.getElementById(elementId),
       chartOptions
     )
     
     return chart.render()
   }
   ```

### Phase 2: Consolidate Axis Toggle Logic
1. **Single toggle handler for all charts**
   ```typescript
   // src/visualization/chart-toggles.ts
   export function setupChartToggles(charts: ChartInstance[]) {
     charts.forEach(({ id, definition, data }) => {
       if (!definition.hasAxisToggle) return
       
       const toggle = document.getElementById(`${id}-toggle`)
       toggle?.addEventListener('change', (e) => {
         const mode = (e.target as HTMLInputElement).value
         updateChartAxis(id, mode, data)
       })
     })
   }
   ```

2. **Remove all individual toggle implementations**
   - Delete toggle logic from growth-chart.ts
   - Delete toggle logic from category-lines-chart.ts
   - Delete toggle logic from user charts in charts.ts

### Phase 3: Eliminate Global State
1. **Replace global `chartRefs` and `chartData` with chart manager**
   ```typescript
   // src/visualization/chart-manager.ts
   export class ChartManager {
     private charts = new Map<string, ChartInstance>()
     
     register(id: string, chart: ApexCharts, data: any) {
       this.charts.set(id, { chart, data })
     }
     
     update(id: string, data: any) {
       const instance = this.charts.get(id)
       if (instance) {
         instance.chart.updateSeries(
           instance.definition.dataFormatter(data)
         )
       }
     }
     
     destroy(id: string) {
       const instance = this.charts.get(id)
       instance?.chart.destroy()
       this.charts.delete(id)
     }
   }
   ```

2. **Pass state explicitly instead of global access**

### Phase 4: Unify Chart Rendering
1. **Replace individual render functions with single renderer**
   ```typescript
   // src/visualization/renderer.ts
   export function renderAllCharts(data: ChartData) {
     const manager = new ChartManager()
     
     // Define all charts to render
     const charts = [
       { id: 'growth', type: 'growth', data: data.timeSeries },
       { id: 'contributors', type: 'contributors', data: data.contributors },
       { id: 'fileTypes', type: 'fileTypes', data: data.fileTypes },
       // ... other charts
     ]
     
     // Render all charts
     charts.forEach(({ id, type, data }) => {
       const chart = createChart(id, type, data)
       manager.register(id, chart, data)
     })
     
     // Setup toggles if needed
     setupChartToggles(charts.filter(c => 
       CHART_DEFINITIONS[c.type].hasAxisToggle
     ))
     
     return manager
   }
   ```

### Phase 5: Cleanup and Migration
1. **Delete redundant files**
   - Remove individual chart files (growth-chart.ts, etc.)
   - Remove chart-toggle-utils.ts (logic now unified)
   - Remove chart-state.ts (replaced by ChartManager)

2. **Simplify charts.ts**
   - Reduce from 1,193 lines to ~200 lines
   - Only handle HTML generation and initialization

3. **Update build process**
   - Remove complex bundling logic
   - Single export from chart-manager

## Migration Steps

### Step 0: Acknowledge Current State
The previous modularization effort has already extracted 5 chart modules:
- `word-cloud-chart.ts` ✅
- `file-heatmap-chart.ts` ✅ 
- `commit-activity-chart.ts` ✅
- `growth-chart.ts` ✅
- `category-lines-chart.ts` ✅

This gives us a clearer view of the duplication patterns across charts.

### Step 1: Create New Architecture Alongside Existing
1. **Create new files without breaking existing code**
2. **Build the chart configuration system**
3. **Implement chart factory and manager**

### Step 2: Proof of Concept
1. **Pick the simplest chart (contributors) as first migration**
2. **Implement using new data-driven approach**
3. **Compare code size: ~80 lines → ~20 lines config**
4. **Validate identical rendering**

### Step 3: Gradual Migration
1. **Migrate one chart type at a time**
2. **Start with simpler charts (bar, pie) before complex (growth, category)**
3. **Keep both implementations during transition**
4. **Switch rendering to new system once validated**

### Step 4: Complete Migration
1. **Remove old chart modules once all migrated**
2. **Delete charts-modularization-plan.md as obsolete**
3. **Update all imports and build configuration**

### Step 5: Final Cleanup
1. **Remove chart-toggle-utils.ts** (consolidated into new system)
2. **Remove global state exports**
3. **Simplify build process**
4. **Update documentation**

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