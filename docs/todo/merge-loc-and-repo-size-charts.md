# Plan: Merge "Lines of Code" and "Repository Size" Charts with a Toggle

## Task Analysis
This task is valid and worthwhile. The two charts (Lines of Code and Repository Size) are currently separate but show similar growth patterns over time. Merging them will:
- Reduce UI clutter
- Make it easier to correlate code size with repository size
- Maintain consistency with the existing toggle pattern

## Objective
Combine the "Lines of Code Growth" and "Repository Size Over Time" charts into a single, unified chart. This new chart will feature a toggle switch, identical to the one on the "Code Changes" chart, allowing users to switch the x-axis between a "by date" (time-series) view and a "by commit" (linear progression) view.

## Revised Implementation Plan

### Breaking down into smaller commits:

#### Commit 1: Create new GrowthChart class
1. Create `src/charts/growth-chart.ts` that combines the functionality
2. Support multi-axis (different scales for lines vs bytes)
3. Reuse existing tooltip patterns from both charts
4. Follow the existing chart class pattern

#### Commit 2: Update HTML template
1. Remove the two separate chart containers (lines 363-393)
2. Add single merged "Growth Over Time" chart with toggle
3. Keep it in the same location in the time series column

#### Commit 3: Wire up the new chart
1. Update `src/chart/chart-renderers.ts` to use new GrowthChart
2. Remove old chart instances and imports
3. Update render calls

#### Commit 4: Clean up old code
1. Delete `src/charts/lines-of-code-chart.ts`
2. Delete `src/charts/repository-size-chart.ts`
3. Run tests and rebuild

## Original Implementation Plan (for reference)

### 1. Update HTML Template
-   **File**: `src/report/template.html`
-   **Action**:
    -   Remove the two separate `div` containers and their parent cards for the "Lines of Code" and "Repository Size" charts.
    -   Create a single new card and `div` container to house the new, merged chart.
    -   Add a UI element for the toggle switch (e.g., a button group) next to the chart title.

```html
<!-- Replace the two old chart cards with this single one -->
<div class="col-md-6">
    <div class="card">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="card-title">Growth Over Time</h5>
                <div class="btn-group btn-group-sm" role="group" id="growthChartToggle">
                    <button type="button" class="btn btn-outline-primary active" data-view="date">By Date</button>
                    <button type="button" class="btn btn-outline-primary" data-view="commit">By Commit</button>
                </div>
            </div>
            <div id="growthChart"></div>
        </div>
    </div>
</div>
```

### 2. Consolidate Chart Rendering
-   **File**: `src/report/generator.ts` (or the relevant chart class file, e.g., `src/charts/lines-of-code-chart.ts`)
-   **Action**:
    -   Remove the two separate rendering functions/classes for the old charts (`renderLinesOfCodeChart` and `renderRepositorySizeChart`).
    -   Create a new, single function/class (e.g., `renderGrowthChart`).
    -   This new component will be responsible for rendering both the "Lines of Code" and "Repository Size" series on the same chart.

### 3. Implement Multi-Axis and Toggle Logic
-   **File**: `src/report/generator.ts` (or the new chart class file)
-   **Action**:
    -   **Multi-Axis (Y-Axis)**: Configure the chart to use a multi-axis Y-axis. One axis will represent the "Total Lines" count, and the second (opposite) axis will represent the "Total Bytes". This is crucial because the scales of these two metrics are vastly different.
    -   **Toggle Logic (X-Axis)**:
        -   Add an event listener to the new toggle buttons.
        -   On toggle, call the `chart.updateOptions()` method.
        -   The `updateOptions` call will switch the `series` and `xaxis.categories` data between the `timeSeries` data (for the "By Date" view) and the `linearSeries` data (for the "By Commit" view).

```javascript
// Example of multi-axis and toggle logic in the new chart's code

// 1. Define the series for both views
const seriesByDate = [
    { name: 'Lines of Code', data: timeSeries.map(d => d.cumulativeLines) },
    { name: 'Repository Size', data: timeSeries.map(d => d.cumulativeBytes) }
];
const seriesByCommit = [
    { name: 'Lines of Code', data: linearSeries.map(d => d.cumulativeLines) },
    { name: 'Repository Size', data: linearSeries.map(d => d.cumulativeBytes) }
];

// 2. Configure the multi-axis options
const options = {
    series: seriesByDate, // Default view
    yaxis: [
        {
            title: { text: 'Lines of Code' },
        },
        {
            opposite: true,
            title: { text: 'Repository Size (Bytes)' },
            labels: { formatter: (val) => formatBytes(val) } // Use existing formatter
        }
    ],
    xaxis: {
        categories: timeSeries.map(d => d.date) // Default view
    },
    // ... other chart options
};

// 3. Implement the toggle listener
document.getElementById('growthChartToggle').addEventListener('click', (e) => {
    const view = e.target.dataset.view;
    if (view === 'date') {
        chart.updateOptions({
            series: seriesByDate,
            xaxis: { categories: timeSeries.map(d => d.date) }
        });
    } else {
        chart.updateOptions({
            series: seriesByCommit,
            xaxis: { categories: linearSeries.map(d => d.index) }
        });
    }
    // ... logic to update active button class
});
```

## Impact
-   **Type**: Feature enhancement / Refactoring.
-   **Risk**: Medium. Merging charts and implementing a toggle requires careful data handling and API usage. The multi-axis configuration needs to be precise.
-   **Complexity**: Moderate. Involves changes to the HTML template, chart rendering logic, and event handling for the new toggle.
-   **Benefit**:
    -   **Reduces UI Clutter**: Consolidates two charts into one, simplifying the report layout.
    -   **Improves Consistency**: Provides a familiar and powerful "date/commit" view toggle, making the UI more intuitive.
    -   **Simplifies Codebase**: Reduces the number of chart-rendering functions and classes to maintain.
