# Fix Broken Charts from Architecture Simplification

## Status: IN PROGRESS

### Completed:
- ✅ **Fixed Growth Over Time chart (FULLY RESTORED)**
  - ✅ Restored Repository Size (bytes) series
  - ✅ Restored dual y-axes with proper formatting
  - ✅ Fixed By Date/By Commit toggle buttons
  - ✅ Restored detailed commit tooltips with full information
- ✅ **Fixed File Type Filtering (FULLY RESTORED)**
  - ✅ Implemented click event handler for donut chart segments
  - ✅ Added global selectedFileType state management
  - ✅ Restored file type indicator UI with show/hide functionality  
  - ✅ Implemented file heatmap filtering with empty state handling
  - ✅ Added top files chart filtering across all views with file type mapping
  - ✅ Wired up "Clear filter" button functionality
  - ✅ Charts now properly filter when clicking file type segments

### Issues Found:

## 1. Growth Over Time Chart (FULLY FIXED) ✅
**Problems Found:**
- ❌ Missing Repository Size series (only showing Lines of Code)
- ❌ Missing second y-axis for bytes formatting
- ❌ By Date/By Commit buttons non-functional
- ❌ Lost detailed commit tooltips (reduced to basic info)

**Root Causes:**
- Simplified implementation removed the bytes series
- Event handlers not wired up in new architecture
- No mechanism to rebuild chart when toggling axis
- Custom tooltip logic was replaced with basic template

**Solutions Implemented:**
- ✅ Added formatBytes utility function
- ✅ Restored dual series with yAxisIndex configuration
- ✅ Added chartData store to save data for rebuilding
- ✅ Implemented setupEventHandlers() function
- ✅ Fixed updateGrowthChartAxis() to destroy and rebuild chart
- ✅ Restored detailed commit tooltips with all original information:
  - Commit SHA, author, date, message (truncated)
  - Lines added/deleted with net calculation
  - Bytes added/deleted with formatting
  - Cumulative totals for lines and size

**Status:** COMPLETE - Growth Chart fully restored to original functionality

## 2. Other Potentially Broken Charts (TO BE VERIFIED)

### Top Files Chart
- Need to verify tab switching works (Largest/Most Churn/Most Complex)
- May need similar event handler wiring

### File Types Chart  
- Need to verify click-to-filter functionality
- May need event handlers for interactive filtering

### Time Slider
- Already verified working with all time series charts
- Should continue monitoring for edge cases

### User Activity Charts
- Need to verify accordion expansion triggers chart rendering
- May need lazy loading restoration

### Theme Switching
- Need to verify charts update when theme changes
- May need to implement theme change handler

### Font Rendering Issues (INVESTIGATING)
- User reported fonts appear "weird and harder to read" 
- Investigation findings:
  - ✅ Bootstrap Icons CSS is properly loaded from CDN
  - ✅ Chart font specifications match original (Arial for word cloud, standard fonts elsewhere)
  - ✅ Template CSS font settings are identical to original
- Potential causes:
  - Browser caching of old stylesheets (try hard refresh: Cmd/Ctrl + Shift + R)
  - ApexCharts library using different default fonts in bundled version
  - Font rendering differences between original complex architecture and simplified version
- Next steps: Need specific comparison of which fonts/text appear different

## 3. General Issues to Check

### Event Handlers
- Many interactive elements lost their event handlers
- Need systematic review of all UI interactions

### Data Persistence
- Some charts may need data storage for rebuilding
- Consider consistent pattern for all interactive charts

### Performance
- Synchronous rendering may impact initial load time
- Monitor for performance regressions with large datasets

## Next Steps

1. Test each chart systematically for broken functionality
2. Apply similar fixes as Growth Chart where needed:
   - Store chart data for rebuilding
   - Wire up event handlers
   - Implement proper update functions
3. Create consistent patterns for:
   - Chart data storage
   - Event handler registration
   - Chart rebuilding/updating
4. Add integration tests for chart interactions

## Technical Debt

The simplification removed valuable abstractions that handled:
- Event delegation and management
- Chart lifecycle management  
- Error boundaries and recovery
- Lazy loading for performance

Consider selective restoration of these features if issues persist.