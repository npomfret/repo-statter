Depends on: [recommended-tech-stack.md](recommended-tech-stack.md), [data-extraction-spec.md](data-extraction-spec.md)

# Phase 1: Core Data Collection

## Implementation Plan

**Selected Task: Step 1 - Git Log Parsing**

### Detailed Implementation Steps
1. **Add simple-git dependency** - `npm install simple-git` and add to package.json dependencies
2. **Replace placeholder code** - Remove current add/multiply functions from src/index.ts
3. **Implement git log parsing function** - Create `parseCommitHistory(repoPath: string)` function
4. **Use simple-git API** - Leverage simple-git's `log()` method with appropriate options
5. **Data structure mapping** - Map git log output to match JSON structure from data-extraction-spec.md:
   - Extract: sha, authorName, authorEmail, date, message
   - Format dates as ISO strings
   - Structure as array of commit objects
6. **Export main function** - Export the parsing function for use by CLI interface

### Technical Details
- Use `simple-git` instead of raw git commands for better error handling
- Follow the chronological order (--reverse equivalent)
- Extract metadata: %H (hash), %an (author name), %ae (author email), %ai (author date), %s (subject)
- Return structured data matching the `commits` array format from data-extraction-spec.md

### Commit Strategy
Single focused commit: "Implement git log parsing with simple-git library"

### Files to Modify
- package.json (add simple-git dependency)
- src/index.ts (replace placeholder code with git parsing logic)

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