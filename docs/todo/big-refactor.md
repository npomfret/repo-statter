# Big Refactor Plan: Fail-Fast, Incremental Approach

## What Went Wrong in the Previous Attempt

### 1. **Too Much at Once**
- Created 20+ files in one massive commit
- Tried to change architecture, data flow, error handling, and types all at once
- Lost working state and couldn't identify what broke what
- Created complex abstractions before proving they were needed

### 2. **Defensive Programming Anti-patterns**
- Added try/catch blocks everywhere that masked real errors
- Created fallbacks and "safe" defaults that hid bugs
- Multiple code paths doing the same thing (old vs new)
- Silent failures that made debugging impossible

### 3. **No Testing Between Steps**
- Didn't verify each change worked before moving to the next
- Lost confidence in what was working vs broken
- No integration testing with real data during development

### 4. **Over-engineering**
- Created base classes and managers before understanding the actual needs
- Abstract architectures that added complexity without proven benefits
- Premature optimization and generalization

## New Approach: Fail-Fast, Test-First, Incremental

### Core Principles
1. **App must work after every commit**
2. **One change at a time, tested immediately**
3. **Fail fast and loud - no silent errors**
4. **No try/catch blocks - let errors bubble up**
5. **No fallbacks or defensive programming**
6. **One way to do each thing**
7. **Assert early, crash on invalid state**

### Testing Strategy for Every Commit
```bash
# After every change, run this sequence:
npm run typecheck        # Must pass
npm run test             # Must pass
./scripts/create-test-repo.sh  # Generate test data
npm run dev test-repo    # Generate report
# Manually verify: open dist/test-repo.html and check all charts render
```

## Incremental Plan

### Phase 1: Foundation (Fail-Fast)

#### **Commit 1: Remove all try/catch blocks**
- **Goal**: Let errors bubble up naturally, crash on broken state
- **Files**: `src/report/generator.ts`
- **Changes**:
  - Remove every try/catch block
  - Remove all "safe" fallbacks and defaults
  - Let functions throw on invalid input
- **Test**: Generate report for test-repo, verify it crashes appropriately on bad input

#### **Commit 2: Add assert utilities**
- **Goal**: Replace defensive `if` checks with assertions that throw
- **Files**: `src/report/generator.ts`
- **Changes**:
  - Add simple assert functions at top of file
  ```typescript
  function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(message)
  }
  
  function assertArray<T>(value: unknown, name: string): asserts value is T[] {
    assert(Array.isArray(value), `${name} must be an array, got ${typeof value}`)
  }
  ```
  - Replace defensive checks with assertions
  - Remove all silent "return early" patterns
- **Test**: Verify assertions throw on invalid data, app still works with valid data

### Phase 2: Data Layer Extraction and Testing

#### **Commit 3: Create test builders for data structures**
- **Goal**: Create test data builders before we extract anything
- **Files**: `src/test/builders.ts` (new)
- **Changes**:
  - Create builder pattern for CommitData
  - Create builder pattern for FileChange
  - Create factory functions for common test scenarios
  - Use these in existing tests
- **Test**: Update existing tests to use builders, ensure they still pass

#### **Commit 4: Extract and test git data parsing**
- **Goal**: Move git parsing to pure, testable functions
- **Files**: `src/data/git-extractor.ts` (new), `src/data/git-extractor.test.ts` (new)
- **Changes**:
  - Extract parseCommitDiff as pure function that takes git output string
  - Extract getByteChanges as pure function
  - Add comprehensive unit tests for all edge cases
  - Keep parseCommitHistory in parser.ts for now (it needs git exec)
- **Test**: New unit tests pass + integration still works

#### **Commit 5: Extract and test contributor calculations**
- **Goal**: Pure functions for contributor statistics
- **Files**: `src/data/contributor-calculator.ts` (new), `src/data/contributor-calculator.test.ts` (new)
- **Changes**:
  - Move getContributorStats to new file as pure function
  - Move average line calculation functions
  - Add unit tests with edge cases (0 commits, 1 commit, many commits)
  - Update imports in generator.ts
- **Test**: Unit tests for all calculations + integration test

