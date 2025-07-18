The engine needs to emit progress updates as it goes.  add unit tests.  i want the th cli (`npm run analyse...`) to hook into those updates and peridoically log out a stutus update so the user can see it working.

## Implementation Status

### Current State Analysis ✅ COMPLETED
Progress reporting infrastructure is **already implemented**:

1. **Core Infrastructure** (ALREADY EXISTS):
   - `ProgressReporter` interface in `src/utils/progress-reporter.ts`
   - `ConsoleProgressReporter` - logs progress to console with format `[Progress] step` or `[current/total] step`
   - `SilentProgressReporter` - no-op implementation for tests
   - `ThrottledProgressReporter` in `src/utils/throttled-progress-reporter.ts` - prevents console spam with configurable throttle (default 100ms)

2. **Existing Integration**:
   - ✅ `parseCommitHistory()` - reports commit fetching and processing progress
   - ✅ `generateReport()` - reports major steps (loading template, calculating stats, generating report)
   - ✅ CLI handler - creates throttled console reporter (200ms throttle) and passes to report generation
   - ✅ Comprehensive unit tests for all reporter implementations

3. **What's Missing**:
   - ❌ Progress reporting in individual statistics calculation functions
   - ❌ More granular progress updates during chart generation
   - ❌ Progress reporting in file processing functions
   - ❌ Integration tests verifying progress is reported at expected points

## Refined Implementation Plan

Since the core infrastructure already exists, we only need to add more progress reporting points to provide better visibility into long-running operations.

### Implementation Steps

1. **Step 1**: Add progress to statistics calculations
   - Add optional `progressReporter` parameter to functions in `src/stats/calculator.ts`
   - Report progress for:
     - `getContributorStats()` - when processing many contributors
     - `getFileTypeStats()` - when aggregating file types
     - Award calculations - for each award type
   - Small, focused commit

2. **Step 2**: Add progress to data transformation
   - Add progress reporting to `src/chart/data-transformer.ts`:
     - `getTimeSeriesData()` - when processing time series
     - `getLinearSeriesData()` - when processing linear data
   - Report progress for large datasets

3. **Step 3**: Add progress to file processing
   - Add progress to `src/data/file-calculator.ts`:
     - `getFileHeatData()` - when processing many file changes
   - Add progress to `src/data/top-files-calculator.ts`:
     - `getTopFilesStats()` - when calculating top files

4. **Step 4**: Add integration tests
   - Create `src/integration/progress-reporting.test.ts`
   - Verify progress is reported at expected points during full analysis
   - Use `SilentProgressReporter` with spy to capture calls
   - Ensure no performance regression

5. **Step 5**: Fine-tune progress messages
   - Review all progress messages for clarity and consistency
   - Ensure messages provide meaningful information
   - Test with large repositories to verify usefulness

### Notes
- Progress reporting is already optional - maintain backward compatibility
- Use existing patterns - don't reinvent the wheel
- Focus on operations that take significant time
- Keep progress messages concise and informative
- The existing throttling (200ms in CLI) prevents console spam

### Minor Fix Needed
- Fix typo in `src/report/generator.ts` line 128: "the progres" (incomplete text) - **UPDATE: This appears to have been fixed already**

## Updated Requirements from User

The CLI already has progress reporting, but it should be enhanced to show:
1. **During commit processing**: Print commit hash, commit time, and author for each commit being processed
2. **At completion**: Print the full path to the generated HTML report file

### Revised Implementation Plan

Since progress reporting infrastructure exists and works, we need a simpler, more focused implementation:

1. **Step 1**: Enhance commit processing progress
   - Modify `parseCommitHistory()` in `src/git/parser.ts`
   - Instead of just showing `[X/Y] Processing commits`, include commit details:
     - Format: `[X/Y] Processing commit: <hash> by <author> at <date>`
   - Keep using the existing throttling to prevent spam

2. **Step 2**: Add report path to completion message
   - Modify `generateReport()` in `src/report/generator.ts`
   - Return the generated report path
   - Modify CLI handler to display the path after completion
   - Format: `Report generated: /absolute/path/to/report.html`

This is a much simpler task than originally planned - just enhancing the existing progress messages with more useful information.