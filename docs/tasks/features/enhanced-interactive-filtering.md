# Enhanced Interactive Filtering

## Status
**Status**: Planned
**Priority**: Medium
**Estimated effort**: Medium

## Idea
Allow more complex filtering combinations (e.g., author AND date range AND file type) and drill-down capabilities (e.g., click a file type to see related commits) directly within the generated HTML report.

## Implementation Suggestions

### 1. Frontend Data Management
- **Client-side Data Store:** Ensure all necessary data (commits, contributors, file types, etc.) is loaded into JavaScript variables on the client-side when the report is generated. This is largely already done.
- **Efficient Data Structures:** Use JavaScript Maps or Objects for quick lookups and filtering.

### 2. Advanced Filter UI
- **Combined Filters:** Implement a UI that allows users to combine multiple filter criteria (e.g., author dropdown, date range pickers, file type multi-select, commit message keyword search).
- **Logical Operators:** Potentially allow `AND`/`OR` logic between different filter types.
- **Filter Summary:** Display a clear summary of the currently applied filters.

### 3. Dynamic Chart Updates
- **Re-render on Filter Change:** When filters are applied, re-calculate the underlying data for all charts and re-render them dynamically using ApexCharts API methods (e.g., `updateSeries`, `updateOptions`).
- **Data Recalculation:** The `recalculateData` function in `src/report/template.html` (within the script tag) will need to be extended to handle all new filter combinations and recalculate `filteredCommits`, `filteredContributors`, etc., based on the active filters.

### 4. Drill-down Capabilities
- **Clickable Chart Elements:** Make elements within charts (e.g., a bar in the contributor chart, a slice in the file type donut) clickable.
- **Contextual Filtering:** When a chart element is clicked, apply a filter based on that element's data. For example:
    - Clicking an author in the contributor chart filters the entire report to show only that author's commits.
    - Clicking a file type in the donut chart filters to show only commits affecting that file type.
    - Clicking a point on a time-series chart could filter to commits around that date.
- **Breadcrumbs/Filter Stack:** Implement a way to show the active drill-down path and allow users to easily go back or remove specific drill-down filters.

### 5. Performance Considerations
- **Debouncing:** For text input filters (like commit message search), debounce the input to avoid excessive re-rendering.
- **Web Workers (Advanced):** For very large repositories, consider offloading heavy data recalculations to web workers to keep the UI responsive.

## Impact
- Significantly improves the utility and interactivity of the generated reports.
- Allows users to quickly explore specific aspects of the repository data.
- Enhances data discovery and insights by enabling targeted analysis.
- Makes the report a more powerful analytical tool rather than just a static display.

## Implementation Plan

### Phase 1: Multi-Select File Type Filter (Small commit)
1. **Update Filter UI**
   - Replace single-select file type dropdown with multi-select checkbox list
   - Add "Select All/None" toggle for convenience
   - Style to match existing UI components

2. **Modify Filter System**
   - Update `FilterState` interface to accept `fileTypeFilter: string[]`
   - Modify `applyFilters` to check if any selected file types match
   - Update filter status to show count of selected file types

3. **Add Tests**
   - Test multi-select filtering logic
   - Test UI interaction and state management

### Phase 2: Enhanced Drill-Down (Separate commit)
1. **File Type Chart Click Handler**
   - Make pie chart segments clickable
   - On click, apply file type filter and update all charts
   - Show visual indicator of active drill-down
   - Add breadcrumb or badge showing active filter

2. **Contributor Chart Click Handler**
   - Make contributor bars clickable
   - On click, filter to show only that author's commits
   - Update filter UI to reflect selection

3. **Time Series Point Click**
   - Make time series data points clickable
   - On click, filter to date range around that point (±7 days)
   - Update date filter inputs

### Phase 3: Commit Message Search (Optional, separate commit)
1. **Add Search Input**
   - Add text input for commit message search
   - Implement debounced search to avoid performance issues
   - Add to existing filter UI layout

2. **Extend Filter System**
   - Add `messageFilter: string` to FilterState
   - Implement fuzzy or contains search in applyFilters
   - Highlight matching terms in commit lists

### Phase 4: Filter Combinations UI (Optional)
1. **Visual Filter Summary**
   - Show active filters as removable badges/chips
   - Click badge to remove individual filter
   - Show filter combination logic clearly

2. **Filter Presets**
   - Add common filter combinations as presets
   - E.g., "Last 30 days", "Top 5 contributors", "Documentation changes"

## Technical Considerations

1. **Performance**
   - Current implementation recalculates all data on filter change
   - For large repos, consider caching calculated results
   - Debounce rapid filter changes

2. **Accessibility**
   - Ensure all clickable elements have proper ARIA labels
   - Keyboard navigation support for drill-downs
   - Screen reader announcements for filter changes

3. **Mobile Responsiveness**
   - Multi-select UI needs mobile-friendly design
   - Touch-friendly click targets for drill-down
   - Consider simplified mobile filter UI

## Current State Analysis

### Existing Implementation
- Basic single-select filters for author, date range, and file type
- Filter system in `src/chart/filter-system.ts` with clean separation
- Event handlers in `src/chart/event-handlers.ts`
- All data already available client-side
- Charts update dynamically on filter change

### Key Files to Modify
- `src/chart/filter-system.ts` - Core filtering logic
- `src/chart/event-handlers.ts` - UI event handling
- `src/report/template.html` - Filter UI components
- `src/chart/chart-renderers.ts` - Chart click handlers

### What Works Well
- Clean separation of concerns
- Efficient data recalculation
- All necessary data structures in place
- Good foundation for enhancement
