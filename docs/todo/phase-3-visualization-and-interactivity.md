Depends on: [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Phase 3: Visualization and Interactivity

## Implementation Plan

**Selected Task: Step 7 - Create a Rendering Script**

### Status: Ready for Implementation
✅ Phase 1 (Core Data Collection) - Complete
✅ Phase 2 (HTML Report Scaffolding) - Complete

### Detailed Implementation Steps
1. **Create renderer.ts file** - Create `src/report/renderer.ts` with rendering functions
2. **Define chart configuration types** - Create TypeScript interfaces for chart options
3. **Implement basic chart rendering functions** - Create functions for each chart type:
   - `renderCommitActivityChart()` - Time series of commits
   - `renderContributorsChart()` - Bar chart of contributors
   - `renderLinesOfCodeChart()` - Area chart of LOC growth
   - `renderFileTypesChart()` - Donut chart of file types
4. **Create data transformation helpers** - Functions to convert CommitData[] to chart-ready format
5. **Export main render function** - Single function that orchestrates all chart rendering

### Technical Details
- Use ApexCharts TypeScript interfaces for type safety
- Transform CommitData[] from existing parseCommitHistory() function
- Create helper functions for data aggregation (by author, by date, by file type)
- Keep chart configurations simple and consistent with template styling
- Use modern ES modules and async/await patterns

### Commit Strategy
Single focused commit: "Add chart rendering functions for repository statistics"

### Files to Create
- `src/report/renderer.ts` (new file)

### Next Steps After This Task
- Step 8: Implement Charts (enhance renderer with specific chart implementations)
- Step 9: Add Interactivity (tooltips, zooming, filtering)

---

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