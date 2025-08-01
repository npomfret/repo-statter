# Refactor Chart Toggle Duplication

## Problem Statement

The codebase has significant duplication across three chart types (growth, category, and user) for implementing date/commit toggle functionality. Each chart type has:

1. Nearly identical HTML button groups
2. Duplicate event listener setup
3. Similar update functions that differ only in IDs and function names
4. Repeated chart rebuild logic

## Current Duplication

### 1. Toggle Button HTML Pattern
Each chart generates the same button group structure:
```html
<div class="btn-group btn-group-sm mb-3" role="group">
  <input type="radio" class="btn-check" name="[chart]XAxis" id="[chart]XAxisDate" value="date">
  <label class="btn-outline-primary" for="[chart]XAxisDate">By Date</label>
  <input type="radio" class="btn-check" name="[chart]XAxis" id="[chart]XAxisCommit" value="commit" checked>
  <label class="btn-outline-primary" for="[chart]XAxisCommit">By Commit</label>
</div>
```

### 2. Event Listener Pattern
Each chart sets up listeners the same way:
```typescript
dateBtn?.addEventListener('change', () => {
  if ((dateBtn as HTMLInputElement).checked) {
    update[Chart]Axis('date')
  }
})
```

### 3. Update Function Pattern
All update functions follow this structure:
```typescript
function update[Chart]Axis(mode: 'date' | 'commit'): void {
  const chart = chartRefs[chartId]
  const data = chartData[chartId]
  if (!chart || !data) return

  localStorage.setItem(`${chart}XAxis`, mode)
  
  // Update button states
  // Destroy chart
  // Rebuild chart
}
```

## Proposed Solution

### 1. Create a Chart Toggle Configuration Interface
```typescript
interface ChartToggleConfig {
  chartId: string
  storageKey: string
  elementPrefix: string // e.g., 'growth', 'category', 'userChart0'
  renderFunction: (...args: any[]) => void
  renderArgs: any[]
  useClassList?: boolean // for growth chart compatibility
}
```

### 2. Generic Toggle HTML Generator
Create a function to generate toggle button HTML:
```typescript
function createChartToggleHTML(config: ChartToggleConfig, defaultMode: 'date' | 'commit' = 'commit'): string
```

### 3. Generic Update Function
Create a single update function that works for all charts:
```typescript
function updateChartAxis(config: ChartToggleConfig, mode: 'date' | 'commit'): void
```

### 4. Generic Event Listener Setup
Create a function to set up toggle event listeners:
```typescript
function setupChartToggleListeners(config: ChartToggleConfig): void
```

### 5. Migration Strategy

#### Phase 1: Create Generic Functions
1. Add the new generic functions to a shared module (e.g., `chart-toggle-utils.ts`)
2. Test with one chart type first

#### Phase 2: Migrate Existing Charts
1. Update growth chart to use generic functions
2. Update category chart to use generic functions  
3. Update user charts to use generic functions
4. Remove old duplicate code

#### Phase 3: Clean Up
1. Remove individual update functions from exports
2. Update bundle-charts.ts to export only the generic function
3. Update any external references

## Benefits

1. **Reduced Code**: ~200+ lines of duplicate code reduced to ~50 lines
2. **Consistency**: All charts guaranteed to behave the same way
3. **Maintainability**: Changes to toggle behavior only need to be made once
4. **Extensibility**: Easy to add toggle to new chart types

## Implementation Notes

1. Preserve existing localStorage keys for backward compatibility
2. Handle both classList and checked property methods for button state
3. Ensure all existing chart IDs continue to work
4. Add tests for the generic functions

## Files to Modify

1. Create: `src/visualization/charts/chart-toggle-utils.ts`
2. Update: `src/visualization/charts/growth-chart.ts`
3. Update: `src/visualization/charts/category-lines-chart.ts`
4. Update: `src/visualization/charts.ts` (user charts section)
5. Update: `src/build/bundle-charts.ts`
6. Update: Template HTML generation (if needed)

## Estimated Effort

- 2-3 hours for implementation
- 1 hour for testing
- 30 minutes for documentation updates