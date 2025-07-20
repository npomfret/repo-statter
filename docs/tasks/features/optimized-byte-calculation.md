# Optimized Byte Calculation

## Idea
Improve the accuracy of byte change and repository size calculations, as the current method uses a rough estimate (1 line ≈ 50 bytes).

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
