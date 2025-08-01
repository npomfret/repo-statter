# Fix File Type Filtering for Current State Charts

## Problem
When a file type filter is selected in the "Current State" section, the file heatmap and top files charts need to show only files of the selected type(s). This is a view of the repository's current state, not historical data.

## Affected Charts
- File heatmap (shows file activity frequency)
- Top files by size
- Top files by churn
- Top files by complexity

## Current State
- File type filter UI is working
- Filter state is being tracked in ChartManager
- Charts show a placeholder message when filter is active
- Need to implement actual filtering logic

## Requirements
This is NOT a historical filter - it only filters the current view of which files are shown in the charts based on their file type. The data itself (commit counts, file sizes, etc.) remains unchanged.

## Implementation Plan

### 1. Update Chart Manager
- Implement `updateChartsWithFileTypeFilter()` to filter and update charts
- Filter the existing data arrays (fileHeatData, topFiles) by file type
- Re-render affected charts with filtered data

### 2. Update Chart Data Filtering
For each affected chart:
- **File Heatmap**: Filter `fileHeatData` array by `fileType` property
- **Top Files**: Filter the respective data arrays by file type before sorting/limiting

### 3. Handle Empty States
- Show appropriate message when no files match the selected type(s)
- Ensure charts handle empty data gracefully

## Technical Details

### Data Flow
1. User selects file type filter
2. ChartManager stores the selected file type(s)
3. `updateChartsWithFileTypeFilter()` filters the existing data
4. Charts are destroyed and recreated with filtered data
5. When filter is cleared, charts show all data again

### Simple Filter Logic
```typescript
// Example for file heatmap
const filteredData = selectedFileTypes.length > 0
  ? fileHeatData.filter(file => selectedFileTypes.includes(file.fileType))
  : fileHeatData
```

### Key Functions to Update
- `updateChartsWithFileTypeFilter()` in ChartManager
- Add filtering logic before chart creation
- Ensure proper cleanup when switching filters

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