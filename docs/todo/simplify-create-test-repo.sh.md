# Plan: Simplify and Enhance `create-test-repo.sh`

## Objective
To make the test repository generation script (`create-test-repo.sh`) simpler, faster, and more effective by creating a more realistic and varied commit history for better testing scenarios. This involves simplifying the content of the test files and expanding the range of commit types.

## Proposed Changes

### 1. Simplify Test File Content
-   **Current State**: The script uses large, multi-line `cat << EOF` blocks to write real (but sample) code into the test files. This makes the script verbose and unnecessarily complex.
-   **Proposed Change**: Replace the real code with generated nonsense text. The goal is to have files with content and byte size, not functional code. We can use simple shell commands to generate a few lines of arbitrary text. This will drastically reduce the line count and complexity of the script itself.

### 2. Enhance Commit History
-   **Current State**: The script creates a relatively small number of commits over a short, undefined timeframe with limited variation.
-   **Proposed Changes**:
    -   **Increase Commit Count**: The script should be updated to generate a larger number of commits (e.g., 50-100) to better simulate a real project history.
    -   **Expand Timeframe**: The commits should span a longer and more varied timeframe (e.g., over several months or a year). This can be achieved by manipulating the `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` environment variables before each commit.
    -   **Introduce More Variety**: The commits should represent a wider range of development activities:
        -   **Adding Lines**: Appending new lines to existing files.
        -   **Changing Lines**: Modifying existing lines within files.
        -   **Removing Lines**: Deleting lines from files.
        -   **File Deletions**: Commits that explicitly remove files from the repository using `git rm`.
        -   **Multiple Authors**: Introduce commits from different authors to test contributor-related statistics.

## Implementation Sketch (without code)

1.  **Refactor File Creation**: Replace all `cat << EOF` blocks with simple `echo` or other text-generation commands that create files with a few lines of random-looking text.
2.  **Structure the Commit Loop**: Create a loop that runs for the desired number of commits.
3.  **Control Commit Dates**: Inside the loop, programmatically set the `GIT_COMMITTER_DATE` and `GIT_AUTHOR_DATE` variables to create a realistic timeline. For example, decrement the date by a few hours or days for each iteration.
4.  **Vary Commit Actions**: Inside the loop, use a mechanism (like the modulo operator on the loop counter) to decide which action to take for the current commit: add lines to a file, modify a file, delete a line, or delete a file entirely.
5.  **Add Multiple Authors**: Similar to varying the commit action, alternate the `GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL` variables to simulate commits from different contributors.

## Benefits
-   **Simpler Script**: The `create-test-repo.sh` script will be significantly shorter and easier to read and maintain.
-   **Faster Execution**: Generating simple text is faster than writing large blocks of code.
-   **More Robust Testing**: A more varied and realistic commit history will allow for more thorough testing of `repo-statter`'s features, including its handling of file deletions, contributor stats, and time-based analysis.
-   **Better Edge Case Coverage**: Explicitly testing file deletions and varied commit types will help uncover potential bugs and edge cases in the analysis logic.
