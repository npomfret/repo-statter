# Plan: Remove Churn Charts

## Objective
Remove the "churn" charts and related calculations from the codebase. This will simplify the report and the underlying data processing, as the churn metric is not considered a core feature.

## Implementation Plan

This task involves removing code from data calculation, chart rendering, and the HTML template.

### 1. Remove Churn Calculation from Data Transformation
-   **File**: `src/chart/data-transformer.ts` (or its new equivalent, e.g., `src/data/time-series-transformer.ts`)
-   **Action**: Locate the logic that calculates churn data. This is likely within the `getTimeSeriesData` or a similar function that processes the commit history. Remove any lines related to calculating `churn` or `net lines of code` if it's only used for the churn chart.

### 2. Remove Churn Chart Rendering Logic
-   **File**: `src/report/generator.ts`
-   **Action**:
    -   Search for and delete the `renderCodeChurnChart` function or any `CodeChurnChart` class.
    -   Remove any calls to this function from the main report generation flow.
    -   Remove any variables or data structures that are only used by the churn chart.

### 3. Remove Churn Chart from HTML Template
-   **File**: `src/report/template.html`
-   **Action**: Find the `div` element that serves as the container for the churn chart (e.g., `<div id="codeChurnChart"></div>`) and delete it, including its parent card or column if it's no longer needed.

### 4. Clean up Related Code
-   **Action**: After removing the core components, perform a search across the codebase for the term "churn" to identify and remove any leftover helper functions, type definitions, or comments related to the feature.

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
