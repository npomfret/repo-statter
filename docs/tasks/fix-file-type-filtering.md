# Fix File Type Filtering for Current State Charts

## Problem
When a file type filter is selected in the "Current State" section, the file heatmap and top files charts need to show only files of the selected type(s). This is a view of the repository's current state, not historical data.

## Affected Charts
- File Activity Heatmap (shows file activity based on commit frequency and recency)
- Top files by size (Largest)
- Top files by churn (Most Churn)
- Top files by complexity (Most Complex)

## Current State (Tested August 2025)
- ✅ File type filter UI is working - pie chart is clickable
- ✅ Filter state is being tracked and charts update when filter is applied
- ✅ Charts correctly show only files of the selected type
- ✅ Empty state handling works - shows "No files with type 'X' found" message
- ❌ **Filter clearing is broken** - clicking the same segment again does not clear the filter

## Requirements
This is NOT a historical filter - it only filters the current view of which files are shown in the charts based on their file type. The data itself (commit counts, file sizes, etc.) remains unchanged.

## Test Results (August 2025)

Using Playwright MCP server to test the functionality:

### Working Features:
1. **File type filtering** - Clicking on a pie chart segment (e.g., TypeScript) correctly filters both "Top Files" and "File Activity Heatmap" to show only files of that type
2. **Filter switching** - Clicking a different file type switches the filter correctly
3. **Empty state** - When no files match (e.g., JavaScript in test repo), appropriate message is shown
4. **Chart updates** - Charts update immediately when filter changes

### Issue Found:
**Toggle functionality broken** - The documented behavior "Click toggles filter on/off for same segment" is not working. Once a filter is applied, clicking the same segment again does not clear it. The filter can only be changed to a different type, not removed.

## Implementation Details

The filtering is implemented in `ChartManager.updateChartsWithFileTypeFilter()` which:
- Filters file heatmap by `fileType` property
- Filters top files using `fileTypeMap` lookup
- Shows appropriate messages for time-based charts
- Logs filter changes to console

## Next Steps
Fix the toggle functionality so clicking an already-selected file type segment clears the filter and restores all files to the charts.