# Configuration System Simplification

## Problem Statement

The project currently maintains two complete configuration systems:
- Full schema (`src/config/schema.ts`) with 70+ configuration options
- Simplified schema (`src/config/simplified-schema.ts`) with ~15 essential options
- Complex detection and conversion logic in `unified-loader.ts`

This dual system creates unnecessary maintenance burden, cognitive overhead, and testing complexity without providing meaningful value to users.

## Proposed Solution

Consolidate to a single, simplified configuration system by completely removing the full schema and its associated complexity.

## Implementation Plan

This refactoring can be broken into small, isolated commits that build upon each other safely.

### Step 1: Expand simplified defaults (Commit 1)
**Goal**: Ensure `SIMPLIFIED_DEFAULTS` covers all cases `DEFAULT_CONFIG` handles
- Expand `SIMPLIFIED_DEFAULTS` in `simplified-schema.ts` to include all essential options
- Add any missing default values that are used by consumers
- **Validation**: All existing functionality still works with expanded defaults

### Step 2: Create enhanced SimplifiedConfig type (Commit 2) 
**Goal**: Update SimplifiedConfig to handle all current RepoStatterConfig use cases
- Add any missing optional properties that are actually used in the codebase
- Ensure property paths match what consumers expect (e.g., `exclusions` as array vs nested object)  
- **Validation**: TypeScript compilation succeeds with new interface

### Step 3: Replace DEFAULT_CONFIG with SIMPLIFIED_DEFAULTS (Commit 3)
**Goal**: Switch the primary default configuration to simplified format
- Update `src/config/defaults.ts` to export `SIMPLIFIED_DEFAULTS` as `DEFAULT_CONFIG`
- Keep the old DEFAULT_CONFIG as `LEGACY_CONFIG` temporarily for testing
- **Validation**: All tests pass with new defaults

### Step 4: Update property access patterns (Commit 4)
**Goal**: Fix all places that access config properties using old paths
- Update `config.exclusions.patterns` → `config.exclusions` (16 files affected)
- Update `config.performance.cacheDirName` → `config.performance.cacheDir`
- Update other nested property accesses as needed
- **Validation**: Full test suite passes

### Step 5: Replace type definitions (Commit 5)
**Goal**: Switch all RepoStatterConfig references to SimplifiedConfig
- Update imports across 16 files that use RepoStatterConfig
- Update function signatures and interfaces
- **Validation**: TypeScript compilation succeeds, tests pass

### Step 6: Simplify unified-loader (Commit 6)
**Goal**: Remove dual-format detection and conversion logic
- Remove `isSimplifiedConfig()` function (35+ lines)
- Simplify `loadConfigFile()` to only parse SimplifiedConfig
- Remove conversion logic from `unified-loader.ts`
- **Validation**: Configuration loading still works correctly

### Step 7: Remove migration system (Commit 7)
**Goal**: Delete the format conversion system entirely
- Delete `src/config/migration.ts` (274 lines)
- Delete related migration tests
- Remove migration imports from other files
- **Validation**: Codebase builds successfully

### Step 8: Delete legacy schema (Commit 8)
**Goal**: Remove the original complex schema completely
- Delete `src/config/schema.ts` (71 lines)
- Remove any remaining imports of RepoStatterConfig type
- **Validation**: Clean build with no TypeScript errors

### Step 9: Update documentation and examples (Commit 9)
**Goal**: Reflect the simplified configuration in all user-facing docs
- Update README.md configuration section
- Update any example configs in docs/
- Remove references to complex configuration format
- **Validation**: Documentation is accurate and complete

## Expected Benefits

1. **Reduced maintenance burden**: ~300 lines of code removed
2. **Simplified mental model**: One configuration format to understand
3. **Faster onboarding**: New contributors only need to learn one system
4. **Reduced testing complexity**: Half the configuration test scenarios
5. **Cleaner codebase**: Eliminates abstraction layer that provides no value

## Risks and Mitigation

1. **Breaking change for existing users**
   - **Mitigation**: Provide migration script or clear upgrade instructions
   - **Mitigation**: Bump major version to signal breaking change

2. **Loss of advanced configuration options**
   - **Analysis**: Current simplified schema covers all practical use cases
   - **Mitigation**: Advanced options can be added to simplified schema if truly needed

## Success Criteria

- [ ] All tests pass with simplified configuration only
- [ ] Configuration export/import works seamlessly
- [ ] All existing functionality preserved
- [ ] Documentation updated and accurate
- [ ] Codebase reduced by ~300 lines
- [ ] Zero configuration-related complexity in loader logic

## Implementation Notes

- Follow existing patterns in simplified schema for any new options
- Maintain backward compatibility where possible during transition
- Use builder pattern in tests as established in `src/test/builders.ts`
- Ensure all changes align with engineering directives (minimal, elegant, delete aggressively)