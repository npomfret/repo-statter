# Missing Error Boundaries in Chart Rendering

## Problem
- **Location**: `src/report/generator.ts:93-948` (embedded JavaScript)
- **Description**: Chart rendering code has no error boundaries, so if one chart fails to render, it could break the entire report
- **Current vs Expected**: No error handling vs graceful degradation when charts fail

## Solution
Add error boundaries around each chart rendering:

```javascript
function renderChartWithErrorBoundary(chartId, renderFunction) {
    try {
        renderFunction()
    } catch (error) {
        console.error(`Failed to render chart ${chartId}:`, error)
        const chartElement = document.getElementById(chartId)
        if (chartElement) {
            chartElement.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <h6>Chart Unavailable</h6>
                    <p>This chart could not be rendered. Please check the console for details.</p>
                </div>
            `
        }
    }
}

// Use it for each chart
renderChartWithErrorBoundary('commitActivityChart', () => {
    // existing chart rendering code
})

renderChartWithErrorBoundary('contributorsChart', () => {
    // existing chart rendering code
})
```

## Impact
- **Type**: Behavior change - improves error handling
- **Risk**: Low (adds error handling without breaking functionality)
- **Complexity**: Simple
- **Benefit**: Medium impact - prevents total report failure

## Implementation Notes
Consider adding user-friendly error messages and potentially a "retry" mechanism for failed charts.

## DETAILED IMPLEMENTATION PLAN

After analyzing the codebase, I've identified that the chart rendering happens in the following files:
- `src/chart/chart-renderers.ts` - Contains the ChartRenderers class that renders all charts
- `src/chart/chart-initializer.ts` - Initializes and calls the chart rendering
- Individual chart classes in `src/charts/` directory

### Step-by-Step Implementation (3 commits)

#### Commit 1: Add error boundary utility function
- Create new file: `src/utils/error-boundary.ts`
- Export a `renderWithErrorBoundary` function that:
  - Takes a container element/id, chart name, and render function
  - Wraps the render function in try-catch
  - On error, displays a user-friendly error message in the container
  - Logs the error to console with context
  - Returns success/failure status
- The error message should match Bootstrap's styling and the app's theme

#### Commit 2: Wrap individual chart render methods
- Update each chart class in `src/charts/` to use error boundaries internally:
  - `contributors-chart.ts`
  - `file-types-chart.ts`
  - `growth-chart.ts`
  - `commit-activity-chart.ts`
  - `word-cloud-chart.ts`
  - `file-heatmap-chart.ts`
  - `top-files-chart.ts`
- Each chart's `render()` method should:
  - Validate inputs at the start (keeping existing assertions)
  - Wrap the actual chart rendering in try-catch
  - On error, call the error boundary utility to show error in the container
  - This provides chart-level error isolation

#### Commit 3: Add error handling to ChartRenderers
- Update `src/chart/chart-renderers.ts`:
  - Wrap each chart render call in `renderAllCharts()` with try-catch
  - Continue rendering other charts even if one fails
  - Track which charts failed
  - Log summary of any failures
- Update `renderUserCharts()` and `renderUserChartInstance()`:
  - Add error handling for individual user charts
  - Ensure one failing user chart doesn't break others
- Update `updateChartsTheme()`:
  - Add error handling when updating theme
  - Ensure partial theme updates still work

### Testing Strategy
- After implementation, test by:
  - Temporarily breaking data in one chart (e.g., pass null data)
  - Verify other charts still render
  - Verify error message appears in broken chart's container
  - Test in both light and dark themes
  - Check console for proper error logging

### Benefits
1. **Fault Isolation**: One broken chart won't crash the entire report
2. **Better UX**: Users see which specific chart failed, rest of report is usable
3. **Debugging**: Clear error messages in console help identify issues
4. **Graceful Degradation**: Report remains partially functional even with data issues

### Considerations
- Error messages should be informative but not expose sensitive information
- Consider adding a "Report Issue" link in error messages
- Future enhancement: Add retry button for transient failures
- Ensure error boundary doesn't mask legitimate data validation errors