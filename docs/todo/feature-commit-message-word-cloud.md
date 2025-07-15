Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md), [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Feature: Commit Message Word Cloud

## 1. Goal

To generate a word cloud from all commit messages to visualize the most common terms and themes in the project's development history.

## 2. Implementation Plan

### Data Processing

1.  **Extract Commit Messages:** Collect all commit messages from the collected data.
2.  **Process Text:**
    *   Tokenize the text (split into individual words).
    *   Remove common "stop words" (e.g., "the", "a", "is").
    *   Count the frequency of each word.

### Visualization

1.  **Integrate a Word Cloud Library:** Add a library like `d3-cloud` or a similar word cloud generator to the project.
2.  **Render the Word Cloud:** Add a new section to the HTML report to render the word cloud based on the processed word frequencies.

## 3. Files to Modify

*   `src/index.ts`: Add logic to process commit messages.
*   `src/report/renderer.ts`: Add a new function to render the word cloud.
*   `src/report/template.html`: Add a new container for the word cloud.
*   `package.json`: Add the new word cloud library dependency.
