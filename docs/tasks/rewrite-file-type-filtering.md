# Rewrite File Type Filtering

## Overview
The file type filtering feature allows users to filter charts in the "Code Analysis and File Metrics" section by clicking segments in the file types donut chart. This is a clean rewrite to fix broken toggle functionality.

## Desired Behavior

1. **Scope**: The filtering applies ONLY to the latest/HEAD state of the repository (not historical data)
   
2. **Filter Control**: The file types donut/ring chart serves as the filter control
   - Each segment represents a file type (TypeScript, JavaScript, JSON, etc.)
   - Segments are clickable and should show pointer cursor on hover
   
3. **Toggle Behavior**:
   - Click a segment → Filter charts to show only that file type
   - Click the same segment again → Remove filter (show all files)
   - Click a different segment → Switch filter to the new file type
   
4. **Affected Charts**:
   - File Activity Heatmap (treemap showing file sizes and activity)
   - Top Files charts (Largest, Most Churn, Most Complex tabs)
   - Time-based charts show informational message when filtered

## Current Problems

1. ApexCharts `dataPointSelection` event is not firing on pie/donut clicks
2. Hacky workaround with manual DOM event handlers was added
3. Toggle functionality is broken - can't clear filter by clicking same segment

## Technical Approach

### Step 1: Clean up chart-definitions.ts
Remove ALL of this hacky code:
```javascript
// DELETE lines 188-222 - the entire mounted event handler
mounted: function(chartContext: any) {
  // All the manual DOM manipulation code...
}
```

### Step 2: Fix the dataPointSelection handler
Keep a clean, simple handler:
```javascript
events: {
  dataPointSelection: function(event: any, chartContext: any, config: any) {
    if (config.dataPointIndex === undefined || config.dataPointIndex < 0) return;
    
    const selectedType = data.labels[config.dataPointIndex];
    if (!selectedType) return;
    
    // Get manager from window.globalManager (already set in charts.ts)
    const chartManager = window.globalManager;
    if (!chartManager) {
      console.error('Chart manager not available');
      return;
    }
    
    const currentFilter = chartManager.getFileTypeFilter();
    
    // Toggle logic: if same type, clear; otherwise switch
    if (currentFilter === selectedType) {
      chartManager.setFileTypeFilter(null);
    } else {
      chartManager.setFileTypeFilter(selectedType);
    }
  }
}
```

### Step 3: Ensure proper ApexCharts configuration
Make sure plotOptions are set correctly:
```javascript
plotOptions: {
  pie: {
    expandOnClick: false,  // Prevent slice expansion
    donut: {
      labels: {
        show: false
      }
    }
  }
}
```

### Step 4: Debug why events aren't firing
1. Check ApexCharts version and changelog for breaking changes
2. Test with a minimal example to isolate the issue
3. Verify chart instance is properly initialized
4. Check if other chart events work (like legendClick)

## Testing Criteria

1. **Visual feedback**:
   - Pie segments show pointer cursor on hover
   - Selected segment has visual indication (if possible)

2. **Toggle functionality**:
   - Click "TypeScript" → Only .ts files shown in heatmap and top files
   - Click "TypeScript" again → Filter cleared, all files shown
   - Click "JavaScript" → Filter switches to .js files only

3. **Chart updates**:
   - File heatmap updates to show only filtered files
   - Top files charts (all tabs) show only filtered files
   - Empty state shows message when no files match filter
   - Time-based charts show informational message

4. **State persistence**:
   - Filter state persists when switching between chart tabs
   - Filter state is maintained during chart recreations

## Alternative Approach (if ApexCharts events remain broken)

If we can't fix the ApexCharts events, implement a cleaner workaround:
1. Use the legend click events instead (more reliable)
2. Or add a separate filter control UI above the charts
3. As last resort, use a cleaner event delegation approach

## Success Criteria

- No manual DOM manipulation or setTimeout hacks
- Clean, maintainable code (~20 lines for event handler)
- All toggle functionality works as specified
- No console errors or warnings
- Code follows existing patterns in the codebase