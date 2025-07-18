# Safari Chart Rendering Issue Investigation [COMPLETED]

## Problem
Charts are not appearing in the Safari browser, while they render correctly in other browsers like Chrome. This needs to be investigated and fixed.

## Investigation Findings

Based on research, issues with ApexCharts rendering in Safari are common and usually stem from a few specific causes. Safari's WebKit engine is stricter in its handling of JavaScript and rendering compared to Chrome's V8 engine.

Here are the most likely causes, in order of probability:

### 1. Invalid Date/Time String Formats (High Priority)
This is the most frequent cause of chart rendering failure in Safari. Safari's date parser is significantly stricter than Chrome's and does not tolerate non-standard date formats.

-   **The Issue**: The application might be passing date strings in a format like `'2023-10-26 10:30:00'`. While Chrome can often parse this, Safari will reject it, resulting in an `Invalid Date` error, which causes chart rendering to fail silently.
-   **Solution**: Ensure all dates passed to ApexCharts are in the full **ISO 8601 format** (`YYYY-MM-DDTHH:mm:ss.sssZ`). This format is universally supported and unambiguous.
    -   **Incorrect**: `new Date('2023-10-26 10:30:00')`
    -   **Correct**: `new Date('2023-10-26T10:30:00Z')`
-   **Action**: Review all data transformations in `src/chart/data-transformer.ts` and `src/report/generator.ts` to ensure dates are formatted correctly.

### 2. Chart Initialization Timing
ApexCharts requires its container element to be present in the DOM *before* the chart is initialized. If the rendering script executes prematurely, the chart will have nowhere to render.

-   **The Issue**: The JavaScript that initializes the charts might be running before the chart's container `<div>` is fully loaded and available in the DOM.
-   **Solution**: Confirm that the chart rendering scripts are placed at the end of the `<body>` tag in `src/report/template.html` or are wrapped in a `DOMContentLoaded` event listener to guarantee the DOM is ready.
-   **Action**: Verify script placement in `src/report/template.html`.

### 3. CSS and Layout Issues
The chart might be rendering but is not visible because its container has a height of `0px`.

-   **The Issue**: The chart's container `<div>` might be inside a flexbox or grid parent that doesn't allocate any space to it. This can happen if the parent has no defined height or the child lacks the proper flex properties.
-   **Solution**: Use Safari's Developer Tools to inspect the chart's container element and check its computed height and width. If the height is `0px`, the CSS needs to be adjusted to ensure the container occupies space.
-   **Action**: Inspect the rendered report in Safari to check for zero-height containers.

### 4. ResizeObserver loop limit exceeded Error
This is a common error with responsive charting libraries when a component's resizing triggers a re-render, which in turn triggers another resize, creating an infinite loop.

-   **The Issue**: The chart's container might be in a flexible layout where its size changes in response to the chart rendering, leading to a feedback loop that the browser terminates.
-   **Solution**:
    -   Ensure the chart's parent container has a stable, defined size (e.g., a fixed `height` or `min-height`).
    -   Wrap the chart container in a `div` with defined flex properties to prevent layout "jiggling."
-   **Action**: This is less likely to be the primary issue if the chart doesn't render at all, but it's worth keeping in mind if the charts render intermittently or cause crashes.

## Debugging Plan

1.  **Open Safari's Developer Tools**:
    -   Enable Developer Tools: `Safari > Settings > Advanced` and check "Show features for web developers."
    -   Right-click on the report page and select "Inspect Element."
2.  **Check the Console**:
    -   Look for any errors. An `Invalid Date` error would strongly point to date formatting issues.
3.  **Inspect the DOM**:
    -   Use the "Elements" tab to find the chart container `div` (e.g., `<div id="commitActivityChart">`).
    -   Verify that the element exists and check its computed `height` and `width` in the "Styles" panel.
4.  **Isolate the Problem**:
    -   If necessary, create a minimal test case with a basic, static chart to see if it renders. If it does, the issue is likely with the data being passed to the chart.

## Next Steps
Based on this investigation, the highest-priority action is to **verify and standardize all date formats** used in the charts to the ISO 8601 standard. This is the most common and likely culprit for Safari-specific rendering failures.

## Implementation Plan

### Phase 1: Diagnosis (First Commit)
1. Create a minimal test HTML file that reproduces the Safari issue with a simple ApexChart
2. Test with both current date format and ISO 8601 format to confirm the issue
3. Add console logging to capture any Safari-specific errors

### Phase 2: Date Format Standardization (Second Commit)
Based on code analysis, the following locations need verification/updates:
1. **No immediate issues found**: Git already provides dates in ISO format (`%ai`)
2. **Potential issue in `getDateKey` function**: The function creates date strings like `YYYY-MM-DDTHH:00:00` but without timezone indicator
3. **Review tooltip formatting**: Uses `toLocaleString()` which could have Safari-specific issues

### Phase 3: Chart Initialization Timing (Third Commit if needed)
1. The template.html already has scripts loaded in the `<head>` with proper CDN loading
2. Chart initialization happens inline after the HTML, which should be safe
3. If timing is still an issue, wrap chart initialization in `DOMContentLoaded` event

### Phase 4: Testing and Validation
1. Test the generated report in Safari after each fix
2. Verify all charts render correctly
3. Check Safari console for any remaining errors
4. Test in multiple Safari versions if possible

### Implementation Notes
- The codebase appears to handle dates correctly overall (ISO format from git)
- Most likely issue is missing timezone indicators in generated date strings
- Focus on `getDateKey` function in `src/data/time-series-transformer.ts`
- Consider adding explicit timezone handling with `toISOString()` instead of string manipulation

## Resolution
The issue was confirmed to be Safari's strict date parsing. Git's `%ai` format outputs dates as `YYYY-MM-DD HH:MM:SS +TZTZ` with spaces, but Safari's Date constructor requires ISO 8601 format without spaces before the timezone offset.

### Fix Applied
In `src/git/parser.ts`, converted git date format to proper ISO 8601:
```typescript
const isoDate = commit.date.replace(' ', 'T').replace(' +', '+').replace(' -', '-')
```

This transforms:
- `2025-07-17 22:05:05 +0100` (git format)
- to `2025-07-17T22:05:05+0100` (ISO 8601 format)

The fix ensures all browsers can parse the dates correctly, resolving the Safari rendering issue.
