# Code Quality Report

This report details findings of bad practices and other areas for improvement in the codebase.

### 1. Inconsistent `isRealCommit` Logic

The `isRealCommit` function is defined in both `src/data/award-calculator.ts` and `src/data/contributor-calculator.ts`, but the implementations are different. The version in `award-calculator.ts` is much more comprehensive. This is a clear violation of the DRY (Don't Repeat Yourself) principle and can lead to inconsistent behavior.

**Recommendation:** Consolidate these into a single, shared function in `src/utils/` and use it in both places.

**Implementation Plan:**
1. Create a new file `src/utils/commit-filters.ts` to house commit filtering utilities
2. Move the more comprehensive `isRealCommit` implementation from `award-calculator.ts` to this new file
3. Export the function from the new module
4. Update both `award-calculator.ts` and `contributor-calculator.ts` to import and use the shared function
5. Run tests to ensure no regressions

**Details:**
- The `award-calculator.ts` version includes more comprehensive automated pattern checks including:
  - Conflict resolution patterns
  - Automated bot commits (renovate, dependabot)
  - Version bumps and dependency updates
  - Revert commits
- The `contributor-calculator.ts` version only checks for basic merge commits
- Using the more comprehensive version will ensure consistent filtering across the codebase

### 2. Hardcoded `magic string` in `git/parser.ts`

In `src/git/parser.ts`, the `parseCommitDiff` function has this code:

```typescript
const diffArgs = isFirstCommit
  ? [`4b825dc642cb6eb9a060e54bf8d69288fbee4904..${commitHash}`]
  : [commitHash + '^!']
```

The hash `4b825dc642cb6eb9a060e54bf8d69288fbee4904` is the "empty tree" hash in Git. Using this magic string is brittle and obscure.

**Recommendation:** Add a comment to explain what this hash is and why it's being used. For example:

```typescript
// Use the empty tree hash to diff the first commit against nothing
const diffArgs = isFirstCommit
  ? [`4b825dc642cb6eb9a060e54bf8d69288fbee4904..${commitHash}`]
  : [commitHash + '^!']
```

### 3. Overly Complex CLI Handling in `cli/handler.ts`

The `handleCLI` function in `src/cli/handler.ts` has some confusing logic for determining the output directory:

```typescript
const outputDir = options.repo ? 'analysis' : options.output
```

This is not intuitive. The output directory should be determined by the `--output` option, regardless of whether `--repo` is used.

**Recommendation:** Simplify this logic to always use the `--output` option, and if it's not provided, use a sensible default.

### 4. Unnecessary `stats/calculator.ts` file

The file `src/stats/calculator.ts` seems to be a remnant of a previous refactoring. It re-exports functions from other calculator files. This adds an unnecessary layer of indirection.

**Recommendation:** Remove this file and have the report generator import directly from the specific calculator files (`award-calculator.ts`, `contributor-calculator.ts`, etc.).

### 5. Inefficient Data Handling in `report/generator.ts`

The `generateReport` function calculates some statistics twice. For example, `getContributorStats` and `getFileTypeStats` are called in `injectDataIntoTemplate`, but some of the same data is also calculated in the main `generateReport` function to be written to `repo-stats.json`.

**Recommendation:** Calculate all statistics once and pass them to the template injection and file writing functions. This will improve performance and reduce the chance of inconsistencies.
