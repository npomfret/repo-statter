Depends on: [recommended-tech-stack.md](recommended-tech-stack.md), [data-extraction-spec.md](data-extraction-spec.md)

# Phase 1: Core Data Collection

## Implementation Plan

**Selected Task: Step 2 - Line-by-Line Stats (Git Diff Parsing)**

### Status: ✅ COMPLETE
✅ Step 1 (Git Log Parsing) - Complete
✅ Step 2 (Line-by-Line Stats) - Complete

### Detailed Implementation Steps
1. **Extend CommitData interface** - Add `linesAdded`, `linesDeleted`, and `filesChanged` fields
2. **Create file change interface** - Define `FileChange` interface with `fileName`, `linesAdded`, `linesDeleted`, `fileType`
3. **Implement diff parsing function** - Create `parseCommitDiff(repoPath: string, commitHash: string)` helper function
4. **Use simple-git diffSummary** - Leverage `simple-git`'s `diffSummary()` method for clean diff parsing
5. **Add file type categorization** - Extract file extensions and categorize changes (`.ts`, `.js`, `.css`, etc.)
6. **Integrate with existing function** - Enhance `parseCommitHistory` to include diff stats for each commit
7. **Export additional interfaces** - Export `FileChange` and enhanced `CommitData` interfaces

### Technical Details
- Use `simple-git`'s `diffSummary(commitHash + '^!')` to get per-commit diff stats
- Parse output to extract lines added/deleted per file
- Categorize changes by file extension for later visualization
- Maintain chronological order and data structure consistency
- Handle merge commits and initial commits appropriately

### Commit Strategy
Single focused commit: "Add git diff parsing for line-by-line commit statistics"

### Files to Modify
- src/index.ts (extend interfaces and enhance parseCommitHistory function)

### Next Steps After This Task
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