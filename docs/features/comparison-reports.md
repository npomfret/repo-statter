# Comparison Reports

## Idea
Generate reports that compare two different repositories, or different time periods of the same repository, to highlight trends or differences.

## Implementation Suggestions

### 1. Data Storage & Retrieval
- **Persistent Analysis Data:** The `analysis` output mode already saves `repo-stats.json`. This is crucial for comparison. Ensure this data is comprehensive enough for all comparison needs.
- **Loading Multiple Datasets:** The report generator will need to be able to load two (or more) `repo-stats.json` files.

### 2. Comparison Logic
- **Time Period Comparison:**
    - Allow users to specify two date ranges (e.g., Q1 vs Q2, or last year vs this year).
    - Filter the `commits` array for each period and then run existing `stats/calculator.ts` functions on these filtered sets.
- **Repository Comparison:**
    - Run `generateReport` for two different repositories, producing two `repo-stats.json` files.
    - Load both JSON files into the comparison report.
- **Metrics to Compare:**
    - Total commits, lines added/deleted.
    - Number of active contributors.
    - File type distribution changes.
    - Top contributors (who joined/left, who became more/less active).
    - Churn rates.

### 3. Reporting & Visualization
- **Side-by-Side Charts:** Display two instances of the same chart type side-by-side, one for each comparison subject (e.g., Commit Activity for Repo A vs Repo B).
- **Overlay Charts:** For time-series data, overlay the lines from both subjects on a single chart (e.g., LoC growth for Q1 vs Q2).
- **Difference Metrics:** Calculate and display percentage differences or absolute differences for key metrics.
- **Highlighting Changes:** Visually emphasize significant changes or differences (e.g., a contributor who became much more active, a file type that grew significantly).
- **New Comparison-Specific Charts:** Create charts specifically designed for comparison, such as a bar chart showing the top N files that changed most in lines of code between two periods.

### 4. CLI/UI for Comparison
- **New CLI Command:** Introduce a new CLI command, e.g., `npm run compare -- --repo1 /path/to/repoA --repo2 /path/to/repoB` or `npm run compare -- --repo /path/to/repo --period1 2023-01-01:2023-03-31 --period2 2024-01-01:2024-03-31`.

## Impact
- Enables trend analysis and performance tracking over time.
- Facilitates benchmarking between different projects or teams.
- Helps identify the impact of organizational changes or refactoring efforts.
- Provides a powerful tool for project managers and team leads.
