# Feature Report: Top 10 Files Chart

## Feature Description
This feature introduces a new visualization to the `repo-statter` report: a "Top 10 Files" chart. This chart will display the top 10 files in the repository based on the total number of lines added to each file. Each file will be represented by a horizontal bar, with the length of the bar indicating its relative size (lines added) compared to the largest file.

## Implementation Plan Highlights
1.  **Data Aggregation:** A new function (`getTopFilesStats`) will be added to `src/stats/calculator.ts` to compute the top 10 files and their line counts.
2.  **UI Integration:** A new `div` element will be added to `src/report/template.html` to host the chart.
3.  **Chart Rendering:** A new JavaScript function (`renderTopFilesChart`) in `src/report/generator.ts` will use ApexCharts to render the horizontal bar chart.
4.  **Interactivity:** Click event listeners will be implemented on the chart bars to filter the main commit history view, showing only commits related to the selected file.

## Benefits
-   **Improved Codebase Understanding:** Provides quick insights into which files are most actively developed or have undergone significant growth.
-   **Enhanced Navigation:** Allows users to quickly filter the commit history to focus on changes within specific, high-impact files.
-   **Visual Clarity:** Offers a clear and intuitive visual representation of file size distribution based on lines added.
-   **Consistency:** Leverages the existing ApexCharts library for a consistent look and feel with other charts in the report.