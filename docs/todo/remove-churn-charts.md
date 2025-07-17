# Plan: Remove Churn Charts

## Objective
Remove the "churn" charts and related calculations from the codebase. This will simplify the report and the underlying data processing, as the churn metric is not considered a core feature.

## DETAILED IMPLEMENTATION PLAN

Based on current codebase analysis, here's what needs to be removed:

### Step 1: Remove totalCodeChurn from report generation
**File**: `src/report/generator.ts`
- Remove `totalCodeChurn: number` from `ChartData` interface (line 81)
- Remove `totalCodeChurn` calculation (line 92)
- Remove `totalCodeChurn` from `chartData` object (line 112)
- Remove `totalCodeChurn` from template data (line 177)

### Step 2: Remove CodeChurnChart class
**File**: `src/charts/code-churn-chart.ts`
- Delete the entire file

### Step 3: Remove churn chart from chart renderers
**File**: `src/chart/chart-renderers.ts`
- Remove `CodeChurnChart` import (line 9)
- Remove `codeChurnChart: CodeChurnChart` property (line 19)
- Remove `new CodeChurnChart('codeChurnChart')` initialization (line 29)
- Remove `codeChurnChart.render()` calls (lines 40, 268)
- Remove `codeChurn: this.codeChurnChart` from charts object (line 284)

### Step 4: Remove churn chart from HTML template
**File**: `src/report/template.html`
- Remove totalCodeChurn display (lines 361-362)
- Remove entire "Code Churn Over Time" card section (lines 413-425)

### Step 5: Remove any remaining churn references
- Search for any remaining "churn" references in tests or other files
- Remove any unused imports or type definitions

This approach ensures complete removal while maintaining the existing functionality of all other charts.

## APPROACH DECISION

I'll implement this as atomic steps that can be broken down into individual commits:

### Commit 1: Remove totalCodeChurn from report generation
- Remove totalCodeChurn calculation and interface
- Remove from template data
- This is safe as it only affects the display metric

### Commit 2: Remove CodeChurnChart class and references
- Delete the chart file
- Remove from chart renderers
- Remove from HTML template
- Remove any remaining references

This approach minimizes risk by first removing the calculation, then the chart implementation. Each commit can be tested independently.

**Complexity**: Simple - straightforward code removal
**Risk**: Low - removing unused code is safer than adding new features
**Benefit**: Cleaner codebase, simpler report generation

## Verification
1.  **Run Tests**: Execute the full test suite (`npm run test`) to ensure that the removal has not introduced any regressions.
2.  **Generate Report**: Generate a new report and visually inspect it to confirm that:
    -   The churn chart is no longer present.
    -   The layout of the remaining charts is correct.
    -   The report generation completes without errors.
3.  **Check for Errors**: Open the browser's developer console on the generated report to ensure there are no JavaScript errors.

## Impact
-   **Type**: Feature removal / Refactoring.
-   **Risk**: Low. Removing a feature is generally less risky than adding one. The main risk is accidentally removing code that is shared by other components.
-   **Complexity**: Simple. It's a straightforward deletion of code across a few files.
-   **Benefit**: Simplifies the codebase and the final report, making both easier to maintain and understand.
