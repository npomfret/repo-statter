# Handle Missing Lizard Gracefully

## Problem
Currently, when Lizard is not installed, the complexity analysis fails silently and logs a warning to the console. However, users may not see this warning and wonder why the "Most Complex" tab is empty.

## Requirements

1. **Detection**: Check if Lizard is installed at the start of analysis
2. **User Notification**: Display a clear message in the HTML report when Lizard is missing
3. **Graceful Degradation**: Continue analysis without complexity data
4. **Installation Instructions**: Provide clear instructions in the report on how to install Lizard

## Current State Analysis

### Existing Code Structure
- `src/data/lizard-complexity-analyzer.ts`: Contains `checkLizardInstalled()` and `analyzeRepositoryComplexity()`
  - Already checks if Lizard is installed
  - Logs warnings to console when missing
  - Returns empty Map when Lizard not found
- `src/data/top-files-calculator.ts`: Calls `analyzeRepositoryComplexity()` in `getTopFilesByComplexity()`
  - Returns empty array when no complexity data
- `src/charts/top-files-chart.ts`: Renders the "Most Complex" tab
  - Currently shows "TODO: Complexity analysis coming soon" when data is empty
- `src/report/generator.ts`: Orchestrates report generation
  - Calls `getTopFilesStats()` which includes complexity data

## Implementation Plan

### Step 1: Early Detection and Status Tracking
1. Modify `src/report/generator.ts` to check Lizard status early:
   - Import `checkLizardInstalled` from lizard-complexity-analyzer
   - Check status after parsing commits
   - Pass status to chart data transformation

### Step 2: Pass Lizard Status Through Data Pipeline
1. Update `transformCommitData()` to include `isLizardInstalled` flag
2. Add `isLizardInstalled` to `ChartData` interface
3. Include this flag in the `pageData` passed to the frontend

### Step 3: Update Frontend Display
1. Modify `src/charts/top-files-chart.ts`:
   - Accept `isLizardInstalled` parameter in render method
   - When complex tab has no data AND Lizard is not installed:
     - Show informative message with installation instructions
     - Include benefits of complexity analysis
   - Keep existing "No data available" for other cases

### Step 4: Improve Console Warning
1. Update `src/report/generator.ts`:
   - Add prominent warning at start of analysis if Lizard missing
   - Use clear emoji and formatting: `⚠️  Lizard not found...`

### Step 5: Update Page Script Integration
1. Modify bundled page script to pass Lizard status to chart components
2. Ensure status is available when initializing TopFilesChart

## Minimal Implementation Approach
- Leverage existing `checkLizardInstalled()` function
- Minimal changes to data flow - just add one boolean flag
- Update only the display logic in chart component
- Reuse existing warning patterns from codebase

## Files to Modify
1. `src/report/generator.ts` - Add early check and pass status
2. `src/charts/top-files-chart.ts` - Update render logic for missing Lizard
3. `src/build/bundle-page-script.ts` or related - Ensure status is passed to chart

## Next Steps
Once approved, implement in order:
1. Early detection in generator
2. Update chart display logic
3. Test with and without Lizard installed
4. Verify console warnings appear at right time