#### **Commit 6: Extract and test file statistics**
- **Goal**: Pure functions for file analysis
- **Files**: `src/data/file-calculator.ts` (new), `src/data/file-calculator.test.ts` (new)
- **Changes**:
  - Move getFileTypeStats as pure function
  - Move getFileHeatData with heat score algorithm
  - Test edge cases (no files, unknown types, heat scoring)
  - Update imports
- **Test**: Unit tests for percentages and heat scores

#### **Commit 7: Extract and test award calculations**
- **Goal**: Pure functions for commit awards
- **Files**: `src/data/award-calculator.ts` (new), `src/data/award-calculator.test.ts` (new)
- **Changes**:
  - Move all getTopCommitsBy* functions
  - Test sorting and edge cases (ties, empty data)
  - Ensure consistent award structure
- **Test**: Unit tests for each award type

#### **Commit 8: Extract and test time series transformations**
- **Goal**: Pure functions for time-based data grouping
- **Files**: `src/data/time-series-transformer.ts` (new), `src/data/time-series-transformer.test.ts` (new)
- **Changes**:
  - Move getTimeSeriesData as pure function
  - Move getRepoAgeInHours
  - Test hourly vs daily grouping logic
  - Test cumulative calculations
- **Test**: Unit tests for grouping and accumulation

#### **Commit 9: Extract and test linear transformations**
- **Goal**: Pure functions for linear progression data
- **Files**: `src/data/linear-transformer.ts` (new), `src/data/linear-transformer.test.ts` (new)
- **Changes**:
  - Move getLinearSeriesData
  - Test cumulative calculations
  - Test index progression
- **Test**: Unit tests for progression accuracy

#### **Commit 10: Extract and test text processing**
- **Goal**: Pure functions for commit message analysis
- **Files**: Already exists, just needs tests
- **Changes**:
  - Add comprehensive tests for processCommitMessages
  - Test word extraction, filtering, frequency calculation
  - Test edge cases (empty messages, special characters)
- **Test**: Unit tests for word cloud data generation

#### **Commit 11: Create integration tests for data pipeline**
- **Goal**: Ensure all extracted modules work together
- **Files**: `src/data/data-pipeline.test.ts` (new)
- **Changes**:
  - Test complete flow: commits → stats → transformations
  - Test with various repository scenarios
  - Verify data consistency through pipeline
- **Test**: Integration tests covering full data flow

### Phase 3: Type Safety

#### **Commit 12: Fix generator.ts types**
- **Goal**: Replace all `any` with proper types, keep everything in one file for now
- **Files**: `src/report/generator.ts`
- **Changes**:
  - Define interfaces inline in the same file (ChartData, FilteredData, etc.)
  - Replace every `any` with proper TypeScript types
  - Add return type annotations to all functions
- **Test**: TypeScript must compile without errors

### Phase 4: Chart Extraction (One Chart at a Time)

#### **Commit 13: Extract Contributors chart**
- **Goal**: Pull out just one chart to establish pattern
- **Files**: `src/report/generator.ts`, `src/charts/contributors-chart.ts` (new)
- **Changes**:
  - Create simple ContributorsChart class with render(data) method
  - Move only contributors chart logic out of generator.ts
  - Keep all other charts in generator.ts
- **Test**: Contributors chart still works exactly the same

#### **Commit 14-19: Extract remaining charts one by one**
- File Types Chart
- Lines of Code Chart  
- Commit Activity Chart
- Code Churn Chart
- Repository Size Chart
- Word Cloud Chart
- Each follows same pattern: one commit, one chart, test immediately

### Phase 5: Template Cleanup

#### **Commit 20: Extract template engine**
- **Goal**: Move string replacement logic to separate module
- **Files**: `src/report/generator.ts`, `src/utils/template-engine.ts` (new)
- **Changes**:
  - Simple string replacement utility
  - Keep script generation in generator.ts for now
- **Test**: Generated HTML identical to before

#### **Commit 21: Extract script builder**
- **Goal**: Move client-side script generation to separate module
- **Files**: `src/report/generator.ts`, `src/utils/script-builder.ts` (new)
- **Changes**:
  - Move script string building to utility
  - Validate data before injection
- **Test**: Client-side functionality unchanged

## Rules for Every Commit

