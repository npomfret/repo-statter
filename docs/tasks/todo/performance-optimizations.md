# Performance Optimizations

## Task Status
**Status**: To Do
**Estimated Size**: Medium

## Description
A set of performance improvements to make the report page faster and more responsive.

### Tasks
1.  **Split Bundle**:
    *   Load core stats immediately.
    *   Lazy-import heavyweight chart libraries after `DOMContentLoaded`.
2.  **Optimize Logo**:
    *   Serve a ~25 KB LCP-optimised SVG logo instead of the current PNG.
3.  **Client-Side Caching**:
    *   Cache GitHub API responses in IndexedDB for 5 minutes to reduce redundant calls while users tweak filters.
