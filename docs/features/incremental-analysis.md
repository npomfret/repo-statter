# Incremental Analysis

## Idea
For very large repositories, implement a feature to process only new commits since the last analysis, significantly speeding up subsequent report generations.

## Implementation Suggestions

### 1. Tracking Last Analysis
- **Metadata Storage:** When a report is generated, store metadata about the analysis, including:
    - The hash of the last commit analyzed (`last_analyzed_commit_hash`).
    - The timestamp of the analysis.
    - The path to the repository.
- **Location:** This metadata could be stored in a small file within the `analysis/<repo-name>` directory (e.g., `analysis/<repo-name>/metadata.json`).

### 2. Incremental Data Collection
- **`git log` with `--since` or `--after`:** When `parseCommitHistory` is called, if `last_analyzed_commit_hash` is available, use `git log <last_analyzed_commit_hash>..HEAD` to fetch only the new commits.
- **Merge New Data:** Append the newly parsed `CommitData` to the existing `repo-stats.json` data.

### 3. Incremental Report Generation
- **Re-calculate Aggregates:** Re-run `getContributorStats`, `getFileTypeStats`, etc., on the combined (old + new) commit data.
- **Update Charts:** The frontend JavaScript will need to be able to handle updated `commits` data and re-render charts accordingly.
- **Performance Considerations:** Ensure that the re-calculation of aggregates is efficient, perhaps by only updating the parts of the data that have changed.

### 4. Handling Edge Cases
- **Repository Rewrites:** If the Git history has been rewritten (e.g., rebase), the `last_analyzed_commit_hash` might no longer be valid. Detect this and fall back to a full re-analysis.
- **Deleted Analysis Data:** If the `analysis/<repo-name>` directory is deleted, perform a full analysis.

### 5. CLI/UI for Incremental Analysis
- **New CLI Option:** Add a `--incremental` flag to the `analyse` command.

## Impact
- Drastically reduces analysis time for large, active repositories.
- Enables more frequent report generation without significant overhead.
- Improves the user experience for continuous monitoring of repository health.
- Makes the tool more practical for integration into fast-paced CI/CD pipelines.
