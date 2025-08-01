 # Remove Redundant Two-Step Build Process

## Problem Statement

The current system requires a two-step build process for browser scripts:
1. **Build time**: `prebundle-page-script.js` and `prebundle-charts.js` create bundles in `dist/`
2. **Runtime**: `bundle-charts.ts` and `bundle-page-script.ts` load these pre-built bundles from disk

This creates fragility, complexity, and developer friction.

## Solution

Bundle scripts on-demand at runtime using esbuild programmatically, eliminating the pre-build step.

## Implementation Plan

### Phase 1: Update Runtime Bundlers
1. Modify `src/build/bundle-charts.ts`:
   - Remove file loading logic
   - Use esbuild programmatically to bundle `src/visualization/charts.ts` directly
   - Return bundled code as string
   - Handle bundling errors gracefully

2. Modify `src/build/bundle-page-script.ts`:
   - Remove file loading logic
   - Use esbuild programmatically to bundle `src/visualization/core/page-script.ts` directly
   - Return bundled code as string
   - Handle bundling errors gracefully

### Phase 2: Remove Build Scripts
1. Delete `scripts/prebundle-charts.js`
2. Delete `scripts/prebundle-page-script.js`
3. Update `package.json`:
   - Remove prebundle script calls from `build` script
   - Update to just run TypeScript compilation: `"build": "tsc"`

### Phase 3: Clean Up Build Artifacts
1. Update `.gitignore` if needed (remove references to bundle files)
2. Update `files` array in `package.json` if it references bundle files
3. Ensure `dist/` only contains compiled TypeScript output

### Phase 4: Testing
1. Run `npm run build` to ensure it completes without errors
2. Run `npm run test` to ensure all tests pass
3. Generate a test report to verify runtime bundling works
4. Test with a fresh npm install to ensure no missing dependencies

## Technical Details

### Example Implementation for `bundle-charts.ts`:
```typescript
import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function bundleCharts(): Promise<string> {
  const result = await build({
    entryPoints: [join(__dirname, '../visualization/charts.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'Charts',
    platform: 'browser',
    target: 'es2020',
    minify: false,
    write: false,
    external: ['ApexCharts', 'd3'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  })

  if (result.errors.length > 0) {
    throw new BuildError('Failed to bundle charts', result.errors[0])
  }

  const bundledCode = result.outputFiles[0].text
  
  // Wrap the bundle to make it work with our template injection
  return `
(function() {
  ${bundledCode}
  
  // Export the render function to global scope
  window.renderAllCharts = Charts.renderAllCharts;
  window.updateCategoryChartAxis = Charts.updateCategoryChartAxis;
})();
`
}
```

## Benefits

1. **Simpler Build Process**: Just TypeScript compilation, no extra bundling step
2. **More Robust**: No "file not found" errors if build wasn't run
3. **Faster Development**: Changes to visualization code don't require rebuild
4. **Less Code**: Remove two build scripts and simplify runtime loaders
5. **Better Error Messages**: Runtime bundling errors are more informative

## Risks & Mitigations

1. **Runtime Performance**: Bundling at runtime adds overhead
   - Mitigation: Cache bundled results in memory for multiple report generations
   - Note: This overhead is minimal compared to git parsing time

2. **Deployment Size**: Need to include esbuild in production
   - Mitigation: esbuild is already a dependency, no change needed

3. **Error Handling**: Bundle errors now happen at runtime
   - Mitigation: Clear error messages and graceful fallbacks

## Success Criteria

- [ ] No prebundle scripts in `scripts/` directory
- [ ] `npm run build` only runs TypeScript compilation
- [ ] Report generation works without pre-build step
- [ ] All tests pass
- [ ] No increase in report generation time
- [ ] Clear error messages if bundling fails

## Estimated Effort

- Implementation: 1-2 hours
- Testing: 30 minutes
- Total: ~2 hours