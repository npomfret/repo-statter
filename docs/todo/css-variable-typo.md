# CSS Variable Typo in Dark Mode

## Problem
- **Location**: `src/report/template.html:45`
- **Description**: CSS variable `--bs-card-border-color: #3036d;` has a typo - missing 'd' at the end of the hex color
- **Current vs Expected**: Invalid hex color `#3036d` vs valid hex color `#30363d`

## Solution
Fix the typo in the CSS variable:

```css
[data-bs-theme="dark"] {
    /* ... other variables ... */
    --bs-card-border-color: #30363d; /* Fixed: was #3036d */
    /* ... rest of variables ... */
}
```

## Impact
- **Type**: Behavior change - fixes visual bug
- **Risk**: Low (fixes broken styling)
- **Complexity**: Simple
- **Benefit**: Quick win - fixes dark mode card borders

## Implementation Notes
This is a simple typo fix that will make dark mode card borders display correctly.