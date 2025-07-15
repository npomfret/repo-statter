# Missing Accessibility Features

## Problem
- **Location**: `src/report/template.html` (throughout)
- **Description**: The HTML template lacks accessibility features like ARIA labels, keyboard navigation, and screen reader support
- **Current vs Expected**: No accessibility features vs WCAG-compliant accessibility

## Solution
Add accessibility features throughout the template:

```html
<!-- Add ARIA labels to charts -->
<div id="commitActivityChart" role="img" aria-label="Commit activity over time chart"></div>

<!-- Add keyboard navigation to theme toggle -->
<input type="checkbox" id="themeToggle" class="theme-toggle" 
       aria-label="Toggle dark mode" 
       onkeydown="if(event.key==='Enter') this.click()">

<!-- Add skip links -->
<a href="#main-content" class="visually-hidden-focusable">Skip to main content</a>

<!-- Add proper headings hierarchy -->
<h1>{{repositoryName}} - Repository Statistics</h1>
<h2>Filter Data</h2>
<h3>Commit Activity</h3>

<!-- Add alt text for visual elements -->
<div class="stat-card" role="region" aria-labelledby="total-commits-heading">
    <h4 id="total-commits-heading">Total Commits</h4>
    <span>{{totalCommits}}</span>
</div>
```

## Impact
- **Type**: Behavior change - improves accessibility
- **Risk**: Low (adds accessibility without breaking functionality)
- **Complexity**: Moderate (requires understanding of accessibility patterns)
- **Benefit**: High value - makes tool usable by more people

## Implementation Notes
Consider using a tool like axe-core to automatically test accessibility compliance.