# Duplicated Code Report

This report details findings of duplicated or structurally similar code that could be refactored to improve maintainability and reduce lines of code.

## High-Priority Refactoring Candidates

### 1. `getTopCommitsBy...` Functions in `src/data/award-calculator.ts`

**Observation:** The following five functions are nearly identical in structure:
- `getTopCommitsByFilesModified`
- `getTopCommitsByBytesAdded`
- `getTopCommitsByBytesRemoved`
- `getTopCommitsByLinesAdded`
- `getTopCommitsByLinesRemoved`

Each function performs the same sequence of operations:
1. Filters a list of commits using `isRealCommit`.
2. Maps the filtered commits to a `CommitAward` object, extracting a different `value` for each function.
3. Sorts the results in descending order based on the `value`.
4. Slices the array to get the top 5 results.

**Recommendation:** Consolidate these five functions into a single, more generic function. This new function could accept a value extractor function as an argument to determine which metric to use for sorting, significantly reducing code duplication.

### 2. `isRealCommit` Function Duplication

**Observation:** The `isRealCommit` function is implemented in both `src/data/award-calculator.ts` and `src/data/contributor-calculator.ts`. The implementations are similar but not identical, with the one in `award-calculator.ts` being more comprehensive.

**Recommendation:** Create a single, shared `isRealCommit` utility function in a common location (e.g., `src/utils/`). Both calculators should then use this single source of truth for commit filtering. This will improve consistency and make it easier to update the filtering logic in the future.

## Medium-Priority Refactoring Candidates

### 3. Structurally Similar Test Files

**Observation:** Several test files exhibit structural similarities, leading to boilerplate code.
- **`award-calculator.test.ts`**: Contains multiple `describe` blocks for each award type with similar test cases for handling empty arrays, sorting, and filtering.
- **`contributor-calculator.test.ts`**: The tests for `getLowestAverageLinesChanged` and `getHighestAverageLinesChanged` are very similar, differing only in the sort order.

**Recommendation:** Refactor the tests to be more concise and data-driven. Utilizing `it.each` from `vitest` could parameterize the tests in `award-calculator.test.ts`, allowing a single set of test logic to run against different configurations and award types. This would reduce redundancy and make the tests easier to maintain.
