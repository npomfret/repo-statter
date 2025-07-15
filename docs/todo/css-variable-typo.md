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

## Analysis
**Task Validation**: ✅ **VALID AND WORTHWHILE**
- The issue exists at line 45 in `src/report/template.html`
- Current value: `--bs-card-border-color: #3036d;` (invalid hex color)
- Expected value: `--bs-card-border-color: #30363d;` (valid hex color)
- Pattern confirmation: Line 49 uses `--chart-grid: #30363d;` (same color with correct format)

**Task Assessment**: 
- **Valid**: Yes - confirmed typo exists and needs fixing
- **Worthwhile**: Yes - fixes visual bug in dark mode
- **Accurate**: Yes - suggestion matches actual code location and issue
- **Detailed**: Yes - clear fix with correct hex color value

## Implementation Plan
**Single Step Implementation** (one atomic commit):
1. Fix the typo in `src/report/template.html:45` by changing `#3036d` to `#30363d`

**Approach**: 
- Simple one-line fix using Edit tool
- No breaking changes or complex refactoring needed
- Minimal risk, immediate benefit

**Testing**: 
- Verify the fix by viewing the generated HTML in dark mode
- Check that card borders now display correctly

**Patterns**: 
- Following existing color scheme (matches `--chart-grid` color)
- Consistent with GitHub/VS Code dark mode palette as noted in comments