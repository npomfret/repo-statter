# Plan: Add Top 10 Most Complex Code Files to Dashboard

## Task Status
**Status**: Ready for implementation  
**Estimated Size**: Small - Single feature addition with existing UI support

## Objective
Integrate code complexity analysis into `repo-statter` and display the top 10 most complex files on the generated dashboard. The UI already has a "Most Complex" tab in place that currently shows "TODO: Complexity analysis coming soon".

## Current State Analysis
- The project has existing infrastructure for displaying top files (by size and churn)
- `src/data/top-files-calculator.ts` has `getTopFilesStats()` that returns `mostComplex: []` (empty array)
- The UI chart component (`src/charts/top-files-chart.ts`) already handles complexity display
- File exclusion patterns are already implemented in `src/utils/exclusions.ts`
- No complexity analysis library is currently installed

## Proposed Complexity Metric
*   **Cyclomatic Complexity**: This is a widely recognized metric that measures the number of linearly independent paths through a program's source code. It's a good indicator of testability and maintainability.

## Chosen Library

**`escomplex`** is the recommended library for this task due to:

*   **Comprehensive Metrics**: Provides cyclomatic complexity and other metrics for JavaScript/TypeScript
*   **Programmatic Integration**: Designed for embedding into tools like ours
*   **Reliability**: Well-established library used by many complexity analysis tools

Note: `escomplex` requires parsing JavaScript/TypeScript files, so we'll focus on `.js`, `.ts`, `.jsx`, and `.tsx` files only.

## Implementation Steps

### Phase 1: Core Implementation

#### 1. Install `escomplex`
```bash
npm install escomplex --save-dev
```

#### 2. Create Complexity Calculator
- Create new file: `src/data/complexity-calculator.ts`
- Implement `analyzeFileComplexity(filePath: string): Promise<number>` function
  - Read file content using Node.js fs
  - Pass content to `escomplex.analyse()`
  - Return the aggregate cyclomatic complexity
  - Handle errors gracefully (return 0 for non-parseable files)

#### 3. Implement `getTopFilesByComplexity()`
- Add to `src/data/top-files-calculator.ts`
- Pattern to follow: Similar to `getTopFilesBySize()` and `getTopFilesByChurn()`
- Steps:
  1. Get list of current files in repository (using simple-git)
  2. Filter for JS/TS files (`.js`, `.ts`, `.jsx`, `.tsx`)
  3. Apply exclusion patterns from `src/utils/exclusions.ts`
  4. Calculate complexity for each file
  5. Sort by complexity descending
  6. Return top 5 (matching existing pattern, not 10 as originally planned)
  7. Calculate percentages for consistency

#### 4. Update Report Generator
- Modify `src/report/generator.ts`:
  - Import the complexity calculator
  - Call `getTopFilesByComplexity()` when generating top files stats
  - No template changes needed - UI already supports complexity display

### Phase 2: Testing & Optimization

#### 5. Add Tests
- Create `src/data/complexity-calculator.test.ts`
  - Test with sample JS/TS code snippets
  - Test error handling for non-JS files
- Update `src/data/top-files-calculator.test.ts` if it exists

#### 6. Performance Optimization (if needed)
- Implement concurrent file analysis using `Promise.all()`
- Add progress logging for large repositories

### Implementation Notes
- Focus on current repository state only (no historical tracking)
- Reuse existing patterns and infrastructure
- Keep it simple - no caching in initial implementation
- The UI will automatically display results once data is provided

## Next Steps
Once this plan is approved, I will proceed with the implementation, starting with installing `escomplex` and integrating the complexity calculation.
