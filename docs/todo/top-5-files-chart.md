# Feature Report: Top 5 Files Chart

## Feature Description
This feature introduces a new visualization to the `repo-statter` report: a "Top 5 Files" chart with three different views. The chart will display the top 5 files in the repository based on different metrics, selectable via tabs. Each file will be represented by a horizontal bar, with the length of the bar indicating its relative value compared to the largest file in that category.

## Three Views (Tabs):
1. **Largest Files** - Top 5 files by total lines of code (current size)
2. **Most Churn** - Top 5 files by total lines added + deleted (change frequency)
3. **Most Complex** - (To be implemented later - placeholder tab)

## Implementation Plan Highlights
1.  **Data Aggregation:** New functions will be added to calculate different metrics for files
2.  **UI Integration:** A new card with Bootstrap tabs will be added to `src/report/template.html`
3.  **Chart Rendering:** A new chart class that can switch between different data views
4.  **Interactivity:** Click event listeners on chart bars to filter the commit history view

## Benefits
-   **Multi-dimensional Analysis:** Different views provide insights into file size, activity, and complexity
-   **Enhanced Navigation:** Quick filtering of commit history by clicking on files of interest
-   **Visual Clarity:** Clear representation of different file metrics
-   **Consistency:** Leverages existing ApexCharts library and Bootstrap components

## DETAILED IMPLEMENTATION PLAN

After analyzing the codebase, here's the refined implementation approach:

### Architecture Review
The repo-statter follows a clear architecture:
1. Data calculation functions are exported through `src/stats/calculator.ts` (which re-exports from modules in `src/data/`)
2. Chart rendering is handled by individual chart classes in `src/charts/`
3. The chart classes are orchestrated by `ChartRenderers` class
4. Data flows from git parsing → stats calculation → chart rendering

### Step-by-Step Implementation

#### 1. Create Data Aggregation Functions (First Commit)
- Add new file: `src/data/top-files-calculator.ts`
- Export interfaces:
  ```typescript
  interface TopFileStats {
    fileName: string
    value: number
    percentage: number
  }
  
  interface TopFilesData {
    largest: TopFileStats[]
    mostChurn: TopFileStats[]
    mostComplex: TopFileStats[] // Empty for now
  }
  ```
- Implement functions:
  - `getTopFilesBySize(commits: CommitData[]): TopFileStats[]` - Calculate current file sizes (lines added - lines deleted)
  - `getTopFilesByChurn(commits: CommitData[]): TopFileStats[]` - Calculate total changes (lines added + lines deleted)
  - `getTopFilesStats(commits: CommitData[]): TopFilesData` - Wrapper that returns all views
- Each function should:
  - Aggregate metrics per file across all commits
  - Sort by metric descending
  - Take top 5 files
  - Calculate percentage of total for that metric
- Update `src/stats/calculator.ts` to re-export the new functions and types

#### 2. Create Chart Component (Second Commit)
- Add new file: `src/charts/top-files-chart.ts`
- Follow the pattern from `ContributorsChart`:
  - Constructor takes containerId
  - `render(topFilesData: TopFilesData, activeTab: 'largest' | 'churn' | 'complex')` method
  - Method to update chart when tab changes
  - Horizontal bar chart using ApexCharts
  - Dark/light theme support
  - Proper chart destruction on re-render
- Chart configuration:
  - Type: 'bar' with horizontal: true
  - Show file names on y-axis (intelligently truncated for long paths)
  - Show metric value on x-axis
  - Dynamic axis labels based on active tab:
    - "Largest": "Lines of Code"
    - "Most Churn": "Total Lines Changed"
    - "Most Complex": "Complexity Score" (placeholder)
  - Use consistent color scheme (different color per tab view)

#### 3. Integrate into UI (Third Commit)
- Update `src/report/template.html`:
  - Add new card in the right column after File Types Chart
  - Card title: "Top 5 Files"
  - Add Bootstrap nav tabs structure:
    ```html
    <ul class="nav nav-tabs card-header-tabs" role="tablist">
      <li class="nav-item">
        <a class="nav-link active" data-bs-toggle="tab" href="#largest" role="tab">Largest</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-bs-toggle="tab" href="#churn" role="tab">Most Churn</a>
      </li>
      <li class="nav-item">
        <a class="nav-link disabled" data-bs-toggle="tab" href="#complex" role="tab">Most Complex</a>
      </li>
    </ul>
    ```
  - Add tab content div with id="topFilesChart"
  - Include description text that changes based on active tab
- Update `src/chart/chart-renderers.ts`:
  - Import TopFilesChart
  - Add private property for the chart instance
  - Initialize in constructor
  - Add rendering call in `renderAllCharts()` with default tab
- Update `src/report/generator.ts`:
  - Import getTopFilesStats
  - Calculate top files data
  - Pass to page script data
- Update `src/chart/page-script.ts`:
  - Add topFilesData to PageScriptData interface

#### 4. Add Interactivity (Fourth Commit)
- Update `src/charts/top-files-chart.ts`:
  - Add click event handler to chart bars
  - Emit custom event with selected file name
- Update `src/chart/event-handlers.ts`:
  - Add tab change event listeners
  - Re-render chart when tab changes
  - Listen for file selection events
  - Filter commits table to show only commits affecting selected file
  - Update URL hash for state persistence (include active tab)
  - Add visual indicator for active selection
- Update `src/chart/chart-initializer.ts`:
  - Set up tab event handlers on initialization

### Testing Strategy
- After each commit, run:
  - `npm run test` to ensure no regressions
  - `npm run typecheck` for type safety
  - `npm run analyse test-repo -- --output test-repo.html` to test the feature
- Verify chart renders correctly in both light and dark modes
- Test interactivity by clicking on chart bars

### Considerations
- File name truncation: Long file paths should be truncated intelligently (show end of path)
- Performance: The data aggregation should be efficient even for repos with many commits
- Accessibility: Ensure proper ARIA labels and keyboard navigation for tabs
- Mobile responsiveness: Tabs and chart should be readable on smaller screens
- Empty state: Handle cases where there are fewer than 5 files gracefully
- Tab state: The "Most Complex" tab should be visually disabled until implemented

### Risk Assessment
- **Low Risk**: Following established patterns, using existing chart library
- **Medium Complexity**: Requires changes across multiple layers but patterns are clear
- **High Value**: Provides immediate insight into codebase hotspots

This implementation maintains consistency with the existing codebase while adding valuable functionality.