# Feature: File Type Chart Filtering and Section Heading

## Description

When a user clicks on a segment in the "File Types" chart, the following charts should be filtered to display data only for the selected file type:

-   "Largest Files"
-   "Most Churn"
-   "Most Complex"

Additionally, this group of charts requires a clear and descriptive heading to improve user understanding.

## Current State Analysis

### Existing Implementation
- **File Types Chart**: Donut chart in `src/charts/file-types-chart.ts` showing top 8 file types by LOC
- **Top Files Chart**: Tabbed horizontal bar chart in `src/charts/top-files-chart.ts` with 3 modes:
  - Largest Files (by lines of code)
  - Most Churn (by number of changes)
  - Most Complex (by Lizard complexity score)
- **Filter System**: Already exists in `src/chart/event-handlers.ts` with author, date, and file type filters
- **No Click Interactivity**: File Types chart currently has no click handlers

### Technical Architecture
- Charts use ApexCharts library
- Event handling coordinated through `EventHandlers` class
- Filters trigger chart re-renders via `ChartRenderers.renderCharts()`
- All data embedded in HTML as JSON

## Implementation Plan

### Step 1: Add Click Handler to File Types Chart
**Files to modify**: `src/charts/file-types-chart.ts`, `src/chart/event-handlers.ts`

1. Add `dataPointSelection` event to ApexCharts options in file-types-chart.ts
2. Create new method in EventHandlers to handle file type selection
3. Store selected file type in a class property
4. Trigger chart re-render when file type is selected/deselected

### Step 2: Update Top Files Chart Filtering
**Files to modify**: `src/charts/top-files-chart.ts`

1. Modify `getFilteredData()` to accept optional file type filter
2. Update chart rendering to filter files by selected file type
3. Ensure all three tabs (Largest, Most Churn, Most Complex) respect the filter

### Step 3: Add Visual Feedback
**Files to modify**: `src/charts/file-types-chart.ts`, `src/report/styles.css` (if exists)

1. Highlight selected segment in File Types chart
2. Add cursor pointer on hover
3. Show selected file type in chart title or nearby

### Step 4: Add Section Heading
**Files to modify**: `src/report/template.html`

1. Add a clear heading above the Top Files chart section
2. Dynamically update heading to show filtered file type when active

### Step 5: Handle Edge Cases
**Considerations**:

1. Click same segment to deselect and show all files
2. Handle case where no files match selected type
3. Ensure filter persists when switching between tabs
4. Reset file type filter when other filters change (optional)

## Testing Approach

1. Use `./scripts/create-test-repo.sh` to create test repository
2. Generate report with `npm run analyse /path/to/test/repo -- --output test.html`
3. Verify:
   - Clicking file type segment filters Top Files charts
   - All three tabs respect the filter
   - Clicking same segment deselects
   - Visual feedback is clear
   - Section heading is descriptive

## Commit Strategy

This can be broken into 3 small commits:

1. **Add click handler to File Types chart** - Basic click detection and state management
2. **Implement filtering in Top Files charts** - Apply selected file type filter to data
3. **Add visual feedback and section heading** - Polish UX with highlights and clear labeling
