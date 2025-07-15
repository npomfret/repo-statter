Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Feature: Enhanced Lines of Code Chart

## 1. Goal

**IMPORTANT FEATURE**

To enhance the "Lines of Code Over Time" chart with the ability to switch between different y-axis and x-axis scales, providing a more flexible and insightful view of the data.

## 2. Implementation Plan

### Status: ✅ COMPLETE

### Analysis

Current state:
- The Lines of Code chart is rendered inline in `index.ts` using ApexCharts
- We have a `renderer.ts` file that exists but is not currently used
- No byte size data is currently collected
- The chart currently shows cumulative lines over time

### UI Design

**Toggle Controls:**
- Add Bootstrap button groups above the Lines of Code chart
- Y-axis toggle: "Lines of Code" (default) | "Bytes"
- X-axis toggle: "By Date" (default) | "By Commit"
- Use data attributes to track current state

### Technical Approach

#### 1. Data Collection Enhancement
**Problem:** We need byte size data, but getting actual file sizes for historical commits is expensive.
**Solution:** Estimate bytes using average bytes per line for each file type:
- TypeScript/JavaScript: ~50 bytes/line
- HTML/CSS: ~60 bytes/line
- JSON: ~40 bytes/line
- Markdown: ~45 bytes/line
- Other: ~50 bytes/line (default)

#### 2. Data Structure Updates
- Add `estimatedBytes` to FileChange interface
- Add `cumulativeBytes` to time series data
- Create commit-indexed data series for linear x-axis

#### 3. Chart Rendering Updates
- Keep chart rendering inline (consistent with current approach)
- Add a global chart instance variable to enable updates
- Create `updateLinesOfCodeChart()` function for axis switching
- Handle data transformation based on selected axes
- **Smart time scale detection:**
  - Calculate repository age from first to last commit
  - Hours old: Show hourly ticks
  - Days old: Show daily ticks
  - Weeks old: Show weekly ticks
  - Months old: Show monthly ticks
  - Years old: Show quarterly or yearly ticks

### Implementation Steps

1. **Update data structures** (src/index.ts)
   - Add bytes estimation logic in `parseCommitDiff()`
   - Calculate estimated bytes per file based on file type
   - Add `estimatedBytes` to FileChange interface

2. **Enhance time series data** (src/index.ts)
   - Add `cumulativeBytes` calculation to `getTimeSeriesData()`
   - Create new function `getLinearSeriesData()` for commit-by-commit view
   - Add time scale detection function `getAppropriateTimeScale(commits)`

3. **Add UI controls** (src/report/template.html)
   - Add button groups above Lines of Code chart
   - Style with Bootstrap classes for consistency

4. **Update chart rendering** (src/index.ts)
   - Store chart instance globally
   - Add `updateLinesOfCodeChart()` function
   - Add event listeners for toggle buttons
   - Handle axis updates with smooth transitions
   - Apply appropriate time formatting based on repository age

### Commit Strategy

This can be done in a single commit since it's a cohesive feature:
- "feat: Add axis toggles to Lines of Code chart for flexible data views"

### Technical Details

**Button Group HTML Structure:**
```html
<div class="btn-toolbar mb-3" role="toolbar">
  <div class="btn-group btn-group-sm me-2" role="group">
    <input type="radio" class="btn-check" name="yAxis" id="yAxisLines" value="lines" checked>
    <label class="btn btn-outline-primary" for="yAxisLines">Lines of Code</label>
    <input type="radio" class="btn-check" name="yAxis" id="yAxisBytes" value="bytes">
    <label class="btn btn-outline-primary" for="yAxisBytes">Bytes</label>
  </div>
  <div class="btn-group btn-group-sm" role="group">
    <input type="radio" class="btn-check" name="xAxis" id="xAxisDate" value="date" checked>
    <label class="btn btn-outline-primary" for="xAxisDate">By Date</label>
    <input type="radio" class="btn-check" name="xAxis" id="xAxisCommit" value="commit">
    <label class="btn btn-outline-primary" for="xAxisCommit">By Commit</label>
  </div>
</div>
```

**Time Scale Detection Logic:**
```typescript
function getAppropriateTimeScale(commits: CommitData[]): { format: string; tickAmount?: number } {
  const firstDate = new Date(commits[0].date)
  const lastDate = new Date(commits[commits.length - 1].date)
  const diffHours = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60)
  
  if (diffHours < 24) return { format: 'HH:mm', tickAmount: 12 }
  if (diffHours < 24 * 7) return { format: 'MM/dd', tickAmount: 7 }
  if (diffHours < 24 * 30) return { format: 'MM/dd', tickAmount: 10 }
  if (diffHours < 24 * 365) return { format: 'MMM yyyy', tickAmount: 12 }
  return { format: 'yyyy', tickAmount: 10 }
}
```

## 3. Files to Modify

*   `src/index.ts`: Update data collection, add toggle handlers and chart update logic
*   `src/report/template.html`: Add button groups for axis toggles
*   Note: `src/report/renderer.ts` exists but is not currently used - we'll continue with inline rendering for consistency
