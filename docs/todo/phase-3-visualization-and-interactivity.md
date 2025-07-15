Depends on: [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Phase 3: Visualization and Interactivity

*   **Step 7: Create a Rendering Script:**
    *   Create a new file `src/report/renderer.ts`.
    *   This script will contain functions that take the JSON data and render the charts into the containers defined in `template.html`.

*   **Step 8: Implement Charts:**
    *   **LOC Over Time:** An area chart showing total lines of code added and deleted over time.
    *   **Commit Activity:** A heatmap showing commit frequency by day of the week and hour of the day.
    *   **Contributor Breakdown:** A bar chart showing commits per author and another showing lines of code contributed per author.
    *   **Language/File Type Distribution:** A donut chart showing the percentage of lines of code per file type.
    *   **Byte Size Over Time:** A line chart showing the total byte size of the source code over time.

*   **Step 9: Add Interactivity:**
    *   Configure tooltips for all charts to show detailed data on hover.
    *   Enable zooming and panning on time-series charts.
    *   Add clickable legends to filter data series.