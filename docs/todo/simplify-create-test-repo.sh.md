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

## Analysis of Current Script

The current script is 736 lines long and contains:
- 12 commits with good variety (create, edit, delete operations)
- 3 contributors (Alice, Bob, Carol) - already implemented
- Multiple file types (.js, .ts, .json, .md) - good for testing
- Realistic commit timeline with `sleep 1` between commits

**The main issue**: Large `cat << EOF` blocks containing real code make the script verbose and hard to maintain.

## Implementation Plan

### Phase 1: Simplify File Content Generation
Replace verbose `cat << EOF` blocks with simple text generation:

1. **Create helper function for file content**:
   ```bash
   generate_file_content() {
       local lines=$1
       local extension=$2
       for i in $(seq 1 $lines); do
           echo "Line $i content for $extension file with some random text $(date +%s)"
       done
   }
   ```

2. **Replace each large code block** with calls to the helper function:
   - JavaScript files: 5-15 lines of simple text
   - TypeScript files: 8-20 lines of simple text  
   - JSON files: Simple structure with minimal content
   - Markdown files: Basic headings and text

### Phase 2: Maintain Testing Effectiveness
Keep the existing good structure:
- ✅ 12 commits (good number for testing)
- ✅ 3 contributors with realistic names/emails
- ✅ File operations: create, edit, delete
- ✅ Various file types for extension testing
- ✅ Realistic commit messages
- ✅ Sleep between commits for timestamp variety

### Phase 3: Minor Enhancements
- Add a few more file extensions (.css, .html) for broader testing
- Ensure deleted files are properly tested
- Keep the same commit structure but with simplified content

## Expected Outcome
- **Script size**: Reduce from 736 lines to ~200-300 lines
- **Execution time**: Faster due to less content generation
- **Maintainability**: Much easier to read and modify
- **Testing effectiveness**: Same quality for repo-statter testing

## Implementation Steps
1. Create the `generate_file_content` helper function
2. Replace the first few large code blocks as proof of concept
3. Continue replacing remaining blocks systematically
4. Test the generated repository works with repo-statter
5. Ensure all commit types (add, modify, delete) still work correctly

## Benefits
-   **Simpler Script**: The `create-test-repo.sh` script will be significantly shorter and easier to read and maintain.
-   **Faster Execution**: Generating simple text is faster than writing large blocks of code.
-   **More Robust Testing**: A more varied and realistic commit history will allow for more thorough testing of `repo-statter`'s features, including its handling of file deletions, contributor stats, and time-based analysis.
-   **Better Edge Case Coverage**: Explicitly testing file deletions and varied commit types will help uncover potential bugs and edge cases in the analysis logic.
