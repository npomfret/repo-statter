Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Feature: Enhanced Lines of Code Chart

## 1. Goal

To enhance the "Lines of Code Over Time" chart with the ability to switch between different y-axis and x-axis scales, providing a more flexible and insightful view of the data.

## 2. Implementation Plan

### UI Elements

1.  **Add Axis Toggles:** Add UI controls (e.g., buttons or a dropdown) to the chart to allow the user to switch between:
    *   **Y-Axis:** "Lines of Code" and "Bytes"
    *   **X-Axis:** "Time Series" (by date) and "Linear" (commit by commit)

### Logic

1.  **Data Collection:**
    *   Ensure that the byte size of each file change is collected during the data extraction phase.
2.  **Data Transformation:**
    *   Create different data series for each axis combination.
3.  **Chart Updates:**
    *   Add event listeners to the UI toggles.
    *   When a toggle is clicked, update the chart with the corresponding data series.

## 3. Files to Modify

*   `src/index.ts`: Update the data collection logic to include byte size.
*   `src/report/renderer.ts`: Modify the `renderLinesOfCodeChart` function to handle the different data series and update the chart dynamically.
*   `src/report/template.html`: Add the new UI toggles to the chart container.
