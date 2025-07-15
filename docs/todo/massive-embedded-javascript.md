# Massive Embedded JavaScript in Template

## Problem
- **Location**: `src/report/generator.ts:92-604`
- **Description**: 500+ lines of JavaScript code embedded as string in TypeScript file, making it unmaintainable
- **Current vs Expected**: Huge embedded string vs separate JavaScript file or better templating

## Solution
Extract the JavaScript to a separate file:

```typescript
// Create src/report/chart-scripts.js
// Move all the JavaScript code from lines 92-604 to this file

// In src/report/generator.ts:
function injectDataIntoTemplate(template: string, chartData: any, commits: CommitData[]): string {
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits)
  const timeSeries = getTimeSeriesData(commits)
  const linearSeries = getLinearSeriesData(commits)
  const wordCloudData = processCommitMessages(commits.map(c => c.message))
  
  const chartScriptTemplate = await readFile('src/report/chart-scripts.js', 'utf-8')
  
  const chartScript = chartScriptTemplate
    .replace('{{COMMITS_DATA}}', JSON.stringify(commits))
    .replace('{{CONTRIBUTORS_DATA}}', JSON.stringify(contributors))
    // ... other replacements
  
  return template.replace('</body>', `<script>${chartScript}</script>\n</body>`)
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Moderate
- **Benefit**: High value - significantly improves maintainability

## Implementation Notes
This would make the code much more maintainable and allow for proper syntax highlighting and error checking in the JavaScript code.