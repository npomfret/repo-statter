# External CDN Dependencies Security Risk

## Problem
- **Location**: `src/report/template.html:7-10`
- **Description**: Template loads critical libraries (Bootstrap, ApexCharts, D3) from external CDNs without integrity checks, creating security and reliability risks
- **Current vs Expected**: External CDN loading vs local bundled dependencies or CDN with integrity checks

## Solution
Add integrity checks to CDN imports or bundle dependencies locally:

```html
<!-- Add integrity attributes to CDN imports -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
      rel="stylesheet" 
      integrity="sha384-9ndCyUa4+uKTN92b7vILl5XCPWYNKKzSh8z7zIk+fVPhUJGUrS/LfPLdYtO2dxJ8" 
      crossorigin="anonymous">

<!-- Or better: Bundle dependencies locally -->
<script src="./assets/apexcharts.min.js"></script>
<script src="./assets/d3.min.js"></script>
```

## Impact
- **Type**: Behavior change - improves security and reliability
- **Risk**: Low (adds fallback and integrity checks)
- **Complexity**: Simple to add integrity, moderate to bundle locally
- **Benefit**: Medium impact - prevents CDN attacks and offline issues

## Implementation Notes
Consider using a build process to bundle these dependencies locally for better security and offline functionality.

## Implementation Plan

### Analysis
This is a valid security concern. The current template loads external resources without SubResource Integrity (SRI) hashes, which could allow:
1. CDN compromise attacks (serving malicious code)
2. Network reliability issues
3. Privacy concerns (CDN tracking)

### Approach
I'll add integrity attributes to all external CDN resources. This is the simplest approach that provides immediate security benefits without requiring:
- Changes to the build process
- Bundling infrastructure
- Asset management changes

### Steps
1. Find the correct SRI hashes for each CDN resource:
   - Bootstrap 5.3.0 CSS
   - Bootstrap 5.3.0 JS Bundle
   - ApexCharts (latest version)
   - D3.js v3
   - D3-cloud

2. Add integrity and crossorigin attributes to each resource

3. Test that the report still renders correctly with integrity checks

### Resources to Update
- Line 7: Bootstrap CSS
- Line 8: ApexCharts
- Line 9: D3.js v3
- Line 10: D3-cloud
- Line 478: Bootstrap JS Bundle

### Why This Approach
- Minimal change with immediate security benefit
- No infrastructure changes required
- Maintains current CDN performance benefits
- Can be implemented in a single small commit
- Future work could bundle locally if offline support is needed