Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md), [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Feature: Code Churn Analysis

## 1. Goal

To analyze and visualize the rate at which code is being rewritten or deleted over time. This helps identify unstable parts of the codebase and understand the project's volatility.

## 2. Implementation Plan

### Data Collection

1.  **Calculate Churn per Commit:** For each commit, in addition to lines added, we already have lines deleted. The sum of these is the churn for that commit.
2.  **Aggregate Churn Data:** Aggregate churn data over time (e.g., daily or weekly) to create a time series.

### Visualization

1.  **Create a Churn Chart:** Add a new chart to the HTML report, likely an area or line chart, showing lines added vs. lines deleted over time.
2.  **Key Metrics:** Add a new key stat card for "Average Churn Rate" or "Total Churn".

## 3. Files to Modify

*   `src/index.ts`: Update the data collection logic to calculate churn.
*   `src/report/renderer.ts`: Add a new function to render the churn chart.
*   `src/report/template.html`: Add a new container for the churn chart and the new key stat card.
