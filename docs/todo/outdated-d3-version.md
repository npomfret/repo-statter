# Outdated D3.js Version

## Problem
- **Location**: `src/report/template.html:9`
- **Description**: Template uses D3.js v3 which is very old (released 2013) and has security vulnerabilities and limited functionality
- **Current vs Expected**: D3.js v3 vs modern D3.js v7+
- **Usage**: Only used for word cloud functionality in `src/charts/word-cloud-chart.ts`

## Task Analysis
This task is valid and worthwhile. D3.js v3 is indeed outdated (10+ years old) and should be updated for security and maintainability reasons. However, this is not a simple version bump - D3.js v7 has significant API changes from v3.

## Implementation Plan

### Option 1: Migrate to D3.js v7 (Recommended)
This requires updating both D3.js and the word cloud implementation.

#### Commit 1: Update D3.js and d3-cloud dependencies
1. Update `src/report/template.html`:
   - Replace D3.js v3 CDN link with v7
   - Update d3-cloud to v1.2.7 (latest version compatible with D3 v7)
   - Update SRI hashes for both scripts

#### Commit 2: Update WordCloudChart implementation
1. Update `src/charts/word-cloud-chart.ts`:
   - Change D3 v3 API calls to v7 equivalents:
     - `d3.scale.linear()` → `d3.scaleLinear()`
     - `d3.layout.cloud()` → `d3.cloud()` (if using updated d3-cloud)
     - Selection API changes (`.enter()` pattern updates)
   - Update color scales and transitions
   - Test with sample data

#### Commit 3: Test and fix edge cases
1. Test word cloud with various data sizes
2. Verify theme switching still works
3. Ensure tooltips function correctly
4. Run full test suite

### Option 2: Replace with Modern Solution
Given that D3.js is only used for word cloud, consider replacing with a lighter alternative:
- Use a dedicated word cloud library (e.g., wordcloud2.js)
- Implement using Canvas API directly
- Use an SVG-based solution without D3

### Considerations
- **Breaking Changes**: D3 v3 to v7 has major API changes
- **d3-cloud Compatibility**: Need to ensure d3-cloud plugin works with D3 v7
- **Testing**: Word cloud is visual - needs manual testing
- **Bundle Size**: D3.js is large for just word cloud functionality

## Decision
Proceed with Option 1 (Migrate to D3.js v7) as it:
- Addresses the security concerns
- Maintains existing functionality
- Keeps consistent with current architecture

## Impact
- **Type**: Dependency update with code changes
- **Risk**: Medium (API migration required)
- **Complexity**: Moderate (well-documented migration path)
- **Benefit**: High value - security fixes, modern features, better performance