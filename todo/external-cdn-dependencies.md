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