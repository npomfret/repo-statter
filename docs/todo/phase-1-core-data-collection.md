Depends on: [recommended-tech-stack.md](recommended-tech-stack.md), [data-extraction-spec.md](data-extraction-spec.md)

# Phase 1: Core Data Collection

## Implementation Plan

**Selected Task: Step 1 - Git Log Parsing**

### Approach
1. **Add simple-git dependency** - Use `simple-git` library as recommended in data-extraction-spec.md
2. **Replace placeholder code** - Remove current add/multiply functions from src/index.ts
3. **Implement basic git parsing** - Create function to extract commit history
4. **Use specified git command** - `git log --reverse --pretty=format:'%H|%an|%ae|%ai|%s' --date=iso-strict`
5. **Create data structure** - Follow JSON structure from data-extraction-spec.md
6. **Write to JSON file** - Output repo-stats.json with basic commit data

### Commit Strategy
This can be implemented as a single small commit since it's focused on just the git log parsing functionality.

### Next Steps After This Task
- Step 2: Line-by-Line Stats (git diff parsing)
- Step 3: Source Code Size (optional, performance-intensive)
- Step 4: Data Structuring (consolidation)

---

*   **Step 1: Git Log Parsing:**
    *   In `src/index.ts`, use a library like `simple-git` or execute `git log` commands directly to parse the entire commit history of a repository.
    *   For each commit, extract the hash, author name, author email, date, and commit message.

*   **Step 2: Line-by-Line Stats:**
    *   For each commit, get the diff stats (`git diff --numstat <commit-hash>^!`).
    *   Parse the output to get the lines added and deleted for each file.
    *   Categorize these changes by file extension (e.g., `.ts`, `.js`, `.css`).
    *   Aggregate this data per author and per file type.

*   **Step 3: Source Code Size (Bytes):**
    *   For each commit, check out the commit (`git checkout <commit-hash>`).
    *   Walk the file tree, get the size of each source file, and sum them up.
    *   Store this as a timeseries data point.
    *   **Note:** This is a slow process. We can make it an optional feature.

*   **Step 4: Data Structuring:**
    *   Consolidate all collected data into a single, well-structured JSON object. This object will be the single source of truth for the HTML report. It should be designed for easy consumption by ApexCharts.