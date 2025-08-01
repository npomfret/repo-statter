# Refactor Chart Toggle Duplication

## Problem Statement

The codebase has significant duplication across three chart types (growth, category, and user) for implementing date/commit toggle functionality. Each chart type has:

1. Nearly identical HTML button groups
2. Duplicate event listener setup
3. Similar update functions that differ only in IDs and function names
4. Repeated chart rebuild logic

## Current Duplication Analysis

### 1. Toggle Button HTML Pattern
- **Growth Chart**: Static HTML in template.html with IDs `growthXAxisDate` and `growthXAxisCommit`
- **Category Chart**: Static HTML in template.html with IDs `categoryXAxisDate` and `categoryXAxisCommit`
- **User Charts**: Dynamic HTML generated in charts.ts with IDs `userXAxisDate${index}` and `userXAxisCommit${index}`

All follow identical structure:
```html
<div class="btn-group btn-group-sm mb-3" role="group">
  <input type="radio" class="btn-check" name="[chart]XAxis" id="[chart]XAxisDate" value="date">
  <label class="btn-outline-primary" for="[chart]XAxisDate">By Date</label>
  <input type="radio" class="btn-check" name="[chart]XAxis" id="[chart]XAxisCommit" value="commit" checked>
  <label class="btn-outline-primary" for="[chart]XAxisCommit">By Commit</label>
</div>
```

### 2. Event Listener Pattern
Each chart sets up listeners identically:
```typescript
dateBtn?.addEventListener('change', () => {
  if ((dateBtn as HTMLInputElement).checked) {
    update[Chart]Axis('date')
  }
})
```

### 3. Update Function Pattern
Three nearly identical functions exist:
- `updateGrowthChartAxis` in growth-chart.ts (uses classList for button state)
- `updateCategoryChartAxis` in category-lines-chart.ts (uses checked property)
- `updateUserChartAxis` in charts.ts (uses checked property, takes extra userIndex param)

Key differences:
- Growth chart uses classList.add/remove for button states
- Category and user charts use checked property
- User charts require userIndex for localStorage key

## Detailed Implementation Plan

### Phase 1: Create Generic Utilities (Commit 1)

#### 1.1 Create `src/visualization/charts/chart-toggle-utils.ts`

