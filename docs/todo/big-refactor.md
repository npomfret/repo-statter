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

### Phase 2: Type Safety (One File at a Time)

#### **Commit 3: Fix generator.ts types**
- **Goal**: Replace all `any` with proper types, keep everything in one file for now
- **Files**: `src/report/generator.ts`
- **Changes**:
  - Define interfaces inline in the same file (ChartData, FilteredData, etc.)
  - Replace every `any` with proper TypeScript types
  - Add return type annotations to all functions
- **Test**: TypeScript must compile without errors

#### **Commit 4: Extract data transformation functions**
- **Goal**: Move time series/linear series logic to pure, testable functions
- **Files**: `src/report/generator.ts`, `src/utils/data-transformers.ts` (new)
- **Changes**:
  - Extract buildTimeSeriesData, buildLinearSeriesData to utils
  - Add unit tests for these pure functions
  - Keep everything else in generator.ts
- **Test**: Unit tests for transformers + integration test still works

### Phase 3: Chart Extraction (One Chart at a Time)

#### **Commit 5: Extract Contributors chart**
- **Goal**: Pull out just one chart to establish pattern
- **Files**: `src/report/generator.ts`, `src/charts/contributors-chart.ts` (new)
- **Changes**:
  - Create simple ContributorsChart class with render(data) method
  - Move only contributors chart logic out of generator.ts
  - Keep all other charts in generator.ts
- **Test**: Contributors chart still works exactly the same

#### **Commit 6-11: Extract remaining charts one by one**
- File Types Chart
- Lines of Code Chart  
- Commit Activity Chart
- Code Churn Chart
- Repository Size Chart
- Word Cloud Chart
- Each follows same pattern: one commit, one chart, test immediately

### Phase 4: Template Cleanup

#### **Commit 12: Extract template engine**
- **Goal**: Move string replacement logic to separate module
- **Files**: `src/report/generator.ts`, `src/utils/template-engine.ts` (new)
- **Changes**:
  - Simple string replacement utility
  - Keep script generation in generator.ts for now
- **Test**: Generated HTML identical to before

#### **Commit 13: Extract script builder**
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

### 🔄 IN PROGRESS
- None currently

### ⏳ PENDING
- **Commit 1**: Remove all try/catch blocks
- **Commit 2**: Add assert utilities  
- **Commit 3**: Fix generator.ts types
- **Commit 4**: Extract data transformation functions
- **Commit 5**: Extract Contributors chart
- **Commit 6-11**: Extract remaining charts
- **Commit 12**: Extract template engine
- **Commit 13**: Extract script builder

### 📝 COMMIT STATUS
*This section will be updated after each change to show what's ready for review*

---
**READY FOR REVIEW**: None currently
**LAST UPDATED**: Initial plan creation