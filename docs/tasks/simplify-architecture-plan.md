# Plan: Simplify Repo-Statter Architecture

## Status: IN PROGRESS

### Completed:
- ✅ Created new simplified charts.ts module
- ✅ Migrated all chart rendering logic to simple functions
- ✅ Removed class abstractions and error boundaries
- ✅ Made all chart rendering synchronous
- ✅ Store chart references for direct access

### Remaining:
- ⏳ Update template.html to use simplified architecture
- ⏳ Remove unnecessary abstraction files
- ⏳ Update build process to inline charts bundle
- ⏳ Test that time slider works with all charts

---

# Plan: Simplify Repo-Statter Architecture

## Problem Statement

The current architecture is overly complex for what is essentially a static HTML report generator. We have:

1. **Multiple layers of abstraction**: page-script → chart-loader → chart-initializer → chart-renderers → individual chart classes
2. **Complex error handling**: Error boundaries that swallow errors and make debugging difficult
3. **Unnecessary dynamic loading**: ViewportChartLoader (now removed) and dynamic imports for code that gets bundled anyway
4. **Build process complexity**: Pre-bundling steps, complex template processing
5. **Debugging difficulties**: Console logs getting stripped, errors not surfacing properly

This complexity is causing bugs like the time slider not working with certain charts, and making it hard to debug simple issues.

## Current Architecture Analysis

### JavaScript Module Flow
```
1. template.html has inline script
2. Inline script calls initializePageScript(data)
3. PageScript creates ChartLoader
4. ChartLoader dynamically imports:
   - ChartRenderers
   - EventHandlers  
   - ChartInitializer
5. ChartInitializer waits for libraries, then calls renderers
6. ChartRenderers wraps each chart in error boundary
7. Individual chart classes (10+ files) handle rendering
```

### Pain Points
- **Too many abstraction layers**: 6-7 layers between data and chart rendering
- **Error handling obscures issues**: renderWithErrorBoundary swallows errors
- **Complex initialization**: Waiting for libraries, dynamic imports, multiple classes
- **Hard to debug**: Build process strips console logs, errors don't surface
- **Timing issues**: Charts depend on each other but load asynchronously

## Proposed Simplified Architecture

### Phase 1: Single-File Chart Module
Combine all chart logic into a single module:

```typescript
// src/charts.ts
export function renderAllCharts(data: ReportData) {
  // Direct, simple functions for each chart
  renderTimeSlider(data)
  renderGrowthChart(data)
  renderCategoryLinesChart(data)
  renderCommitActivityChart(data)
  // ... etc
}

function renderCategoryLinesChart(data: ReportData) {
  const container = document.getElementById('categoryLinesChart')
  if (!container) return
  
  // Direct ApexCharts usage, no wrapper classes
  const chart = new ApexCharts(container, {
    chart: { id: 'category-lines-chart', type: 'line' },
    series: buildCategorySeries(data.timeSeries),
    // ... options
  })
  chart.render()
}
```

### Phase 2: Inline Everything in Template
Since it's a static HTML file, inline the entire chart module:

```html
<script>
  // Inline the bundled charts.js content directly
  {{CHARTS_BUNDLE}}
  
  // Simple initialization
  document.addEventListener('DOMContentLoaded', () => {
    renderAllCharts({{DATA_JSON}})
  })
</script>
```

### Phase 3: Remove Build Complexity
- No pre-bundling step
- Bundle charts.ts once during report generation
- Inline the bundle directly into HTML template
- No dynamic imports, no lazy loading

### Phase 4: Simplify Data Flow
Current: `CLI → DataPipeline → Transformers → Template → PageScript → ... → Charts`

Simplified: `CLI → DataPipeline → Template (with inlined charts)`

### Phase 5: Better Error Handling
- Let errors fail fast and show in console
- No error boundaries
- Add try/catch only where truly needed
- Use console.error liberally for debugging

## Implementation Steps

1. **Create new charts.ts module**
   - Move all chart rendering logic to simple functions
   - Remove class abstractions
   - Direct ApexCharts usage

2. **Update template.html**
   - Remove complex initialization
   - Inline bundled charts module
   - Simple DOMContentLoaded → renderAllCharts

3. **Update build process**
   - Bundle charts.ts during report generation
   - Inject bundle into template
   - Remove pre-bundle script

4. **Remove unnecessary files**
   - Delete chart-loader.ts
   - Delete chart-initializer.ts
   - Delete chart-renderers.ts
   - Delete individual chart classes
   - Delete error-boundary.ts (or simplify)

5. **Fix time slider**
   - With synchronous rendering, all charts exist when slider initializes
   - Direct chart references, no timing issues

## Benefits

1. **Easier debugging**: Console logs work, errors surface immediately
2. **Simpler mental model**: Data → Template → Charts (3 steps vs 7+)
3. **No timing issues**: Everything renders synchronously
4. **Faster performance**: No dynamic imports, less abstraction overhead
5. **Easier maintenance**: One file to understand vs 15+ files
6. **Follows principles**: "Don't overengineer", "keep it minimal"

## Risks & Mitigations

- **Risk**: Larger HTML file size
  - **Mitigation**: Not an issue for local reports, use gzip for web serving

- **Risk**: Less modular code
  - **Mitigation**: Keep functions focused and testable

- **Risk**: Harder to unit test
  - **Mitigation**: Export individual render functions for testing

## Alternative: Medium Simplification

If full simplification is too drastic:

1. Keep chart classes but make them simpler
2. Remove just the loader/initializer layers
3. Keep error boundaries but make them transparent
4. Bundle everything but keep as separate script tag

## Decision Needed

Do we want to:
1. **Full simplification** (recommended) - Single module, inline everything
2. **Medium simplification** - Remove some layers, keep some structure
3. **Minimal changes** - Just fix the current bugs

The full simplification would make the codebase much easier to understand and maintain, following the engineering principles of minimalism and avoiding overengineering.