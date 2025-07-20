# Performance Optimizations

## Task Status
**Status**: To Do
**Estimated Size**: Medium

## Description
A set of performance improvements to make the report page faster and more responsive.

## Current State Analysis

After reviewing the codebase:

1. **JavaScript Bundle**: Currently all JavaScript (including ApexCharts and D3) is bundled inline into the HTML report. The template loads ApexCharts (~384KB) and D3 (~270KB) from CDN immediately in the `<head>`.

2. **Logo**: Already using an optimized SVG (1.3KB) which is excellent! No optimization needed here.

3. **No GitHub API calls**: The report is static HTML with all data embedded at build time. No client-side API calls are made, so IndexedDB caching isn't applicable.

## Updated Tasks

### 1. Split Bundle & Lazy Load Charts
**Problem**: ApexCharts and D3 libraries (~650KB combined) load immediately, blocking initial render.

**Solution**:
- Move chart library loading to after DOM content loads
- Split the inline JavaScript into core functionality (filters, theme) and chart rendering
- Use dynamic imports for chart initialization
- Show loading placeholders while charts load

**Implementation**:
1. Create separate modules for:
   - Core functionality (filters, theme toggle, navigation)
   - Chart rendering (ApexCharts wrapper)
   - D3 visualizations (word cloud, treemap)
2. Load core immediately, defer charts until visible/needed
3. Use Intersection Observer to lazy load charts as they come into viewport

### 2. Optimize Initial Render
**Problem**: Large inline JavaScript and data objects delay first paint.

**Solution**:
- Extract large data arrays to separate script tags at end of body
- Minimize critical CSS, inline only what's needed for above-the-fold
- Use `loading="lazy"` for below-the-fold content
- Add `rel="preconnect"` for CDN domains

### 3. Progressive Enhancement
**Problem**: Nothing renders until all JavaScript loads and executes.

**Solution**:
- Server-side render basic statistics in HTML
- Enhance with JavaScript for interactivity
- Ensure filters and navigation work without JavaScript (using CSS :target)

## Implementation Plan

### Phase 1: Defer Chart Libraries (Highest Impact)
1. Move ApexCharts and D3 script tags from `<head>` to end of `<body>`
2. Add `defer` attribute to ensure they don't block parsing
3. Wrap chart initialization in `DOMContentLoaded` listener
4. Add loading placeholders for chart containers

### Phase 2: Split JavaScript Bundle
1. Refactor `page-script.ts` into modules:
   - `core.ts`: Filters, theme, navigation
   - `charts.ts`: ApexCharts initialization
   - `visualizations.ts`: D3 word cloud and treemap
2. Update bundler to create separate chunks
3. Load core immediately, lazy load others

### Phase 3: Optimize Data Loading
1. Extract large data arrays from inline script
2. Load data asynchronously after page renders
3. Use requestIdleCallback for non-critical data processing

### Phase 4: Add Loading States
1. Create skeleton loaders for charts
2. Show progress indicators during data processing
3. Implement graceful error handling

## Expected Performance Impact

- **First Contentful Paint**: 50-70% faster (by deferring 650KB of JS)
- **Time to Interactive**: 30-50% faster (by splitting critical vs non-critical JS)
- **Lighthouse Score**: Expected improvement from ~70 to 85-90

## Small Commits Plan

1. Move CDN scripts to body with defer attribute
2. Add DOMContentLoaded wrapper to chart initialization
3. Create loading placeholders for chart containers
4. Split page-script.ts into core and chart modules
5. Implement lazy loading for charts module
6. Add Intersection Observer for viewport-based loading
7. Extract data to separate script tags
8. Add preconnect hints for CDN domains
9. Implement skeleton loaders
10. Add performance monitoring and reporting
