# Repo Statter Requirements

## Core Functionality

*   **Commit-by-Commit Analysis:**
    *   For each commit, calculate the lines of code (LOC) added, deleted, and modified.
    *   Categorize LOC changes by file type (e.g., `.ts`, `.js`, `.py`, `.css`, `.html`).
    *   Attribute LOC changes to the commit author.
*   **Source Code Size:**
    *   Calculate the total size (in bytes) of all source code files in the repository at a given commit.
    *   Track the change in source code size over time.
*   **Reporting:**
    *   Generate a JSON report with the collected statistics.
    *   Provide a simple CLI to view the report.

## Future Enhancements

*   **Contributor Analysis:**
    *   Track the number of commits per author.
    *   Identify the top contributors to the repository.
*   **File-Level Statistics:**
    *   Track the LOC changes for individual files.
    *   Identify the most frequently modified files.
*   **Language-Specific Analysis:**
    *   For each language, calculate the percentage of the codebase it represents.
    *   Track the growth of each language over time.
*   **Visualization:**
    *   Generate charts and graphs to visualize the collected data.
    *   Create a web-based dashboard to display the statistics.
*   **Integration:**
    *   Integrate with GitHub Actions to automatically generate reports on each push.
    *   Provide a GitHub App to display the statistics on the repository page.
