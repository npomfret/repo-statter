Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md), [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Feature: Code Churn Analysis

## 1. Goal

To analyze and visualize the rate at which code is being rewritten or deleted over time. This helps identify unstable parts of the codebase and understand the project's volatility.

## 2. Implementation Plan

### Status: Ready for Implementation

### Data Collection

1.  **Calculate Churn per Commit:** For each commit, in addition to lines added, we already have lines deleted. The sum of these is the churn for that commit.
2.  **Aggregate Churn Data:** Aggregate churn data over time (e.g., daily or weekly) to create a time series.

### Visualization

1.  **Create a Churn Chart:** Add a new chart to the HTML report, likely an area or line chart, showing lines added vs. lines deleted over time.
2.  **Key Metrics:** Add a new key stat card for "Average Churn Rate" or "Total Churn".

### Detailed Implementation Plan

#### Approach Analysis
Since we already collect linesAdded and linesDeleted per commit, implementing churn analysis is straightforward:
- **Churn Definition**: Total lines changed (added + deleted) in a given time period
- **Visualization**: Stacked area chart showing lines added (green) and lines deleted (red) over time
- **Key Metric**: Total Churn card showing sum of all lines changed

#### Implementation Steps

1. **Update template.html**
   - Add new key stat card for "Total Code Churn" in the stats row
   - Add new chart container in a new row below existing charts

2. **Extend data transformation**
   - The existing `getTimeSeriesData()` already aggregates by date
   - No changes needed to data collection since we have linesAdded/linesDeleted

3. **Create churn chart rendering**
   - Add `renderCodeChurnChart()` function to inline script
   - Use stacked area chart with two series: additions and deletions
   - Style with green/red colors for clarity

4. **Update report generation**
   - Calculate total churn (sum of linesAdded + linesDeleted)
   - Add churn value to template placeholders

#### Breaking Down Into Commits

This can be done in a single focused commit since it's a cohesive feature addition:
- "feat: Add code churn analysis visualization to reports"

#### Technical Details

**Chart Configuration**:
```javascript
{
  chart: { type: 'area', stacked: true },
  series: [
    { name: 'Lines Added', data: [...] },
    { name: 'Lines Deleted', data: [...] }
  ],
  colors: ['#28a745', '#dc3545'], // Green for additions, red for deletions
  xaxis: { type: 'datetime' },
  yaxis: { title: { text: 'Lines Changed' } }
}
```

**Key Metric Calculation**:
```javascript
const totalChurn = commits.reduce((sum, c) => sum + c.linesAdded + c.linesDeleted, 0)
```

## 3. Files to Modify

*   `src/index.ts`: Add totalChurn calculation and template placeholder
*   `src/report/template.html`: Add new churn stat card and chart container
