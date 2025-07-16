# Plan: Add Top 10 Most Complex Code Files to Dashboard

## Objective
Integrate code complexity analysis into `repo-statter` and display the top 10 most complex files on the generated dashboard.

## Proposed Complexity Metric
*   **Cyclomatic Complexity**: This is a widely recognized metric that measures the number of linearly independent paths through a program's source code. It's a good indicator of testability and maintainability. We can also consider the Maintainability Index (MI) as a composite metric if `escomplex` provides it.

## Chosen Library

After reviewing several options, **`escomplex`** remains the recommended library for this task due to the following reasons:

*   **Comprehensive Metrics**: It provides robust complexity analysis for JavaScript/TypeScript code, including both Cyclomatic Complexity (our primary focus) and Halstead metrics. This allows for potential future expansion of complexity reporting.
*   **Foundational**: `escomplex` is a foundational library that many other complexity analysis tools are built upon, indicating its reliability and accuracy.
*   **Programmatic Integration**: It's designed for programmatic use, which is essential for integrating it directly into our existing file processing and report generation workflow.

While other libraries like `cognitive-complexity-ts` (for Cognitive Complexity) or `tsmetrics-core` (for configurable complexity) offer valuable insights, `escomplex` provides the core Cyclomatic Complexity metric efficiently and is well-suited for our current objective of identifying the most complex files based on control flow.

## Implementation Steps

### 1. Install `escomplex`
Add `escomplex` as a development dependency to the project.
```bash
npm install escomplex --save-dev
```

### 2. Integrate Complexity Calculation
*   **Focus on Current State**: The complexity analysis will be performed on the current, latest state of the repository's files, not historical data.
*   **Identify Integration Point**: The `src/git/parser.ts` or `src/stats/calculator.ts` seem like logical places to integrate the complexity analysis, as they already process file content and generate statistics. We'll need to read the content of each relevant file.
*   **File Filtering**: Ensure that only relevant code files (e.g., `.ts`, `.js`, `.tsx`, `.jsx`) are analyzed. Exclude generated files, test files, and node_modules. The existing `src/utils/exclusions.ts` might be useful here.
*   **Analysis Logic**:
    *   For each relevant file, read its content.
    *   Pass the content to `escomplex` to get the complexity metrics.
    *   Store the cyclomatic complexity score (or chosen metric) along with the file path.

### 3. Store Complexity Data
*   **Extend Data Structure**: Modify the existing data structures (likely within `src/stats/calculator.ts` or the report generation data) to include the complexity score for each file. This might involve adding a `complexity` property to file objects.

### 4. Identify Top 10 Files
*   **Sorting and Selection**: After calculating complexity for all files, sort them in descending order based on their complexity score.
*   **Limit Results**: Select the top 10 files from the sorted list.

### 5. Update Dashboard Generation
*   **Modify `src/report/generator.ts`**:
    *   Pass the list of top 10 complex files to the report generation logic.
    *   Ensure the data is formatted correctly for display in the HTML template.
*   **Modify `src/report/template.html`**:
    *   Add a new section (e.g., a new card or table) to display the "Top 10 Most Complex Code Files".
    *   For each file, display its name, path, and complexity score. Consider adding a link to the file if feasible (though this might be out of scope for the initial implementation).

### 6. Performance Considerations
*   **Caching**: For very large repositories, consider caching complexity results to avoid re-analyzing unchanged files on subsequent runs. This might require a mechanism to detect file changes.
*   **Parallel Processing**: If analysis is slow, explore running `escomplex` in parallel for multiple files.

### 7. Testing
*   **Unit Tests**: Add unit tests for the complexity calculation logic (e.g., in `src/stats/calculator.test.ts` or a new test file).
*   **Integration Tests**: Verify that the top 10 files are correctly identified and displayed in the generated report. This might involve generating a report for a small, controlled repository.

## Next Steps
Once this plan is approved, I will proceed with the implementation, starting with installing `escomplex` and integrating the complexity calculation.
