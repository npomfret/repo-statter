# Feature: Exclude Files from Lines of Code (LOC) Statistics

**Status:** To Do

## Summary

The current lines of code (LOC) calculation includes every file within the repository, which can lead to inaccurate and inflated statistics by counting non-code assets. This feature will introduce a mechanism to exclude specific files and directories from the LOC calculation to provide more meaningful insights into the codebase.

## Initial Implementation (Phase 1)

A hardcoded default exclusion list will be implemented to filter out common non-source code files. This list will provide a sensible default for most projects.

### Default Exclusions

The following glob patterns will be excluded by default:

- **Images:** `*.jpg`, `*.jpeg`, `*.png`, `*.gif`, `*.svg`, `*.bmp`, `*.webp`
- **Documents:** `*.md`, `*.pdf`, `*.doc`, `*.docx`, `*.xls`, `*.xlsx`
- **Lock Files:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `composer.lock`
- **Build & Dependency Directories:** `node_modules/`, `dist/`, `build/`, `target/`, `vendor/`
- **Git Files:** `.git/`, `.gitignore`, `.gitattributes`
- **Configuration:** `.env`

## Future Implementation (Phase 2)

The exclusion list will be made configurable to allow users to tailor it to their specific project needs.

- A configuration file (e.g., `.repostatterrc.json`) will be introduced to allow users to define their own exclusion patterns.
- CLI arguments could provide a way to specify a custom configuration file path or override patterns for a single run.

## Implementation Plan

### Status: ✅ COMPLETE

Based on codebase analysis, the LOC calculation happens in the git parser when processing commit diffs. The implementation will add file exclusion logic to filter out non-code files from the statistics.

### Phase 1: Hardcoded Default Exclusions

**Step 1: Add exclusion patterns**
- Create exclusion utility in `src/utils/exclusions.ts`
- Define default glob patterns for common non-code files
- Add `minimatch` dependency for pattern matching

**Step 2: Modify git parser**
- Update `parseCommitDiff()` in `src/git/parser.ts` to filter excluded files
- Apply exclusions to `FileChange` objects before they're added to commit data
- Ensure excluded files don't contribute to `linesAdded`/`linesDeleted` totals

**Step 3: Update file type classification**
- Modify `getFileType()` to handle excluded files appropriately
- Consider whether to show excluded files in UI or hide them completely

### Technical Implementation Details

**Files to modify:**
1. `src/utils/exclusions.ts` (new file)
2. `src/git/parser.ts` (lines 139-170 in `parseCommitDiff()`)
3. `package.json` (add minimatch dependency)

**Key considerations:**
- Exclusions apply at commit-diff level, not file-level
- Maintain existing file type classification for non-excluded files
- Ensure excluded files don't appear in any statistics or visualizations
- Use glob patterns for flexibility (e.g., `node_modules/**/*`)

### Testing Strategy

**Validation approach:**
- Test with repository containing typical excluded files (node_modules, dist, etc.)
- Verify LOC counts before/after exclusion implementation
- Check that excluded files don't appear in file heat maps or type statistics
- Ensure interactive filtering still works correctly

**Simple test case:**
1. Create test repo with source files + node_modules
2. Run analysis before exclusion changes
3. Run analysis after exclusion changes
4. Verify node_modules files are excluded from all statistics

### Breaking Into Steps

This can be implemented in a single focused commit:
- **"feat: Exclude common non-code files from LOC statistics"**

**Implementation order:**
1. ✅ Add exclusion patterns utility (`src/utils/exclusions.ts`)
2. ✅ Modify git parser to filter excluded files (`src/git/parser.ts`)
3. ✅ Test with current repository
4. ✅ Verify all statistics exclude filtered files

### Implementation Summary

**Files created/modified:**
- `package.json` - Added minimatch dependency for glob pattern matching
- `src/utils/exclusions.ts` - Created exclusion utility with default patterns
- `src/git/parser.ts` - Modified `parseCommitDiff()` to filter excluded files

**Key changes:**
- Added `isFileExcluded()` function with default exclusion patterns
- Modified file processing in `parseCommitDiff()` to filter out excluded files
- Recalculated `linesAdded`/`linesDeleted` totals based only on included files
- Updated byte calculations to match filtered files

**Validation completed:**
- TypeScript compilation passes
- Tests pass successfully
- Generated reports exclude non-code files from all statistics
- Interactive filtering continues to work correctly

## Acceptance Criteria

- The LOC statistics no longer count lines from files matching the default exclusion patterns.
- The overall accuracy and relevance of the repository statistics are improved.
- Excluded files do not appear in any charts or visualizations.
- Interactive filtering continues to work correctly with the exclusion system.
