# Data Extraction Specification

This document is a prerequisite for [phase-1-core-data-collection.md](phase-1-core-data-collection.md).

## 1. Objective

To define a clear, efficient, and elegant process for extracting detailed statistics from a Git repository on a commit-by-commit basis. The final output will be a single, comprehensive JSON file that serves as the data source for our report.

## 2. High-Level Process Flow

The data extraction should be a single, atomic operation that performs the following steps:

1.  **Initiate:** The process starts, targeting a specific Git repository path.
2.  **Iterate Commits:** It iterates through the entire commit history, from the initial commit to the HEAD, in chronological order.
3.  **Extract & Calculate:** For each commit, it extracts metadata and calculates statistics related to code changes and size.
4.  **Aggregate:** The data for each commit is collected into a structured in-memory object.
5.  **Serialize:** After processing all commits, the aggregated data structure is serialized into a single JSON file (e.g., `repo-stats.json`).

This process ensures that the potentially long-running data extraction is done only once, and the final report generation is fast, simply consuming the pre-processed JSON file.

## 3. Recommended Data Structure (JSON Output)

The output file should be a JSON object with the following structure. This structure is designed to be easily consumable by a front-end charting library.

```json
{
  "reportMetadata": {
    "repositoryName": "repo-statter",
    "generationDate": "2025-07-15T10:00:00.000Z",
    "totalCommits": 123,
    "firstCommitDate": "2024-01-01T12:00:00.000Z",
    "lastCommitDate": "2025-07-15T09:30:00.000Z"
  },
  "contributors": [
    {
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "totalCommits": 78,
      "totalAdditions": 5432,
      "totalDeletions": 1234
    }
  ],
  "commits": [
    {
      "sha": "a1b2c3d4e5f6...",
      "authorName": "Jane Doe",
      "authorEmail": "jane.doe@example.com",
      "date": "2025-07-15T09:30:00.000Z",
      "message": "feat: Add new charting component",
      "stats": {
        "filesChanged": 3,
        "totalAdditions": 150,
        "totalDeletions": 25
      },
      "changes": [
        {
          "file": "src/components/chart.ts",
          "additions": 100,
          "deletions": 10,
          "fileType": "ts"
        },
        {
          "file": "src/styles/chart.css",
          "additions": 50,
          "deletions": 15,
          "fileType": "css"
        }
      ]
    }
  ],
  "timeSeriesData": {
    "bytes": [
      { "date": "2025-01-15T12:00:00.000Z", "value": 10240 },
      { "date": "2025-02-01T14:00:00.000Z", "value": 15360 }
    ],
    "linesOfCode": [
      { "date": "2025-01-15T12:00:00.000Z", "value": 800 },
      { "date": "2025-02-01T14:00:00.000Z", "value": 1200 }
    ]
  }
}
```

## 4. Core Git Operations

The implementation will rely on a few core `git` commands to extract the necessary information efficiently.

*   **For Commit History:** To get the list of all commits with their core metadata, a single, formatted `git log` command is ideal.
    *   **Command:** `git log --reverse --pretty=format:'%H|%an|%ae|%ai|%s' --date=iso-strict`
    *   **Why:** `--reverse` ensures chronological order. The custom format provides all necessary metadata in a simple, parsable format. Using a separator like `|` makes splitting reliable.

*   **For Per-Commit Stats:** To get the file changes and line diffs for a single commit.
    *   **Command:** `git diff-tree --no-commit-id --numstat -r <commit-sha>` or `git show --numstat --pretty="" <commit-sha>`
    *   **Why:** `--numstat` provides a clean, machine-readable output of `additions deletions filepath`. This is far more reliable than parsing a full diff.

*   **For Source Code Size (Optional but Recommended):** Calculating the total byte size of the repository at each commit is a slow operation.
    *   **Command:** `git ls-tree -r --long <commit-sha>`
    *   **Why:** `ls-tree` lists all blobs (files) at a given commit with their metadata. The `--long` flag includes the object size in bytes. Summing these sizes gives the total repository size without needing to `checkout` each commit, which is a massive performance improvement.

## 5. Tooling Recommendations

*   **Primary Recommendation: `simple-git`**
    *   This Node.js library provides a fluent, programmatic API for executing and parsing `git` commands. It handles the complexity of spawning child processes, managing arguments, and parsing output, which will significantly simplify the implementation. It has methods that map closely to the core operations described above.

*   **Alternative: `execa`**
    *   If more low-level control is needed, `execa` is a superior alternative to Node's built-in `child_process`. It offers better error handling, promise-based APIs, and is generally more robust for shell command execution.

## 6. Performance Considerations

*   **Avoid `git checkout`:** The single most important performance consideration is to avoid checking out files or commits. The combination of `git log`, `git diff-tree`, and `git ls-tree` allows for the extraction of all required data without modifying the working directory, which is orders of magnitude faster.
*   **Make Expensive Operations Optional:** The byte-size calculation, even with `ls-tree`, can be slow on repositories with a very large number of files. This feature should be configurable and potentially disabled by default.
*   **Streaming/Incremental Processing:** For very large repositories, consider a streaming approach where commit data is processed and written to a temporary file incrementally, rather than holding the entire data structure in memory. However, for most repositories, an in-memory approach will be sufficient and simpler to implement.