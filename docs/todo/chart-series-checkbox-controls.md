# Plan: Add Checkbox Controls for Chart Series

## Objective
Provide users with the ability to toggle the visibility of individual data series on the time-series charts (e.g., Lines of Code, Repository Size) via a set of checkbox controls. The "Total" series should be hidden by default to allow for a clearer view of the individual components.

## Research & Key Findings
ApexCharts provides a built-in `chart.toolbar.show` option, but this provides a generic hamburger menu with PNG/SVG/CSV download options, not the specific series-toggling functionality we need. The library's legend (`legend.show`) provides a way to toggle series, but for a more integrated and custom UI, direct interaction with the chart's API is better.

The recommended approach is to use the `showSeries()` and `hideSeries()` methods on the chart instance. This gives us full control over the UI and user experience.

## Implementation Plan

### 1. Update HTML Template
-   **File**: `src/report/template.html`
-   **Action**: For each chart that requires this functionality (e.g., the Lines of Code chart), add a container for the checkboxes. This should be placed logically near the chart it controls.

```html
<!-- Example for Lines of Code Chart -->
<div class="card">
    <div class="card-body">
        <div id="linesOfCodeChart"></div>
        <div id="linesOfCodeChartControls" class="chart-controls">
            <!-- Checkboxes will be dynamically inserted here by JavaScript -->
        </div>
    </div>
</div>
```

### 2. Modify Chart Rendering in `generator.ts`
-   **File**: `src/report/generator.ts` (within the embedded JavaScript)
-   **Action**: After a chart is rendered, dynamically create and append checkboxes for each series in the chart's data.

```javascript
// In the embedded JavaScript within src/report/generator.ts

function renderLinesOfCodeChart(seriesData) {
    // ... existing chart rendering options ...
    const chart = new ApexCharts(document.querySelector("#linesOfCodeChart"), options);
    chart.render();

    // --- NEW: Dynamically create checkboxes ---
    const controlsContainer = document.getElementById('linesOfCodeChartControls');
    controlsContainer.innerHTML = ''; // Clear previous controls

    chart.w.globals.series.forEach((series, index) => {
        const seriesName = chart.w.globals.seriesNames[index];
        
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';

        const input = document.createElement('input');
        input.className = 'form-check-input';
        input.type = 'checkbox';
        input.id = `series-toggle-${seriesName}`;
        input.value = seriesName;
        // Hide 'Total' series by default
        input.checked = seriesName !== 'Total';

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = input.id;
        label.textContent = seriesName;

        div.appendChild(input);
        div.appendChild(label);
        controlsContainer.appendChild(div);

        // Add event listener
        input.addEventListener('change', (event) => {
            if (event.target.checked) {
                chart.showSeries(seriesName);
            } else {
                chart.hideSeries(seriesName);
            }
        });

        // --- NEW: Hide 'Total' series on initial render ---
        if (seriesName === 'Total') {
            chart.hideSeries(seriesName);
        }
    });
}
```

### 3. Default State
-   **Action**: As shown in the code above, the checkbox for the "Total" series will be unchecked by default. The `chart.hideSeries('Total')` method will be called on the initial render to ensure its visibility matches the checkbox state.

## Impact
-   **Type**: Feature enhancement.
-   **Risk**: Low. The changes are primarily client-side and use the official ApexCharts API.
-   **Complexity**: Moderate. Involves DOM manipulation and event handling within the embedded JavaScript.
-   **Benefit**: High. Provides users with granular control over the data they see, making the charts less cluttered and more useful for comparative analysis.
