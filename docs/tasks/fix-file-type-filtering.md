# Fix File Type Filtering for Current State Charts

## Problem
When a file type filter is selected in the "Current State" section, the file heatmap and top files charts need to show only files of the selected type(s). This is a view of the repository's current state, not historical data.

## Affected Charts
- File heatmap (shows file activity frequency)
- Top files by size
- Top files by churn
- Top files by complexity

## Current State (Fixed)
- ✅ File type filter UI is working
- ✅ Filter state is being tracked in ChartManager
- ✅ Charts show appropriate message when filter is active for time-based charts
- ✅ Filtering logic is fully implemented in `updateChartsWithFileTypeFilter()`
- ✅ **Fixed: Filter clearing now properly restores original charts**

## Requirements
This is NOT a historical filter - it only filters the current view of which files are shown in the charts based on their file type. The data itself (commit counts, file sizes, etc.) remains unchanged.

## Investigation Findings

After code analysis, the filtering implementation is **already complete**:

1. **ChartManager.updateChartsWithFileTypeFilter()** - Fully implemented with:
   - File heatmap filtering by `fileType` property
   - Top files filtering using `fileTypeMap` lookup
   - Time-based charts showing filter message
   - Console logging of filter changes

2. **Data structures are correct**:
   - `fileHeatData` has `fileType` property for direct filtering
   - `topFilesData` uses `fileTypeMap` (built from commits) for filtering
   - File type map is built in `buildFileTypeMap()` from commit data

3. **UI integration exists**:
   - Pie chart has `dataPointSelection` event handler
   - Click toggles filter on/off for same segment
   - ChartManager methods properly wired up

## Revised Implementation Plan

### 1. Debug Why Filtering Isn't Working
- Check if `fileTypeMap` is being populated correctly
- Verify `fileHeatData` actually has `fileType` property
- Ensure chart manager instance is properly connected
- Check for JavaScript errors in browser console

### 2. Potential Issues to Investigate
- **Data issue**: `fileType` might be missing from data
- **Timing issue**: Charts might be created before data is ready
- **Instance issue**: Multiple ChartManager instances
- **Event issue**: Click handler not firing properly

### 3. Fix Applied
The issue was that when charts were destroyed during filtering, they were removed from the ChartManager's Map entirely, losing the original data needed for restoration.

**Solution implemented:**
1. Added `originalChartData` Map to preserve original data
2. Modified `register()` to store original data when charts are first created
3. Updated filter clearing logic to use preserved original data instead of `recreate()`
4. Charts now properly restore when filter is removed

## Testing
1. Filter by single file type - verify only those files appear
2. Filter by multiple file types - verify all selected types appear
3. Clear filter - verify all files return
4. Empty result - verify graceful handling when no files match
5. Switch between filters - verify proper cleanup and update

## Success Criteria
- File type filter correctly shows only files of selected type(s)
- Charts update immediately when filter changes
- Clear visual feedback when no files match filter
- No performance issues or visual glitches
- All current state charts (heatmap, top files) support filtering