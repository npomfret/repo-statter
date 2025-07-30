# Architecture Consolidation Plan

## Problem Analysis

After comprehensive codebase analysis, the primary architectural issue is **dual module system complexity**:

### Current Issues

1. **Dual Chart Systems**
   - `/src/charts/` - Individual chart files (9 files: commit-activity-chart.ts, contributors-chart.ts, etc.)
   - `/src/chart/` - Core chart system (4 files: data-transformer.ts, filter-system.ts, core-initializer.ts, page-script.ts)
   - Duplicated responsibilities and initialization logic

2. **Fragmented Data Processing**
   - `/src/git/parser.ts` - Complex git parsing (400+ lines)
   - `/src/data/git-extractor.ts` - Separate data extraction
   - `/src/data/time-series-transformer.ts` - Time series processing
   - `/src/chart/data-transformer.ts` - Chart data transformation
   - Multiple transformation layers with overlapping concerns

3. **Configuration Complexity**
   - 70+ configuration options across 11 interfaces
   - Complex loading, validation, and override mechanisms
   - Over-engineered for the actual complexity needs

### Metrics
- **75 TypeScript files** (51 production + 24 tests)
- **~13,319 lines of code**
- **489 type/interface definitions**
- **218 functions** across 45 files

## Consolidation Strategy