```typescript
export interface ChartToggleConfig {
  chartId: string
  storageKey: string
  elementPrefix: string // e.g., 'growth', 'category', 'userChart0'
  renderFunction: (...args: any[]) => void | Promise<void>
  renderArgs: any[]
  updateButtonMethod?: 'classList' | 'checked' // default: 'checked'
  chartRefKey?: string // Override key for chartRefs lookup (e.g., 'category-lines-chart')
}

export function createChartToggleHTML(
  elementPrefix: string, 
  defaultMode: 'date' | 'commit' = 'commit'
): string {
  const isDate = defaultMode === 'date'
  return `
    <div class="btn-group btn-group-sm mb-3" role="group">
      <input type="radio" class="btn-check" name="${elementPrefix}XAxis" 
             id="${elementPrefix}XAxisDate" value="date" ${isDate ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="${elementPrefix}XAxisDate">By Date</label>
      <input type="radio" class="btn-check" name="${elementPrefix}XAxis" 
             id="${elementPrefix}XAxisCommit" value="commit" ${!isDate ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="${elementPrefix}XAxisCommit">By Commit</label>
    </div>
  `
}

export function updateChartAxis(
  config: ChartToggleConfig, 
  mode: 'date' | 'commit',
  chartRefs: Record<string, any>,
  chartData: Record<string, any>
): void {
  const chartRefKey = config.chartRefKey || config.chartId
  const chart = chartRefs[chartRefKey]
  const data = chartData[config.chartId]
  if (!chart || !data) return

  // Save preference
  localStorage.setItem(config.storageKey, mode)

  // Update button states
  const dateBtn = document.getElementById(`${config.elementPrefix}XAxisDate`)
  const commitBtn = document.getElementById(`${config.elementPrefix}XAxisCommit`)

  if (config.updateButtonMethod === 'classList') {
    // Growth chart style
    if (mode === 'date') {
      dateBtn?.classList.add('active')
      commitBtn?.classList.remove('active')
    } else {
      commitBtn?.classList.add('active')
      dateBtn?.classList.remove('active')
    }
  } else {
    // Category and user chart style
    const dateBtnInput = dateBtn as HTMLInputElement
    const commitBtnInput = commitBtn as HTMLInputElement
    if (dateBtnInput && commitBtnInput) {
      dateBtnInput.checked = mode === 'date'
      commitBtnInput.checked = mode === 'commit'
    }
  }

  // Destroy and cleanup
  chart.destroy()
  if (config.chartRefKey) {
    delete chartRefs[config.chartRefKey]
  }

  // Rebuild chart
  if (config.renderFunction.constructor.name === 'AsyncFunction') {
    (config.renderFunction as (...args: any[]) => Promise<void>)(...config.renderArgs)
  } else {
    config.renderFunction(...config.renderArgs)
  }
}

export function setupChartToggleListeners(
  config: ChartToggleConfig,
  chartRefs: Record<string, any>,
  chartData: Record<string, any>
): void {
  const dateBtn = document.getElementById(`${config.elementPrefix}XAxisDate`)
  const commitBtn = document.getElementById(`${config.elementPrefix}XAxisCommit`)

  dateBtn?.addEventListener('change', () => {
    if ((dateBtn as HTMLInputElement).checked) {
      updateChartAxis(config, 'date', chartRefs, chartData)
    }
  })

  commitBtn?.addEventListener('change', () => {
    if ((commitBtn as HTMLInputElement).checked) {
      updateChartAxis(config, 'commit', chartRefs, chartData)
    }
  })
}
```

### Phase 2: Migrate Growth Chart (Commit 2)

#### 2.1 Update `src/visualization/charts/growth-chart.ts`

1. Import the generic utilities
2. Replace `updateGrowthChartAxis` with a wrapper that uses the generic function
3. Update event listener setup to use generic function

### Phase 3: Migrate Category Chart (Commit 3)

#### 3.1 Update `src/visualization/charts/category-lines-chart.ts`

1. Import the generic utilities
2. Replace `updateCategoryChartAxis` with a wrapper
3. Update event listener setup

### Phase 4: Migrate User Charts (Commit 4)

#### 4.1 Update `src/visualization/charts.ts`

1. Import the generic utilities
2. Update HTML generation to use `createChartToggleHTML`
3. Replace `updateUserChartAxis` with a wrapper
4. Update event listener setup in `initializeUserChartListeners`

### Phase 5: Clean Up and Update Exports (Commit 5)

#### 5.1 Update exports
1. Update `src/visualization/charts/index.ts` to export generic function
2. Update `src/build/bundle-charts.ts` to export the generic `updateChartAxis`
3. Remove old individual update function exports

#### 5.2 Final cleanup
1. Remove old update function implementations
2. Ensure all references are updated

## Breaking Changes Mitigation

To avoid breaking existing functionality:

1. Keep the original function names as thin wrappers around the generic function
2. Maintain exact same localStorage keys
3. Preserve the different button update methods (classList vs checked)
4. Keep all existing function signatures

Example wrapper:
```typescript
export function updateGrowthChartAxis(mode: 'date' | 'commit'): void {
  const config: ChartToggleConfig = {
    chartId: 'growthChart',
    storageKey: 'growthChartXAxis',
    elementPrefix: 'growth',
    renderFunction: renderGrowthChart,
    renderArgs: [repoData],
    updateButtonMethod: 'classList'
  }
  updateChartAxis(config, mode, chartRefs, chartData)
}
```

## Testing Strategy

1. Test each chart type individually after migration
2. Verify localStorage keys remain unchanged
3. Ensure button state updates work correctly
4. Test chart destruction and recreation
5. Verify no memory leaks from event listeners

## Benefits

1. **Reduced Code**: ~250+ lines of duplicate code reduced to ~80 lines of shared utilities
2. **Consistency**: All charts guaranteed to behave the same way
3. **Maintainability**: Single source of truth for toggle behavior
4. **Type Safety**: Proper TypeScript interfaces ensure correct usage
5. **Extensibility**: Easy to add toggle to new chart types