The engine needs to emit progress updates as it goes.  add unit tests.  i want the th cli (`npm run analyse...`) to hook into those updates and peridoically log out a stutus update so the user can see it working.

## Implementation Plan

### Analysis
The repo-statter tool processes git commit history and generates reports. The main processing happens in:
1. `parseCommitHistory()` in `src/git/parser.ts` - fetches and parses git log
2. `generateReport()` in `src/report/generator.ts` - generates statistics and HTML report
3. Various stats calculations in `src/stats/calculator.ts`

Currently, there's no progress feedback during these operations, which can take time for large repositories.

### Implementation Approach

#### 1. Create Progress Reporter Interface
- Create `src/utils/progress-reporter.ts`
- Define interface: `ProgressReporter` with methods like `report(step: string, current?: number, total?: number)`
- Create two implementations:
  - `ConsoleProgressReporter` - logs to console for CLI
  - `SilentProgressReporter` - no-op for tests/programmatic usage

#### 2. Add Progress Reporting to Core Functions
- Modify `parseCommitHistory()` to accept optional `progressReporter` parameter
- Add progress updates at key points:
  - After fetching git log
  - During commit processing (every N commits)
  - After processing file changes
- Modify `generateReport()` to accept and pass through `progressReporter`
- Add progress updates for:
  - Starting report generation
  - Calculating statistics
  - Generating charts
  - Writing output files

#### 3. Update CLI Handler
- Modify `handleCLI()` in `src/cli/handler.ts`
- Create and pass `ConsoleProgressReporter` instance
- Add throttling to prevent excessive output (e.g., update every 100ms max)

#### 4. Add Unit Tests
- Test `ProgressReporter` implementations
- Test that progress is reported at expected points
- Test throttling behavior
- Ensure existing tests still pass with `SilentProgressReporter`

### Implementation Steps

1. **Step 1**: Create progress reporter interface and implementations
   - Small, focused commit
   - Can be tested in isolation

2. **Step 2**: Add progress reporting to `parseCommitHistory()`
   - Add optional parameter
   - Report progress during commit processing
   - Update tests

3. **Step 3**: Add progress reporting to `generateReport()`
   - Pass through progress reporter
   - Add progress updates for each major step
   - Update tests

4. **Step 4**: Wire up CLI to use console progress reporter
   - Create reporter in CLI handler
   - Pass to report generation
   - Test manually with real repositories

5. **Step 5**: Add throttling to prevent console spam
   - Implement time-based throttling
   - Add tests for throttling behavior

### Notes
- Keep changes minimal and focused
- Don't add unnecessary abstractions
- Ensure backward compatibility - progress reporting is optional
- Follow existing code patterns and style