# Git Parser Refactoring Plan

## Overview
Split the complex `/src/git/parser.ts` (390+ lines) into focused, single-responsibility modules to improve maintainability, testability, and future extensibility.

## Current State Analysis

### Primary Issues
- **Single Responsibility Violation**: One file handles git commands, caching logic, incremental processing, and data transformation
- **High Cognitive Load**: Complex two-phase commit reading, cache invalidation, and multiple edge cases in one file
- **Testing Complexity**: Hard to test individual components in isolation
- **Future Extension Difficulty**: Adding new git operations requires understanding the entire complex file

### Current File Responsibilities
1. Git command execution and validation
2. Repository hash generation and cache management
3. Two-phase commit reading logic
4. Incremental commit processing
5. Data transformation and filtering
6. Progress reporting coordination
7. Error handling and recovery

## Proposed Module Structure

### 1. `/src/git/git-reader.ts`
**Responsibility**: Raw git command execution and basic validation

```typescript
export class GitReader {
  async getCommitLog(options: LogOptions): Promise<GitLogResult>
  async getDiffSummary(commitHash: string): Promise<DiffSummary>
  async getRawDiff(commitHash: string): Promise<string>
  async getBlobSize(blobHash: string): Promise<number>
  async getCurrentFiles(): Promise<Set<string>>
  async getRemotes(): Promise<Remote[]>
  async validateRepository(): Promise<void>
}
```

**Key Features**:
- Simple wrapper around simple-git
- Input validation with fail-fast assertions
- Clean error handling with GitParseError
- No caching logic - pure git operations

### 2. `/src/git/cache-manager.ts`
**Responsibility**: All caching strategies and cache lifecycle management

```typescript
export class CacheManager {
  async loadCache(repoHash: string, maxCommits?: number): Promise<CacheResult | null>
  async saveCache(repoHash: string, commits: CommitData[], maxCommits?: number): Promise<void>
  async clearCache(repoHash: string): Promise<void>
  async generateRepositoryHash(repoPath: string): Promise<string>
  
  private determineIncrementalStrategy(cache: CacheData, maxCommits?: number): IncrementalStrategy
  private validateCacheCompatibility(cache: CacheData): boolean
}
```

**Key Features**:
- Handles partial vs full cache logic
- Incremental update strategies
- Cache invalidation and cleanup
- Repository fingerprinting

### 3. `/src/git/commit-processor.ts`
**Responsibility**: Data transformation, filtering, and enrichment

```typescript
export class CommitProcessor {
  async processCommit(gitCommit: GitLogCommit, repoPath: string): Promise<CommitData>
  async processCommitBatch(gitCommits: GitLogCommit[], repoPath: string, progressReporter?: ProgressReporter): Promise<CommitData[]>
  
  private async extractDiffData(commitHash: string, repoPath: string): Promise<DiffData>
  private async calculateByteChanges(commitHash: string, repoPath: string): Promise<ByteChanges>
  private transformGitDate(gitDate: string): string
}
```

**Key Features**:
- Converts git log entries to CommitData
- Handles diff parsing and byte calculation
- Progress reporting for batch operations
- File exclusion filtering

### 4. `/src/git/parser.ts` (Refactored)
**Responsibility**: Orchestration and public API

```typescript
export async function parseCommitHistory(
  repoPath: string, 
  progressReporter: ProgressReporter | undefined, 
  maxCommits: number | undefined, 
  cacheOptions: CacheOptions, 
  config: SimplifiedConfig
): Promise<CommitData[]>

export async function getCurrentFiles(repoPath: string): Promise<Set<string>>
export async function getGitHubUrl(repoPath: string): Promise<string | null>
export async function getRepositoryName(repoPath: string): Promise<string | null>
```

**Key Features**:
- Clean public API (unchanged interface)
- Coordinates between reader, cache, and processor
- High-level orchestration logic only
- Maintains all existing functionality

## Implementation Steps

