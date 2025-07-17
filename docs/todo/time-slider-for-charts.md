# Plan: Time Slider for Synchronized Chart Control

## Objective
Implement a time-range slider that controls all time-series charts simultaneously. This will allow users to select a specific date range to analyze, providing a more focused and interactive experience. The existing scroll-wheel zoom feature will be disabled to prevent accidental zooming and to make the time slider the primary method of time-range selection.

## Research & Key Findings
Research into the ApexCharts library reveals that this functionality can be achieved using a "brush chart." A brush chart is a smaller, secondary chart that acts as a controller for one or more primary charts.

-   **Synchronization**: Charts can be linked by assigning them to the same `group`. Actions on one chart (like zooming or brushing) can then be reflected on all other charts in the same group.
-   **Brush Chart**: By enabling the `chart.brush` option, a chart can be turned into a selection tool. The user can drag a "brush" across this chart to select a range.
-   **Disabling Scroll Zoom**: The scroll-to-zoom feature can be disabled.
    -   For the controlled charts, setting `chart.zoom.enabled: false` will disable all zoom interactions.
    -   For the brush chart, a specific property `chart.zoom.allowMouseWheelZoom: false` can be used. This is the ideal solution as it disables *only* the mouse wheel zoom while keeping the essential drag-to-select functionality of the brush intact.

## Implementation Plan

### 1. Create a New Brush Chart (Time Slider)
-   **Purpose**: This chart will serve as the master time-range selector.
-   **Type**: A small `area` chart.
-   **Data**: It will display a simple series representing the total number of commits over the entire history of the repository.
-   **Location**: A new `div` will be added to `src/report/template.html`, positioned logically above the charts it will control.

### 2. Configure Chart Synchronization
-   **Create a Chart Group**: A unique group ID (e.g., `'time-series-group'`) will be defined.
-   **Assign to Charts**: This `group` ID will be added to the ApexCharts options for all relevant time-series charts:
    -   Commit Activity Chart
    -   Lines of Code Chart
    -   Repository Size Chart
-   **Link Brush Chart**: The new brush chart will also be assigned to this same `group` and will be configured as the master controller.

### 3. Implement Brush and Zoom Configuration
-   **In `src/report/generator.ts`**:
    -   **For the new Brush Chart**:
        -   Enable the brush: `brush: { enabled: true }`
        -   Disable mouse wheel zoom specifically: `zoom: { enabled: true, allowMouseWheelZoom: false }`
    -   **For the controlled (main) charts**:
        -   Disable all zoom interactions completely: `zoom: { enabled: false }`

### 4. Code Implementation Example

```javascript
// In src/report/generator.ts, when defining chart options:

const CHART_GROUP_ID = 'time-series-group';

// --- Options for the new Brush Chart (Time Slider) ---
const timeSliderOptions = {
    chart: {
        id: 'time-slider-chart', // A unique ID is required
        group: CHART_GROUP_ID,
        type: 'area',
        height: 100,
        brush: {
            enabled: true,
            // The `target` property is deprecated; grouping is now handled by `group`
        },
        zoom: {
            enabled: true,
            allowMouseWheelZoom: false // *** Key change: Disables only scroll zoom ***
        }
    },
    // ... series, xaxis, etc.
};

// --- Options for a controlled chart (e.g., Commit Activity) ---
const commitActivityOptions = {
    chart: {
        id: 'commit-activity-chart',
        group: CHART_GROUP_ID,
        type: 'area',
        height: 350,
        zoom: {
            enabled: false // *** Key change: Disables all zoom on this chart ***
        }
    },
    // ... series, xaxis, etc.
};
```

### 5. Update UI Template
-   **In `src/report/template.html`**:
    -   Add a new `div` container for the time slider chart.

    ```html
    <!-- New Time Slider Chart Container -->
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Time Range Selector</h5>
                <div id="timeSliderChart"></div>
            </div>
        </div>
    </div>

    <!-- Existing Chart Containers -->
    <div class="col-md-6">
        <div class="card">
            <div class="card-body">
                <div id="commitActivityChart"></div>
            </div>
        </div>
    </div>
    ```

## Impact
-   **Type**: Feature enhancement.
-   **Risk**: Low. The changes are contained within the report generation and client-side script.
-   **Complexity**: Moderate. Requires careful configuration of chart options and UI updates.
-   **Benefit**: High. Significantly improves the usability and analytical power of the report by allowing users to focus on specific time periods.