### Goal
Create a **unified, elegant architecture** that follows the engineering directives:
- Minimalist approach (directive #5)
- Remove duplication (directive #6)
- Elegant code over abstractions (directive #35)
- "What could be removed" mindset (directive #20)

### Approach
**Three-phase consolidation** maintaining backwards compatibility until final switch.

---

## Implementation Plan

### Phase 1: Unify Chart Systems (4-5 commits)

#### Commit 1: Create unified chart directory structure
```bash
# Create new directory structure
mkdir -p src/visualization/charts
mkdir -p src/visualization/core

# Move shared utilities
mv src/chart/filter-system.ts src/visualization/core/
mv src/chart/page-script.ts src/visualization/core/

# Update import paths in test files
# Update any references in build scripts
```

**Files Changed**: ~5-8 files  
**Test Command**: `npm run test && npm run typecheck`  
**Risk**: LOW - mechanical file moves  
**Rollback**: Simple `git revert`

#### Commit 2: Consolidate chart initialization
```typescript
// Create src/visualization/core/chart-manager.ts
export class ChartManager {
  private charts = new Map()
  
  registerChart(name: string, renderer: ChartRenderer) { /* ... */ }
  renderAll(data: ChartData) { /* ... */ }
  // Merge logic from core-initializer.ts and individual chart files
}
```

**Files Changed**: 
- Create: `src/visualization/core/chart-manager.ts`
- Modify: `src/report/generator.ts` (update chart initialization)
- Update: 3-4 chart files to register with ChartManager

**Test Command**: `npm run test && npm run test:report`  
**Risk**: MEDIUM - changes initialization flow  
**Rollback**: Revert single commit, restore old initialization

#### Commit 3: Migrate individual chart files
```bash
# Move all chart files
mv src/charts/*.ts src/visualization/charts/

# Update imports across entire codebase
# Use find/replace for import path updates
find src -name "*.ts" -exec sed -i 's|from '\''../charts/|from '\''../visualization/charts/|g' {} +
```

**Files Changed**: ~20 files (all files that import charts)  
**Test Command**: `npm run test && npm run typecheck`  
**Risk**: LOW - mechanical import updates  
**Rollback**: Simple revert of import paths

#### Commit 4: Remove duplicate chart data transformation
```typescript
// Eliminate src/chart/data-transformer.ts
// Move its functionality directly into chart files where used
// Each chart becomes self-contained for its data needs

// Example: src/visualization/charts/commit-activity-chart.ts
export function renderCommitActivityChart(data: CommitData[]) {
  // Inline the data transformation logic here
  const transformedData = transformCommitActivity(data) // moved from data-transformer
  // render chart
}
```

**Files Changed**: 
- Delete: `src/chart/data-transformer.ts`
- Modify: 6-8 chart files to include their own data transformation
- Update: Any files importing data-transformer

**Test Command**: `npm run test && npm run test:report`  
**Risk**: MEDIUM - changes data flow, ensure same output  
**Rollback**: Restore data-transformer.ts, revert chart modifications

#### Commit 5: Clean up old directories
```bash
# Remove now-empty directories
rm -rf src/charts/
rm -rf src/chart/

# Update package.json if any build scripts reference old paths
# Update any documentation references
```

**Files Changed**: 2-3 files (package.json, possibly README)  
**Test Command**: `npm run build && npm run test`  
**Risk**: LOW - cleanup only  
**Rollback**: Recreate directories, restore package.json

### Phase 2: Simplify Data Pipeline (3-4 commits)

#### Commit 6: Create unified data processor
```typescript
// Create src/data/unified-pipeline.ts
export class DataPipeline {
  async processRepository(repoPath: string): Promise<ProcessedData> {
    // Merge logic from:
    // - git-extractor.ts
    // - time-series-transformer.ts  
    // - linear-transformer.ts
    
    const commits = await this.extractCommits(repoPath)
    const timeSeries = this.generateTimeSeries(commits)
    const linearSeries = this.generateLinearSeries(commits)
    
    return { commits, timeSeries, linearSeries }
  }
  
  private extractCommits() { /* merged from git-extractor */ }
  private generateTimeSeries() { /* merged from time-series-transformer */ }
  private generateLinearSeries() { /* merged from linear-transformer */ }
}
```

**Files Changed**:
- Create: `src/data/unified-pipeline.ts` (~300 lines)
- Modify: `src/report/generator.ts` to use unified pipeline side-by-side with old system

**Test Command**: `npm run test && npm run test:report`  
**Risk**: HIGH - core data processing logic changes  
**Rollback**: Remove unified-pipeline.ts, revert generator.ts  
**Safety**: Run side-by-side validation, compare outputs

#### Commit 7: Simplify git parser
```typescript
// Reduce src/git/parser.ts from 400+ lines to ~200 lines
// Remove redundant processing, use unified pipeline for heavy lifting

export async function parseCommitHistory(repoPath: string, ...): Promise<CommitData[]> {
  // Simplified version - delegate complex processing to unified pipeline
  const pipeline = new DataPipeline()
  return pipeline.processCommits(repoPath, options)
}
```

**Files Changed**:
- Modify: `src/git/parser.ts` (major simplification)
- Update: Any direct consumers of parser functions

**Test Command**: `npm run test && npm run test:report`  
**Risk**: HIGH - changes core git processing  
**Rollback**: Restore original parser.ts  
**Safety**: Maintain identical output, extensive testing

#### Commit 8: Eliminate data transformation duplicates
```bash
# Remove now-redundant files
rm src/data/time-series-transformer.ts
rm src/data/linear-transformer.ts
rm src/data/git-extractor.ts  # if fully merged into pipeline

# Update imports across codebase
find src -name "*.ts" -exec grep -l "time-series-transformer\|linear-transformer\|git-extractor" {} + 
# Update each file to import from unified-pipeline instead
```

**Files Changed**: ~8-10 files that imported the removed modules  
**Test Command**: `npm run test && npm run typecheck`  
**Risk**: MEDIUM - removing files, updating imports  
**Rollback**: Restore deleted files, revert import changes

#### Commit 9: Update all data consumers
```typescript
// Update all places that consume data to use unified pipeline
// src/report/generator.ts - main consumer
// Various chart files
// Calculator files (contributor-calculator.ts, file-calculator.ts, etc.)

// Example:
const pipeline = new DataPipeline()
const data = await pipeline.processRepository(repoPath)
// Use data.commits, data.timeSeries, data.linearSeries
```

**Files Changed**: ~6-8 consumer files  
**Test Command**: `npm run test && npm run test:report`  
**Risk**: MEDIUM - multiple integration points  
**Rollback**: Revert all consumer updates

### Phase 3: Streamline Configuration (2-3 commits)

#### Commit 10: Simplify config schema
```typescript
// Reduce src/config/schema.ts interfaces from 11 to ~5
// Keep only essential configuration options

export interface RepoStatterConfig {
  analysis: {
    maxCommits?: number
    excludePatterns: string[]
  }
  charts: {
    height: number
    contributorLimit: number
  }
  performance: {
    cacheEnabled: boolean
  }
  // Remove: wordCloud, fileHeat, textAnalysis, commitFilters, etc.
  // Merge essential options into main categories
}
```

**Files Changed**:
- Modify: `src/config/schema.ts` (major simplification)
- Update: `src/config/defaults.ts` to match new schema
- Update: Config consumers to use simplified structure

**Test Command**: `npm run test && npm run typecheck`  
**Risk**: MEDIUM - breaking change for existing config files  
**Rollback**: Restore original schema and defaults  
**Safety**: Maintain backwards compatibility where possible

#### Commit 11: Simplify config loading
```typescript
// Simplify src/config/loader.ts
// Remove complex override and validation layers

export function loadConfiguration(repoPath: string, overrides?: ConfigOverrides): RepoStatterConfig {
  const defaults = DEFAULT_CONFIG
  const userConfig = loadUserConfig() // simplified loading
  
  return {
    ...defaults,
    ...userConfig,
    ...overrides  // simple merge, no complex validation
  }
}
```

**Files Changed**:
- Modify: `src/config/loader.ts` (simplification)
- Update: `src/cli/handler.ts` to use simplified loading
- Remove: Complex validation functions if they exist

**Test Command**: `npm run test && npm run test:report`  
**Risk**: MEDIUM - changes CLI behavior  
**Rollback**: Restore original loader complexity

#### Commit 12: Update documentation and defaults
```markdown
# Update README.md configuration section
# Update --export-config functionality to export simplified config
# Clean up example configurations in docs/
```

**Files Changed**:
- Modify: README.md
- Update: CLI export-config command
- Clean: Any example config files

**Test Command**: `npm run test && npm run lint`  
**Risk**: LOW - documentation changes  
**Rollback**: Simple documentation revert

## Testing Protocol

### After Each Commit
```bash
# 1. Type checking
npm run typecheck

# 2. Unit tests  
npm run test

# 3. Integration test (generates actual report)
npm run test:report

# 4. Manual verification
# - Open generated test report in browser
# - Verify all charts render correctly
# - Check that statistics match previous version

# 5. Performance check
# - Ensure processing time hasn't regressed significantly
# - Check memory usage remains reasonable
```

### Pre-commit Safety Checks
```bash
# Before each commit, run full validation:
npm run clean
npm run build  
npm run test
npm run test:report

# Compare generated report with baseline
# Ensure no visual regressions
# Verify statistics are identical
```

## Rollback Procedures

### Individual Commit Rollback
```bash
# For low-risk commits (1, 3, 5, 12)
git revert <commit-hash>

# For medium-risk commits (2, 4, 8, 9, 10, 11)  
git revert <commit-hash>
# May need to fix merge conflicts manually

# For high-risk commits (6, 7)
git revert <commit-hash>
# Likely requires careful manual resolution
# Test extensively after rollback
```

### Phase Rollback
```bash
# Rollback entire Phase 1 (commits 1-5)
git revert <commit-5>..<commit-1>

# Rollback entire Phase 2 (commits 6-9)
git revert <commit-9>..<commit-6>

# Rollback entire Phase 3 (commits 10-12)
git revert <commit-12>..<commit-10>
```

### Emergency Rollback
```bash
# Nuclear option - rollback to pre-consolidation state
git reset --hard <commit-before-phase-1>
# Only use if forward rollbacks are too complex
```

## Success Validation

### Functional Validation
- [ ] All existing charts render identically
- [ ] Statistical calculations remain exact
- [ ] CLI options work unchanged
- [ ] Performance is maintained or improved
- [ ] All tests pass

### Code Quality Validation  
- [ ] Reduced file count (target: 75 → 50 files)
- [ ] Reduced complexity (target: 40% reduction)
- [ ] Eliminated duplication
- [ ] Cleaner imports and dependencies
- [ ] Simplified mental model

### Deployment Validation
- [ ] Build process works unchanged
- [ ] npm package installs correctly
- [ ] Published package functions identically
- [ ] Documentation is updated and accurate

---

## Success Metrics

### Code Reduction
- **Target**: 40% reduction in complexity
- Reduce from 75 files to ~50 files
- Reduce from 489 type definitions to ~300
- Eliminate ~3000 lines of duplicated code

### Architecture Quality
- Single responsibility for chart/data operations
- Clear, linear data flow
- Simplified mental model

### Maintainability
- New chart additions require touching fewer files
- Configuration changes are straightforward
- Testing is more focused and less integration-heavy

---

## Timeline Estimate

- **Phase 1**: 2-3 days (chart consolidation)
- **Phase 2**: 3-4 days (data pipeline simplification) 
- **Phase 3**: 1-2 days (config streamlining)

**Total**: ~1-2 weeks of focused work

---

## Notes

- Follow engineering directive #15: "Small commits are preferred"
- Apply directive #20: "What could be removed" at every step
- Maintain directive #25: "Prioritise correctness" - no functionality regressions
- Each commit should pass `npm run test` and `npm run typecheck`