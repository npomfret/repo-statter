# Advanced Code Churn Analysis

## Idea
Beyond just showing lines added/deleted, this feature would identify files or modules with consistently high churn rates, indicating potential instability, areas needing refactoring, or active development hotspots.

## Implementation Suggestions

### 1. Data Collection Enhancement
- **Per-File Churn Tracking:** Modify `src/git/parser.ts` to store `linesAdded` and `linesDeleted` not just per commit, but also per file within each commit. The `FileChange` interface already has these, so it's about aggregating them.
- **Historical File Churn:** For each file, maintain a historical record of its `linesAdded` and `linesDeleted` over time. This could be stored in the `repo-stats.json` output.

### 2. Churn Rate Calculation
- **Moving Average:** Implement a function in `src/stats/calculator.ts` to calculate a moving average of churn (lines added + lines deleted) for each file over a defined period (e.g., last 30, 60, 90 days, or last 10, 20, 50 commits).
- **Relative Churn:** Compare a file's churn rate to its total lines of code or the average churn rate across the repository to identify disproportionately high churn.
- **Churn Score:** Develop a "churn score" that combines absolute churn, relative churn, and perhaps the number of distinct authors contributing to that churn.

### 3. Reporting & Visualization
- **Top Churn Files List:** In the HTML report, add a new section listing the top N files with the highest churn scores, along with their current churn rate and historical trend.
- **Churn Heatmap:** Visualize churn on a file-level heatmap, similar to the existing file heatmap, but with color intensity representing churn score.
- **Time-Series Churn:** For selected files, display a time-series chart showing their churn over time, allowing users to see when periods of high activity occurred.
- **Filtering by Churn:** Add a filter option to the report to show only commits or files related to high-churn areas.

### 4. Thresholds & Alerts (Future)
- Allow users to define thresholds for "high churn" and potentially trigger alerts or warnings in the report if files exceed these thresholds.

## Impact
- Provides deeper insights into codebase health and maintenance burden.
- Helps identify areas for refactoring or increased testing.
- Supports resource allocation by highlighting actively developed or problematic parts of the codebase.
