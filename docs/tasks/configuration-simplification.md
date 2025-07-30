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

### Phase 1: Analysis and Preparation
1. **Audit configuration usage patterns**
   - Review all config consumers to identify which options are actually used
   - Confirm that simplified schema covers all real-world use cases
   - Document any edge cases that might be affected

2. **Update tests**
   - Ensure comprehensive test coverage for simplified schema
   - Update all configuration-related tests to use simplified format
   - Remove tests specific to full schema

### Phase 2: Code Removal
1. **Delete full schema files**
   - Remove `src/config/schema.ts` (71 lines)
   - Remove `src/config/migration.ts` (conversion logic)
   - Remove related type exports

2. **Simplify loader logic**
   - Remove schema detection logic from `unified-loader.ts` (lines 22-57)
   - Remove `isSimplifiedConfig()` function
   - Simplify `loadConfigFile()` to only handle simplified format
   - Update `exportConfiguration()` to only export simplified format

3. **Update type definitions**
   - Replace all `RepoStatterConfig` references with `SimplifiedConfig`
   - Update import statements across the codebase
   - Ensure type consistency throughout

### Phase 3: Consumer Updates
1. **Update all configuration consumers**
   - `src/report/generator.ts`
   - `src/cli/handler.ts`
   - All data processing modules that read config
   - Update property access paths to match simplified schema structure

2. **Update default configuration**
   - Ensure `SIMPLIFIED_DEFAULTS` covers all necessary defaults
   - Update `DEFAULT_CONFIG` references to use simplified defaults

### Phase 4: Documentation and Testing
1. **Update documentation**
   - Update README.md configuration section
   - Update any configuration examples
   - Remove references to full schema format

2. **Comprehensive testing**
   - Run full test suite to ensure no regressions
   - Test configuration export/import functionality
   - Test with various configuration scenarios

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