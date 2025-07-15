Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md), [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Feature: File Heatmap

## 1. Goal

To create a visual tree map of the repository where files are colored based on their "heat" (i.e., how recently and frequently they have been changed). This will make it easy to see what parts of the codebase are most active.

## 2. Implementation Plan

### Data Processing

1.  **Calculate File Heat:** For each file, calculate a "heat" score based on:
    *   The number of commits that have modified the file.
    *   The recency of the last modification.

### Visualization

1.  **Integrate a Treemap Library:** Add a library like D3.js or a similar treemap chart library to the project.
2.  **Render the Heatmap:** Add a new section to the HTML report to render the file heatmap.

## 3. Files to Modify

*   `src/index.ts`: Add logic to calculate file heat scores.
*   `src/report/renderer.ts`: Add a new function to render the heatmap.
*   `src/report/template.html`: Add a new container for the heatmap.
*   `package.json`: Add the new treemap library dependency.
