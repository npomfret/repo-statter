# Module/Directory Level Statistics

## Idea
Provide aggregated statistics (commits, LoC, churn, contributors) for specific subdirectories or logical modules within the repository, allowing for analysis at a higher level than individual files.

## Implementation Suggestions

### 1. Directory Mapping
- **Configuration:** Allow users to define logical modules or directories in a configuration file (e.g., `repo-statter.json` or a new `modules.json`). This could be a simple list of paths or more complex regex patterns.
- **Automatic Detection (Optional):** Implement a heuristic to automatically detect common module structures (e.g., `src/components`, `src/utils`, `backend/api`).

### 2. Aggregation Logic
- **Extend `stats/calculator.ts`:** Create new functions that iterate through the `CommitData` and aggregate statistics based on the file paths within each commit.
- **Recursive Aggregation:** For a given directory, recursively sum up the statistics of all files and subdirectories within it.
- **Metrics to Aggregate:**
    - Total Commits (within the module)
    - Total Lines of Code (current state, or cumulative added)
    - Lines Added/Deleted (churn) within the module
    - Number of unique contributors to the module
    - Top contributors to the module
    - File type distribution within the module

### 3. Reporting & Visualization
- **Module Overview Table:** In the HTML report, display a table listing all defined/detected modules with their aggregated statistics.
- **Drill-down Capability:** Make each module in the table clickable, leading to a detailed view or a filtered report specific to that module.
- **Module Comparison Charts:** Visualize the relative size, activity, or contributor count of different modules using bar charts or treemaps.
- **Dependency Graph (Advanced):** If module definitions are sophisticated enough, visualize dependencies between modules based on file imports/exports.

## Impact
- Provides a higher-level overview of codebase health and activity.
- Helps identify large, complex, or highly active modules.
- Facilitates architectural analysis and refactoring efforts.
- Useful for large monorepos or projects with clear module boundaries.
