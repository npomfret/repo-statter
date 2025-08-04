# Rewrite File Type Filtering

## Overview
The file type filtering feature allows users to filter charts in the "Code Analysis and File Metrics" section by clicking segments in the file types donut chart. This is a complete rewrite to fix broken toggle functionality by decoupling the filter logic from ApexCharts events.

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
2. Hacky workaround with manual DOM event handlers was added (now removed)
3. Toggle functionality is broken - can't clear filter by clicking same segment
4. Current approach tightly couples filtering to ApexCharts events

## Complete Rewrite Plan - Clean Architecture

### Step 1: Create Independent Filter Control System
Instead of relying on ApexCharts events, create a separate filter control layer:

1. **New file**: `src/visualization/filters/file-type-filter.ts`
   - Standalone filter state management
   - Event emitter for filter changes
   - Decoupled from chart implementation

2. **Custom Click Handlers**
   - Attach listeners to chart SVG elements after render
   - Use data attributes to identify segments
   - Handle toggle logic independently

### Step 2: Refactor ChartManager
1. Remove direct filter state from ChartManager
2. Subscribe to filter events from the new filter system
3. Keep chart recreation logic but triggered by events

### Step 3: Implement Clean UI Controls
1. **Option A**: Keep donut chart but with custom event handling
   - Use chart's `mounted` callback to attach proper listeners
   - Add visual feedback (opacity changes on selection)
   - Ensure pointer cursor on hover

2. **Option B**: Add explicit filter buttons above charts
   - Clear visual state of what's filtered
   - Easier to implement and more reliable
   - Better accessibility

### Step 4: Data Flow Architecture
```
Unfiltered Data (ChartManager)
    ↓
Filter System (file-type-filter.ts)
    ↓
Filtered Data
    ↓
Chart Updates (via events)
```

### Step 5: Implementation Details

1. **Delete/Modify Files**:
   - Remove ApexCharts event handlers from `chart-definitions.ts`
   - Create new `src/visualization/filters/` directory
   - Add filter control module

2. **New Filter Module** (`file-type-filter.ts`):
   ```typescript
   export class FileTypeFilter {
     private currentFilter: string | null = null
     private listeners: Set<(filter: string | null) => void> = new Set()
     
     setFilter(fileType: string | null): void
     getFilter(): string | null
     toggle(fileType: string): void
     subscribe(callback: (filter: string | null) => void): void
     unsubscribe(callback: (filter: string | null) => void): void
   }
   ```

3. **Integration Points**:
   - Initialize filter in `charts.ts`
   - Connect to ChartManager
   - Attach to UI after chart render

### Step 6: Testing Strategy
1. Create test HTML with sample data
2. Verify toggle behavior works correctly
3. Ensure all charts update properly
4. Test empty states and edge cases

## Benefits of This Approach
1. **Decoupled**: Filter logic independent of charting library
2. **Reliable**: No dependency on flaky ApexCharts events  
3. **Maintainable**: Clear separation of concerns
4. **Extensible**: Easy to add more filter types later
5. **Testable**: Filter logic can be unit tested independently

## Success Criteria
✅ Click segment → Filter applied
✅ Click same segment → Filter cleared
✅ Click different segment → Filter switched
✅ Visual feedback on active filter
✅ All charts update correctly
✅ No console errors
✅ Clean, maintainable code (~100 lines total)