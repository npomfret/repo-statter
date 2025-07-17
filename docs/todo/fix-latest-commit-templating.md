# Plan: Fix Latest Commit Templating

## Problem
The report's header, which should display details of the latest commit, is showing the raw template variables instead of their values. The text appears as: "Latest Commit: {{latestCommitHash}} by {{latestCommitAuthor}} on {{latestCommitDate}}". This indicates that the templating logic in `src/report/generator.ts` is failing to replace these specific placeholders.

## Objective
Correctly implement the templating for the latest commit information in the report's header and add a unit test to prevent regressions.

## Implementation Plan

### 1. Identify the Root Cause
-   **Location**: The primary area of investigation is the `injectDataIntoTemplate` function within `src/report/generator.ts`.
-   **Hypothesis**: The logic that extracts the latest commit's data and performs the string replacement is either missing or incorrect. The placeholders `{{latestCommitHash}}`, `{{latestCommitAuthor}}`, and `{{latestCommitDate}}` are not being processed.

### 2. Implement the Fix in `src/report/generator.ts`
-   **Extract Latest Commit Data**: Inside `injectDataIntoTemplate`, access the latest commit from the `commits` array. Since the commits are sorted chronologically, the latest commit will be the last one in the array.
-   **Handle Empty Repository Case**: If the `commits` array is empty, provide sensible default values (e.g., 'N/A') for the template variables.
-   **Perform String Replacement**: Add the necessary `.replace()` calls to the template string for each of the three placeholders.

```typescript
// In src/report/generator.ts, within injectDataIntoTemplate

function injectDataIntoTemplate(template: string, chartData: ChartData, commits: CommitData[]): string {
  // ... existing data extraction ...

  const latestCommit = commits[commits.length - 1];

  let result = template
    // ... existing replacements ...

  if (latestCommit) {
    result = result
      .replace('{{latestCommitHash}}', latestCommit.hash.substring(0, 7))
      .replace('{{latestCommitAuthor}}', latestCommit.author)
      .replace('{{latestCommitDate}}', new Date(latestCommit.date).toLocaleString());
  } else {
    result = result
      .replace('{{latestCommitHash}}', 'N/A')
      .replace('{{latestCommitAuthor}}', 'N/A')
      .replace('{{latestCommitDate}}', 'N/A');
  }

  // ... rest of the function ...

  return result;
}
```

### 3. Add a Unit Test
-   **Location**: Create a new test case in `src/report/generator.test.ts` or a relevant existing test file.
-   **Test Case**: Create a test that specifically verifies the `injectDataIntoTemplate` function.
    -   Provide a mock HTML template string containing the `{{latestCommit...}}` placeholders.
    -   Provide a mock `commits` array with at least one commit object.
    -   Call the function and assert that the returned string contains the correctly substituted values from the mock commit.
    -   Add a second test case to verify the behavior when the `commits` array is empty.

```typescript
// In a relevant test file, e.g., src/report/generator.test.ts

describe('injectDataIntoTemplate', () => {
  it('should correctly replace latest commit placeholders', () => {
    const template = 'Latest Commit: {{latestCommitHash}} by {{latestCommitAuthor}} on {{latestCommitDate}}';
    const mockCommits = [
      { hash: 'abcdef123', author: 'Test Author', date: '2023-01-01T12:00:00Z', message: '', files: [] }
    ];
    const mockChartData = { /* ... mock chart data ... */ };

    const result = injectDataIntoTemplate(template, mockChartData, mockCommits);

    expect(result).toContain('abcdef1');
    expect(result).toContain('Test Author');
    expect(result).toContain(new Date('2023-01-01T12:00:00Z').toLocaleString());
  });

  it('should handle empty commits array gracefully', () => {
    const template = 'Latest Commit: {{latestCommitHash}} by {{latestCommitAuthor}} on {{latestCommitDate}}';
    const result = injectDataIntoTemplate(template, { /* ... */ }, []);

    expect(result).toContain('N/A');
  });
});
```

## Impact
-   **Type**: Bug fix.
-   **Risk**: Low. The change is isolated to string replacement and does not affect core data processing.
-   **Complexity**: Simple. Involves adding a few lines of code and a straightforward unit test.
-   **Benefit**: High. Fixes a visible bug in the report, improving the tool's professionalism and reliability.