### Phase 1: Extract GitReader (Day 1)
1. Create `git-reader.ts` with basic git operations
2. Move git command execution logic from parser
3. Update tests to use GitReader directly
4. Ensure all git operations go through GitReader

### Phase 2: Extract CacheManager (Day 1-2)
1. Create `cache-manager.ts` with caching logic
2. Move cache loading, saving, and invalidation
3. Extract repository hash generation
4. Update cache tests to use CacheManager

### Phase 3: Extract CommitProcessor (Day 2)
1. Create `commit-processor.ts` with data transformation
2. Move diff parsing and byte calculation logic
3. Move date transformation and filtering
4. Update processing tests

### Phase 4: Refactor Parser Orchestration (Day 2-3)
1. Simplify parser.ts to pure orchestration
2. Integrate GitReader, CacheManager, and CommitProcessor
3. Maintain exact same public API
4. Run full test suite to ensure no regressions

### Phase 5: Optimization and Cleanup (Day 3)
1. Remove any duplicate logic between modules
2. Optimize interfaces between components
3. Add focused unit tests for each module
4. Update documentation

## Testing Strategy

### Current Test Coverage
- Comprehensive integration tests exist
- Full git repository simulation
- Cache behavior testing
- Progress reporting validation

### New Testing Approach
1. **Unit Tests**: Each module tested in isolation
2. **Integration Tests**: Maintain existing full-flow tests
3. **Mock Strategy**: Mock git operations for processor tests
4. **Builder Pattern**: Use existing test builders for data setup

### Test File Structure
```
tests/
├── git/
│   ├── git-reader.test.ts      # Unit tests for git operations
│   ├── cache-manager.test.ts   # Unit tests for caching
│   ├── commit-processor.test.ts # Unit tests for processing
│   └── parser.integration.test.ts # Full integration tests
```

## Risk Mitigation

### Low Risk Factors
- **Excellent Test Coverage**: Comprehensive existing tests catch regressions
- **Clear Module Boundaries**: Well-defined responsibilities reduce complexity
- **Incremental Approach**: Phase-by-phase implementation allows validation at each step
- **Unchanged Public API**: No breaking changes for consumers

### Risk Management
1. **Maintain Integration Tests**: Keep all existing tests running throughout refactoring
2. **Feature Flags**: Ability to switch between old/new implementation during development
3. **Gradual Migration**: Extract one module at a time with full validation
4. **Performance Benchmarks**: Ensure no performance degradation

## Success Criteria

### Functional Requirements
- [ ] All existing tests pass without modification
- [ ] Performance characteristics maintained or improved
- [ ] Public API remains unchanged
- [ ] All caching behavior preserved
- [ ] Progress reporting functionality intact

### Code Quality Improvements
- [ ] Each module has single, clear responsibility
- [ ] Complex logic is broken down into testable units
- [ ] New git operations can be added easily
- [ ] Cache strategies can be modified independently
- [ ] Individual components can be tested in isolation

### Maintainability Goals
- [ ] Cognitive complexity reduced from 90+ to <30 per module
- [ ] New developers can understand each module quickly
- [ ] Bug fixes can be made in focused areas
- [ ] Future features (e.g., different git providers) are easier to implement

## Estimated Effort

- **Development Time**: 2-3 focused days
- **Testing Time**: 1 day comprehensive validation
- **Documentation**: 0.5 day updating inline docs
- **Total**: 3.5-4.5 days

## Future Benefits

### Immediate Benefits
- Easier debugging and maintenance
- Clear separation of concerns
- Individual module testing
- Reduced cognitive load

### Long-term Benefits
- Easier to add new git operations
- Pluggable caching strategies
- Support for different git providers
- Performance optimizations per component
- Better error handling and recovery

## Implementation Priority

**HIGH PRIORITY** - This refactoring addresses the single most complex area of the codebase while maintaining all existing functionality. The benefits to maintainability and future development significantly outweigh the implementation effort.