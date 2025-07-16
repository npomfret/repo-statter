# Feature: GitHub Integration for Repository Analysis

**Objective:** Enhance `repo-statter` to intelligently detect GitHub-hosted repositories, conditionally display a "View on GitHub" link, and provide direct links to individual commits on GitHub within the awards section.

## Phase 1: Repository Origin Detection

*   **Task:** Implement logic to determine if the analyzed repository is hosted on GitHub.
*   **Details:**
    *   Investigate `git remote -v` output to extract remote URLs.
    *   Parse remote URLs to identify GitHub domains (e.g., `github.com`, `github.enterprise.com`).
    *   Extract repository owner and name from the URL.
*   **Affected Files (Initial thoughts):**
    *   `src/git/parser.ts`: Likely place to add remote URL parsing and GitHub detection logic.
    *   `src/stats/calculator.ts`: May need to store the GitHub repo information (owner/name) in the calculated stats.

## Phase 2: Conditional "View on GitHub" Link

*   **Task:** Modify the report generation to show/hide the "View on GitHub" link based on detection.
*   **Details:**
    *   Pass the GitHub repository information (or a boolean flag) to the report generation template.
    *   Update the HTML template to conditionally render the link.
*   **Affected Files (Initial thoughts):**
    *   `src/report/generator.ts`: To pass the GitHub info to the template.
    *   `src/report/template.html`: To add conditional rendering logic.

## Phase 3: Link Commits to GitHub in Awards Section

*   **Task:** For each commit listed in the awards section, generate a direct link to its GitHub commit page.
*   **Details:**
    *   Requires the GitHub repository owner and name, and the commit SHA.
    *   Construct the URL: `https://github.com/{owner}/{repo}/commit/{sha}`.
    *   Ensure links open in a new tab (`target="_blank"`).
*   **Affected Files (Initial thoughts):**
    *   `src/report/generator.ts`: To prepare the commit URLs.
    *   `src/report/template.html`: To embed the links in the awards section.

## Verification:

*   Add unit tests for GitHub URL parsing and detection.
*   Manually test with both GitHub and non-GitHub repositories.
*   Verify "View on GitHub" link visibility and functionality.
*   Verify commit links in the awards section.
