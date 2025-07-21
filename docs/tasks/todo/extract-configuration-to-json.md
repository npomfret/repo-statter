# Extract configuration to JSON files

## Status: 🔄 IN PROGRESS (Phase 7 - Additional Configuration Extraction)
**Priority**: High (Cleanup/Refactoring)
**Estimated Size**: Large
**Type**: Refactoring

## Problem
The codebase currently has many hardcoded configuration values scattered throughout different modules. This makes it difficult for users to customize the application behavior without modifying source code, and makes maintenance harder.

## Current Hardcoded Values Found
1. **Byte estimation**: 50 bytes per line (`src/data/git-extractor.ts`)
2. **Word cloud settings**: min/max word length, sizes (`src/text/processor.ts`)
3. **File heat calculation weights**: frequency vs recency balance (`src/data/file-calculator.ts`)
4. **Chart limits**: top contributors (10), file heatmap (100) (`src/charts/`)
5. **Progress throttling**: 200ms intervals (`src/cli/handler.ts`)
6. **Time series thresholds**: 48 hours for hourly vs daily (`src/data/time-series-transformer.ts`)
7. **File exclusion patterns**: comprehensive patterns (`src/utils/exclusions.ts`)
8. **Cache configuration**: directory names, version (`src/cache/git-cache.ts`)

## Solution: JSON Configuration System

### Configuration File Structure (`repo-statter.config.json`)
```json
{
  "version": "1.0",
  "analysis": {
    "maxCommits": null,
    "bytesPerLineEstimate": 50,
    "timeSeriesHourlyThresholdHours": 48
  },
  "wordCloud": {
    "minWordLength": 3,
    "maxWords": 100,
    "minSize": 10,
    "maxSize": 80
  },
  "fileHeat": {
    "recencyDecayDays": 30,
    "frequencyWeight": 0.4,
    "recencyWeight": 0.6,
    "maxFilesDisplayed": 100
  },
  "charts": {
    "wordCloudHeight": 400,
    "topContributorsLimit": 10
  },
  "performance": {
    "progressThrottleMs": 200,
    "cacheEnabled": true
  },
  "exclusions": {
    "patterns": ["node_modules/**", "dist/**", "*.log"]
  }
}
```

### Configuration Priority (High to Low)
1. CLI arguments
2. `repo-statter.config.json` in current directory
3. `repo-statter.config.json` in repository root
4. Built-in defaults

## Implementation Plan

### Phase 1: Configuration Infrastructure (Commit 1)
- Create `src/config/` directory
- Add `schema.ts` with TypeScript interfaces for all config sections
- Add `defaults.ts` with current hardcoded values as defaults
- Add `loader.ts` with JSON loading and merging logic
- Add unit tests for configuration loading

### Phase 2: CLI Integration (Commit 2)
- Modify `src/cli/handler.ts` to load configuration
- Update CLI options to override config file values
- Add `--config <path>` option for custom config file location
- Ensure backward compatibility with existing CLI arguments

### Phase 3: Core Modules Integration (Commit 3)
- Update `src/text/processor.ts` to use config
- Update `src/data/file-calculator.ts` heat calculation weights
- Update `src/data/git-extractor.ts` byte estimation
- Update `src/data/time-series-transformer.ts` threshold

### Phase 4: Charts and UI (Commit 4)
- Update all chart modules to use config for limits and dimensions
- Update `src/utils/exclusions.ts` to use configurable patterns
- Update progress reporting to use configurable throttling

### Phase 5: Cache and Performance (Commit 5)
- Update `src/cache/git-cache.ts` to use configurable settings
- Add cache enable/disable configuration support

### Phase 6: Documentation and Examples (Commit 6)
- Create example `repo-statter.config.json` files
- Update README with configuration documentation
- Add schema validation for config files

## Expected Benefits
- **User Experience**: Easy customization without code changes
- **Team Sharing**: Configuration files can be committed to repos
- **Maintainability**: Centralized configuration management
- **Extensibility**: Easy to add new configuration options

## Technical Considerations
- **Backward Compatibility**: All existing CLI options must continue working
- **Validation**: JSON schema validation for config files
- **Error Handling**: Graceful fallback to defaults if config is invalid
- **Performance**: Minimal impact on startup time

## Success Criteria
- ✅ All hardcoded values moved to configuration
- ✅ Configuration can be overridden via CLI arguments
- ✅ Existing functionality unchanged
- ✅ Tests pass and type checking succeeds
- ✅ All test files updated to use new configuration parameters
- ⏳ Documentation updated (README pending)

## Implementation Summary

Successfully implemented in 6 main phases:

1. **Configuration infrastructure** (8ae3b06)
   - Created schema.ts, defaults.ts, loader.ts
   - Added comprehensive test suite (9 tests)
   - Implemented configuration hierarchy with deep merging

2. **CLI integration** (d3a7792)
   - Added `--config <path>` option
   - Integrated configuration loading with validation
   - Maintained full backward compatibility

3. **Core modules integration** (8e86e64)
   - Updated text processor (word cloud settings)
   - Updated file calculator (heat calculation weights)
   - Updated git extractor (bytes per line estimation)
   - Updated time series transformer (hourly threshold)

4. **Charts and UI configuration** (ba115a6)
   - Updated all chart modules to accept configuration parameters
   - Made chart heights and limits configurable
   - Updated exclusions to use configuration patterns
   - Passed configuration from server to client-side rendering

5. **Cache and performance settings** (3291395)
   - Made cache version and directory name configurable
   - Updated git-cache.ts to accept configuration parameters
   - Maintained backward compatibility with defaults

