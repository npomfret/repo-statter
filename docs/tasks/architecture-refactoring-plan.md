# Minimal Architecture Refactoring Plan

This document outlines a targeted refactoring plan for the repo-statter project based on the engineering principle of "do exactly what's needed, nothing more."

## Current Architecture Assessment

After deep analysis, the current architecture is **actually quite good**:

**Strengths:**
- Clean separation between git parsing (`git/parser.ts`) and data processing
- Modular calculator approach with good test coverage
- Efficient caching and performance characteristics
- Well-structured configuration system

**Real Pain Points (not theoretical):**
- `report/generator.ts` mixes orchestration, data processing, AND HTML generation (264 lines doing too much)
- Duplicate chart rendering systems: legacy `charts/` directory + new `charts.ts`
- `AnalysisContext` contains both immutable data and mutable state
- Build-time bundling coupled to runtime report generation

## Targeted Refactoring Plan

Following the "minimalist approach" and "small commits" principles:

### Phase 1: Extract HTML Generation (1-2 commits)
**Goal:** Separate HTML generation from data orchestration

1. Create `report/html-generator.ts`
   - Move `injectDataIntoTemplate()` and related HTML logic from `report/generator.ts`
   - Keep simple template replacement (no new templating engines)
   - Move chart bundling logic here

2. Update `report/generator.ts`
   - Remove HTML generation code
   - Focus purely on data orchestration
   - Call HTML generator with processed data

**Result:** Single responsibility for each module, easier testing

### Phase 2: Clean Up Duplicate Systems (1 commit)
**Goal:** Remove legacy chart rendering

1. Delete entire `charts/` directory (legacy individual chart classes)
2. Keep unified `charts.ts` approach (it works well)
3. Update any remaining references

**Result:** Eliminate maintenance burden of duplicate systems

### Phase 3: Improve AnalysisContext (1 commit)
**Goal:** Split immutable data from mutable concerns

1. Create separate interfaces:
   ```typescript
   interface RepoData {
     repoPath: string
     repoName: string
     commits: CommitData[]
     currentFiles: Set<string>
     config: RepoStatterConfig
   }
   
   interface ProcessingContext {
     data: RepoData
     progressReporter?: ProgressReporter
     isLizardInstalled: boolean
   }
   ```

2. Update processors to accept `RepoData` instead of full context
3. Keep progress reporting separate

**Result:** Clearer data dependencies, easier testing

## What We're NOT Doing

**Avoiding Overengineering:**
- No streams or complex pipeline abstractions
- No templating engines (Handlebars, Pug)
- No CSS frameworks beyond current Bootstrap
- No CDNs or performance optimizations (not needed)
- No component-based architecture (current approach works)

**Keeping What Works:**
- Current modular calculator design
- Simple template replacement system
- Existing git parsing and caching
- Current test structure with builders

## Implementation Order

1. **Extract HTML Generation** - addresses biggest coupling issue
2. **Remove Duplicate Charts** - immediate complexity reduction  
3. **Improve AnalysisContext** - cleaner data flow

Each phase can be completed, tested, and committed independently.

## Success Metrics

- `report/generator.ts` reduced from 264 to ~150 lines
- Remove ~400 lines of duplicate chart code
- Maintain all existing functionality
- All tests continue passing
- No new external dependencies