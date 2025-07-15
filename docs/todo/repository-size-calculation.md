## Plan: Accurate Repository Size Calculation

This plan outlines the steps to change the repository size calculation from an estimated line-based approach to an accurate byte-based approach, tracking bytes added and removed per file in each commit.

### 1. Update `src/git/parser.ts`
- **Modify `CommitData` interface**: Add `bytesAdded` and `bytesDeleted` properties to the `FileChange` interface within `CommitData`.
- **Update `parseCommitHistory` function**: Enhance this function to extract byte-level statistics for each file changed in a commit. This will likely require modifying the `git log` command or adding a `git diff --numstat` call for each commit to get accurate byte counts.

### 2. Update `src/stats/calculator.ts`
- Review and adjust any functions that currently process `linesAdded` or `linesDeleted` for size calculations to instead use the new `bytesAdded` and `bytesDeleted` fields from the `CommitData`.

### 3. Update `src/chart/data-transformer.ts`
- **Modify `getTimeSeriesData` and `getLinearSeriesData`**: Update these functions to calculate `cumulativeBytes` based on the actual `bytesAdded` and `bytesDeleted` from the commit data, rather than the current estimation (`linesAdded * 50`).

### 4. Update `src/report/generator.ts`
- **Modify `renderRepositorySizeChart` function**: Ensure this function correctly utilizes the new byte-based cumulative data for rendering the chart.
- **Update Tooltip**: Verify that the tooltip for the repository size chart accurately displays the `bytesAdded` and `bytesDeleted` for each commit, using the `formatBytes` utility function.

### Verification
- Run `npm run typecheck` to ensure all TypeScript changes are valid.
- Generate a report and visually inspect the 'Repository Size' chart and its tooltips to confirm accuracy and correct data representation.