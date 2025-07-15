Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Feature: Interactive Filtering

## 1. Goal

To allow users to filter the entire report by a specific author, date range, or file type. This will enable more focused and personalized analysis.

## 2. Implementation Plan

### UI Elements

1.  **Add Filter Controls:** Add filter controls to the top of the HTML report (e.g., a dropdown for authors, date pickers for a date range).

### Logic

1.  **Event Listeners:** Add event listeners to the filter controls.
2.  **Filter Data:** When a filter is applied, re-process the raw data to match the filter criteria.
3.  **Re-render Charts:** Re-render all charts with the filtered data.

## 3. Files to Modify

*   `src/report/renderer.ts`: Modify the `renderAllCharts` function to accept and apply filters. Add logic to handle the filtering and re-rendering.
*   `src/report/template.html`: Add the new filter UI elements.