6. **Configuration refactoring** (2025-01-21)
   - Refactored to pass full RepoStatterConfig object throughout codebase
   - Updated all function signatures to accept config parameter
   - Fixed all test files to use TEST_CONFIG helper
   - Resolved duplicate imports and TypeScript errors
   - All 301 tests passing

## Results

- **Zero breaking changes** - All existing CLI usage continues to work
- **Fully configurable** - Users can now create `repo-statter.config.json` to customize behavior
- **Type-safe** - Complete TypeScript interfaces for all configuration
- **Well-tested** - All tests passing, including new configuration tests
- **Clean implementation** - No hacks, consistent patterns throughout

## Next Steps

- Phase 6: Create example configuration files and update README documentation
- Consider implementing AnalysisContext structure to simplify function signatures
- Consider adding JSON schema for IDE autocomplete support
- Monitor for user feedback on configuration options

## Phase 7: Additional Configuration Extraction ✅ COMPLETED (2025-01-21)

### Newly Identified Hardcoded Values

After review, several more hardcoded values were found that should be configurable:

1. **FILE_TYPE_MAP** (`src/data/git-extractor.ts:8-63`)
   - Maps file extensions to language names
   - Duplicated in multiple files:
     - `src/charts/top-files-chart.ts:11`
     - `src/chart/event-handlers.ts:263`
     - `docs/repo-statter/index.html` (multiple locations)

2. **BINARY_EXTENSIONS** (`src/data/git-extractor.ts:65-75`)
   - Set of binary file extensions to exclude from analysis

3. **STOP_WORDS** (`src/text/processor.ts:12-28`)
   - Common English words to exclude from word cloud analysis
   - Users may want to customize for different languages

4. **VERSION** (`src/index.ts:8`)
   - Application version constant "1.0.0"
   - Should match config version

### Implementation Plan for Phase 7

#### Step 1: Update Configuration Schema ✅
- Added `FileTypesConfig` interface with:
  - `mappings: Record<string, string>` for file type mappings
  - `binaryExtensions: string[]` for binary file detection
- Added `TextAnalysisConfig` interface with:
  - `stopWords: string[]` for customizable stop words

#### Step 2: Update Defaults ✅
- Moved FILE_TYPE_MAP to `config.fileTypes.mappings`
- Moved BINARY_EXTENSIONS to `config.fileTypes.binaryExtensions`
- Moved STOP_WORDS to `config.textAnalysis.stopWords`

#### Step 3: Refactor Core Modules ✅
- Updated `src/data/git-extractor.ts`:
  - Accept config parameter in `getFileType()` and `isBinaryFile()`
  - Removed hardcoded FILE_TYPE_MAP and BINARY_EXTENSIONS
- Updated `src/text/processor.ts`:
  - Accept config parameter in `filterStopWords()`
  - Removed hardcoded STOP_WORDS
- Updated `src/index.ts`:
  - Removed unused VERSION export

#### Step 4: Remove Duplicate Mappings ✅
- Removed FILE_TYPE_MAP from:
  - `src/charts/top-files-chart.ts`
  - `src/chart/event-handlers.ts`
- Updated these files to use configuration from window.repoData
- Added fileTypesConfig to data passed to client in generator.ts

#### Step 5: Update Tests ✅
- Updated all test files to pass configuration
- All 301 tests passing
- Type checking passes

## Phase 8: AnalysisContext Refactoring (Future)

### Problem
Currently, many functions accept numerous parameters:
- `repoPath: string`
- `repoName: string`
- `isLizardInstalled: boolean`
- `currentFiles: Set<string>`
- `progressReporter?: ProgressReporter`
- `config: RepoStatterConfig`

This leads to:
- Long function signatures
- Difficult refactoring when adding new parameters
- Repetitive parameter passing through call chains

### Proposed Solution: AnalysisContext Interface

```typescript
interface AnalysisContext {
  // Repository information
  repoPath: string;
  repoName: string;
  
  // Analysis state
  currentFiles: Set<string>;
  isLizardInstalled: boolean;
  
  // Configuration and utilities
  config: RepoStatterConfig;
  progressReporter?: ProgressReporter;
  
  // Optional: Analysis metadata
  startTime?: Date;
  commitCount?: number;
}
```

### Benefits
1. **Cleaner APIs**: Functions accept a single context parameter
2. **Easier Extension**: Add new fields without changing all function signatures
3. **Better Organization**: Related data grouped together
4. **Reduced Coupling**: Functions don't need to know about all parameters

### Implementation Approach
1. Create `AnalysisContext` interface in `src/types/context.ts`
2. Start with high-level functions in `src/report/generator.ts`
3. Gradually refactor downward through the call chain
4. Update tests to use context builders

### Example Refactoring

Before:
```typescript
async function analyzeRepository(
  repoPath: string,
  repoName: string,
  isLizardInstalled: boolean,
  currentFiles: Set<string>,
  progressReporter?: ProgressReporter,
  config?: RepoStatterConfig
): Promise<AnalysisResult>
```

After:
```typescript
async function analyzeRepository(
  context: AnalysisContext
): Promise<AnalysisResult>
```

## Next Steps

1. Complete Phase 7 implementation
2. Run all tests and fix any failures
3. Update documentation with new configuration options
4. Create example configuration showing:
   - Custom file type mappings for domain-specific languages
   - Stop words for different languages
   - Binary extensions for proprietary formats
5. Consider Phase 8 (AnalysisContext) as a separate task
