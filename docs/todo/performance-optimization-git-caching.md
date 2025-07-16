# Performance Optimization: Git Data Caching

## Problem
The current implementation of `repo-statter` re-fetches and re-parses the entire Git commit history for every run. This involves computationally intensive operations like `git log`, `git diffSummary`, and `git show --numstat` for each commit. This process becomes a significant bottleneck for repositories with a large number of commits or extensive file changes, leading to slow generation times.

## Recommendation: Implement Git Data Caching

To significantly speed up subsequent runs, it is recommended to implement a caching mechanism for the collected Git data.

### Proposed Approach:

1.  **Cache Location:** Store the processed Git data in a temporary directory, ideally per repository (e.g., `tmp/repo-statter-cache/<repo_hash>/`). This ensures that different repositories have their own isolated caches.

2.  **Data to Cache:**
    *   The parsed `CommitData` objects (as defined in `src/git/parser.ts`).
    *   Alternatively, the raw output of `git log` and `git diff` commands could be cached, and then parsed on demand, but caching the already processed `CommitData` would be more efficient for direct consumption.

3.  **Caching Strategy:**
    *   **Initial Run:** On the first run for a given repository, perform the full Git history parsing and then store the complete `CommitData` array in the cache.
    *   **Subsequent Runs (Incremental Updates):**
        *   Read the cached `CommitData`.
        *   Identify the SHA of the latest commit in the cached data.
        *   Use `git log` to fetch only new commits that have occurred since the cached latest commit.
        *   Process only these new commits (i.e., perform `git diffSummary` and `git show --numstat` only for the new commits).
        *   Append the processed new `CommitData` to the existing cached data and update the cache file.

4.  **Cache Invalidation/Management:**
    *   Consider a mechanism to invalidate the cache if the Git repository's remote changes or if the user explicitly requests a full re-scan.
    *   Implement a simple cleanup strategy for old cache entries (e.g., remove caches older than a certain period, or when the `tmp` directory is cleaned).

### Expected Impact:

*   **Significant Speedup:** Subsequent runs for the same repository will be drastically faster, as they will only process incremental changes rather than the entire history.
*   **Improved User Experience:** Users will experience much quicker report generation after the initial run.

### Considerations:

*   **Disk Space:** Caching large repositories might consume a noticeable amount of disk space. This should be manageable within a `tmp` directory.
*   **Complexity:** Implementing incremental updates and cache management will add some complexity to the `src/git/parser.ts` module.
*   **Error Handling:** Robust error handling will be crucial for cache corruption or inconsistencies.
