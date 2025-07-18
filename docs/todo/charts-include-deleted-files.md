# Bug Report: Charts Include Deleted Files

## Summary

The "File Types" chart and the "Largest / Most Churn" charts are including data from files that have been deleted from the repository. These charts should only reflect the state of the files present in the latest commit (i.e., at HEAD).

## Affected Charts

- **File Types Chart:** This chart currently aggregates file type statistics over the entire history of the repository. If a file type was once prevalent but has since been completely removed (e.g., migrating from `.js` to `.ts`), it still appears in the chart, which is misleading.
- **Top Files (Largest / Most Churn) Charts:** These charts list files that may no longer exist. A file that was once very large or had a high amount of churn but was subsequently deleted will still incorrectly appear in these rankings.

## Expected Behavior

All chart calculations that are based on the current state of the repository should only consider the files that exist in the latest commit. The analysis should be performed on the repository's file tree as of HEAD, not on the entire git history for these specific metrics.

## Steps to Reproduce

1. Create a repository.
2. Add a large file of a unique type (e.g., `my-large-file.foo`).
3. Commit the file.
4. Delete the file `my-large-file.foo`.
5. Commit the deletion.
6. Run the repo-statter analysis.
7. Observe that the "File Types" chart includes `.foo` and the "Largest Files" chart may include `my-large-file.foo`.

## Analysis

After analyzing the codebase, I've identified the root cause:

**Current Implementation:**
- `getFileTypeStats()` in `src/data/file-calculator.ts` processes **all commits** and aggregates file type statistics
- `getTopFilesBySize()` and `getTopFilesByChurn()` in `src/data/top-files-calculator.ts` similarly process all historical file changes
- No filtering is applied to check if files still exist in the current HEAD

**Problem Areas:**
1. **File Type Chart**: Aggregates lines added by file type across entire history without checking current existence
2. **Top Files Charts**: Tracks cumulative file sizes and churn without filtering deleted files

## Implementation Plan

### Step 1: Add Git Function to Get Current Files
- Add `getCurrentFiles()` function to `src/git/parser.ts`
- Use `git ls-tree -r HEAD --name-only` to get all files in current HEAD
- Return Set<string> for efficient lookup

### Step 2: Modify File Type Statistics
- Update `getFileTypeStats()` in `src/data/file-calculator.ts`
- Add `currentFiles` parameter and filter file changes to only include existing files
- Maintain backward compatibility with optional parameter

### Step 3: Modify Top Files Calculations
- Update `getTopFilesBySize()` and `getTopFilesByChurn()` in `src/data/top-files-calculator.ts`
- Add `currentFiles` parameter and filter results to only include existing files
- Ensure final results only contain files that exist in HEAD

### Step 4: Update Statistics Calculator
- Modify `calculateStatistics()` in `src/stats/calculator.ts`
- Call `getCurrentFiles()` and pass result to the filtering functions
- Ensure minimal performance impact

### Step 5: Add Tests
- Test that deleted files are properly filtered out
- Test that existing files are correctly included
- Test edge cases (empty repo, all files deleted)

## Solution

The fix requires:
1. Adding a function to get current files from git HEAD
2. Filtering historical data to only include files that still exist
3. Ensuring the filtering is applied consistently across all chart calculations

This is a **simple, focused fix** that addresses the core issue without requiring major refactoring.

## Impact
- **Type**: Bug fix - improves data accuracy
- **Risk**: Low (pure filtering logic, no breaking changes)
- **Complexity**: Simple
- **Benefit**: High value - ensures charts reflect current repository state
