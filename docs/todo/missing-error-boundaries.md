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