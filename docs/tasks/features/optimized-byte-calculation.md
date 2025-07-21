# Optimized Byte Calculation

## Status
**Status**: Completed - Phase 1
**Priority**: Medium (accuracy improvement over existing functionality)
**Estimated effort**: Medium
**Completion date**: 2025-07-21

## Implementation Summary
Phase 1 has been successfully implemented:
- ✅ Replaced line-based estimation (50 bytes/line) with accurate byte calculation
- ✅ Uses `git diff --raw` to get blob hashes and `git cat-file -s` for exact sizes
- ✅ Completely replaced estimation with accurate calculation
- ✅ No configuration option needed - accurate calculation is now the default
- ✅ Integration test written to verify accuracy

## Idea
Improve the accuracy of byte change and repository size calculations, as the current method uses a rough estimate (1 line ≈ 50 bytes).

## Implementation Plan

### Phase 1: Core Implementation (Small commit)
1. **Create new accurate byte calculator**
   - Add new function `getAccurateByteChanges` in `src/data/git-extractor.ts`
   - Use `git diff --raw` to get blob hashes for changed files
   - Use `git cat-file --batch-check` for efficient size retrieval
   - Keep existing `parseByteChanges` function for backwards compatibility

2. **Add configuration option**
   - Add `useAccurateByteCalculation: boolean` to config schema (default: false)
   - This allows users to opt-in to the more accurate but potentially slower calculation

3. **Update parser to use new function**
   - Modify `getByteChanges` in `src/git/parser.ts` to choose between methods based on config

4. **Add tests**
   - Unit tests for new `getAccurateByteChanges` function
   - Integration test comparing estimated vs accurate calculations

### Phase 2: Performance Optimization (Separate commit if needed)
1. **Implement caching for blob sizes**
   - Cache blob hash -> size mappings to avoid repeated lookups
   - Clear cache between repository analyses

2. **Batch git operations**
   - Use `git cat-file --batch` for multiple blob size lookups in one command

### Phase 3: Repository Size Calculation (Optional, separate feature)
- This can be deferred as it's a separate feature from byte change calculation
- Would require traversing tree objects which is more complex

## Implementation Suggestions

### 1. Accurate Byte Change Calculation
- **`git diff --numstat` with `git cat-file -s`:** Instead of estimating bytes from lines, directly calculate byte changes.
    - For each file in `git diff --numstat` output, get the blob hash for the old and new versions.
    - Use `git cat-file -s <blob-hash>` to get the exact size of the file at that commit.
    - The difference in sizes between the old and new blob is the exact byte change.
- **`git diff --raw`:** This command can also provide object IDs which can then be used with `git cat-file -s`.

### 2. Accurate Repository Size Calculation
- **`git rev-list --objects --all | git cat-file --batch-check="%(size)"`:** This command can list all objects in the repository and their sizes, allowing for a precise calculation of the total repository size at a given commit.
- **Tree Traversal:** For a specific commit, traverse its tree object and sum the sizes of all blobs (files) it points to. This is more complex but accurate.

### 3. Performance Considerations
- **Caching:** For very large repositories, performing `git cat-file` for every file in every commit can be slow. Implement a caching mechanism for blob sizes.
- **Batching:** Use `git cat-file --batch` for more efficient retrieval of multiple object sizes.
- **Trade-off:** Acknowledge that perfect byte accuracy might come with a performance cost, and provide an option for users to choose between speed (current estimation) and accuracy.

### 4. Update `src/git/parser.ts`
- The `getByteChanges` and `getRepositorySize` functions will need significant refactoring to use these more accurate `git` commands.

## Impact
- Provides more precise and reliable metrics for repository size and code churn in terms of bytes.
- Enhances the credibility and analytical depth of the generated reports.
- Useful for projects with many binary assets or highly compressed text files where line-based estimation is inaccurate.