### Before Making Any Changes
1. Run `pwd` to confirm you're in the right directory
2. Run tests to ensure current state is working
3. Make one small, focused change
4. Test immediately

### **IMPORTANT: Commit Approval Process**
- **NEVER commit without explicit user approval**
- Update this MD file with progress after each change
- Mark each commit as "READY FOR REVIEW" when complete
- Wait for user to say "ok to commit" before running git commit
- This ensures user can review all changes before they become permanent

### Change Guidelines
- **Maximum 3-5 files per commit**
- **Each commit has one clear purpose**
- **No speculative changes or "might be useful later" code**
- **Every line of code must have a clear, immediate purpose**

### Testing Requirements
- TypeScript compilation must pass: `npm run typecheck`
- All tests must pass: `npm run test`
- Integration test: Generate report and verify charts work
- If ANY test fails, fix immediately before proceeding

### Error Handling Rules
- **NEVER use try/catch unless there's a specific recovery strategy**
- **NEVER fail silently or return default values**
- **ALWAYS let errors bubble up to show real problems**
- **Use assertions to validate data early and crash fast**

## Success Criteria

At the end of this refactor:
1. **Working app**: All charts render correctly
2. **Type safety**: No `any` types, full TypeScript coverage
3. **Testable**: Each component can be tested in isolation
4. **Maintainable**: Clear separation of concerns
5. **Reliable**: Crashes on invalid state instead of producing broken output
6. **Simple**: No unnecessary abstractions or complexity

## Emergency Procedures

If a commit breaks the app:
1. **Immediately revert**: `git reset --hard HEAD~1`
2. **Analyze what went wrong**: Look at the diff
3. **Make smaller change**: Break the commit into smaller pieces
4. **Test each piece**: Verify incrementally

Never proceed with a broken state. Every commit must leave the app in a working condition.

## Progress Tracking

### ✅ COMPLETED
- **Setup**: Reverted failed refactor, preserved test script and .gitignore
- **Planning**: Created this comprehensive refactor plan
- **Commit 1**: Remove all try/catch blocks ✓
- **Commit 2**: Add assert utilities and replace defensive checks ✓

### 🔄 IN PROGRESS
- **Commit 3**: Fix generator.ts types (Phase 3) - COMPLETED CHANGES

### ⏳ PENDING  
**Phase 2: Data Layer (NEW - Added based on lessons learned)**
- **Commit 3**: Create test builders for data structures
- **Commit 4**: Extract and test git data parsing
- **Commit 5**: Extract and test contributor calculations
- **Commit 6**: Extract and test file statistics
- **Commit 7**: Extract and test award calculations
- **Commit 8**: Extract and test time series transformations
- **Commit 9**: Extract and test linear transformations
- **Commit 10**: Extract and test text processing
- **Commit 11**: Create integration tests for data pipeline

**Phase 3: Type Safety**
- **Commit 12**: Fix generator.ts types ✓ (Already done, renumbered)

**Phase 4: Chart Extraction**
- **Commit 13**: Extract Contributors chart
- **Commit 14-19**: Extract remaining charts

**Phase 5: Template Cleanup**
- **Commit 20**: Extract template engine
- **Commit 21**: Extract script builder

### 📝 COMMIT STATUS
*This section will be updated after each change to show what's ready for review*

---
**READY FOR REVIEW**: ✅ **Commit 3 (Phase 3): Fix generator.ts types**

**CHANGES MADE**:
- ✅ Created ChartData interface with all properties properly typed
- ✅ Replaced `any` type in `injectDataIntoTemplate` parameter with `ChartData`
- ✅ Added return type `Promise<ChartData>` to `transformCommitData` function
- ✅ All `any` types have been eliminated from generator.ts

**VERIFICATION**:
- ✅ No more `any` types in generator.ts (verified with grep)
- ✅ Tests pass: `npm run test` ✓
- ✅ Integration test: Generated report successfully ✓

**FILES MODIFIED**: 
- `src/report/generator.ts`

**NOTE**: We've completed what was originally Commit 3 in the old plan (now Commit 12 in the new plan with data layer extraction). This gives us proper type safety in the generator before we start extracting the data layer.

**LAST UPDATED**: Type fixes completed, awaiting review