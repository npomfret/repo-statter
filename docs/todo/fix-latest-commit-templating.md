# Plan: Fix Latest Commit Templating

## Problem
The report's header, which should display details of the latest commit, is showing the raw template variables instead of their values. The text appears as: "Latest Commit: {{latestCommitHash}} by {{latestCommitAuthor}} on {{latestCommitDate}}". This indicates that the templating logic in `src/report/generator.ts` is failing to replace these specific placeholders.

## Objective
Correctly implement the templating for the latest commit information in the report's header and add a unit test to prevent regressions.

## Analysis
- **Confirmed Issue**: template.html:293 contains the placeholders `{{latestCommitHash}}`, `{{latestCommitAuthor}}`, and `{{latestCommitDate}}`
- **Root Cause**: In generator.ts, the `injectDataIntoTemplate` function uses `replaceTemplateVariables` but doesn't pass the latest commit data
- **Template Engine**: Uses `replaceTemplateVariables` from `src/utils/template-engine.ts` which expects a key-value object

## Implementation Plan

### 1. Fix in `src/report/generator.ts`
-   **Location**: Update the `injectDataIntoTemplate` function (line 120-180)
-   **Solution**: Add latest commit data to the `replaceTemplateVariables` call

### 2. Specific Implementation
The fix needs to be added to the `replaceTemplateVariables` call on line 169-177. Currently it passes:
```typescript
const templateWithData = replaceTemplateVariables(template, {
  repositoryName: chartData.repositoryName,
  generationDate: chartData.generationDate,
  totalCommits: chartData.totalCommits.toString(),
  totalLinesOfCode: chartData.totalLinesOfCode.toString(),
  totalCodeChurn: chartData.totalCodeChurn.toString(),
  githubLink: chartData.githubLink,
  logoSvg: chartData.logoSvg
})
```

We need to add the latest commit data:
```typescript
const latestCommit = commits[commits.length - 1]

const templateWithData = replaceTemplateVariables(template, {
  repositoryName: chartData.repositoryName,
  generationDate: chartData.generationDate,
  totalCommits: chartData.totalCommits.toString(),
  totalLinesOfCode: chartData.totalLinesOfCode.toString(),
  totalCodeChurn: chartData.totalCodeChurn.toString(),
  githubLink: chartData.githubLink,
  logoSvg: chartData.logoSvg,
  latestCommitHash: latestCommit ? latestCommit.hash.substring(0, 7) : 'N/A',
  latestCommitAuthor: latestCommit ? latestCommit.author : 'N/A',
  latestCommitDate: latestCommit ? new Date(latestCommit.date).toLocaleString() : 'N/A'
})
```

### 3. Add a Unit Test
Since `injectDataIntoTemplate` is an internal async function, we should test the public `generateReport` function or create a test that checks the generated HTML output contains the correct latest commit information. First, let's check if a test file exists for generator.ts.

## Implementation Steps
1. Update generator.ts to add latest commit data to the template variables
2. Test the fix by running `npm run analyse test-repo -- --output test-repo.html`
3. Verify the latest commit information appears correctly in the generated report
4. Add tests if a test file exists for generator.ts

## Impact
-   **Type**: Bug fix.
-   **Risk**: Low. The change is isolated to string replacement and does not affect core data processing.
-   **Complexity**: Simple. Involves adding 3 lines to the template data object.
-   **Benefit**: High. Fixes a visible bug in the report header.
