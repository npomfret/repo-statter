# Allow user to override any configuration item

## Analysis

The current configuration system (in `src/config/`) is robust with a comprehensive schema, defaults, and file-based configuration support. However, CLI overrides are limited to only a few specific options (`maxCommits`, `output`, `outputFile`, `noCache`, `clearCache`, `configPath`).

Users should be able to override ANY configuration item from the command line for maximum flexibility.

## Current Limitations

The `ConfigOverrides` interface in `src/config/loader.ts:6-13` only supports a subset of configuration options. The CLI handler (`src/cli/handler.ts:34-41`) only processes these limited overrides.

## Implementation Plan

### Phase 1: Generic Override System
1. **Replace specific ConfigOverrides interface** with a generic system:
   - Remove the current `ConfigOverrides` interface
   - Accept any key-value pairs for configuration overrides
   - Use deep merging to apply overrides to any nested configuration path

### Phase 2: CLI Integration
2. **Add generic --set CLI option**:
   - Add `--set <key=value>` option that can be used multiple times
   - Parse dot-notation paths (e.g., `wordCloud.maxWords=150`)
   - Support all primitive types (string, number, boolean)
   - Support array values with JSON-like syntax

### Phase 3: Type Safety and Validation
3. **Maintain type safety**:
   - Validate override keys against the configuration schema
   - Preserve existing configuration validation
   - Provide clear error messages for invalid paths or values

## Small Commits Plan

1. **Refactor ConfigOverrides**: Replace specific interface with generic override system
2. **Add CLI --set option**: Implement dot-notation configuration override parsing
3. **Add type validation**: Ensure overrides are validated against schema
4. **Add tests**: Unit tests for new override functionality
5. **Update documentation**: Add examples of using --set option

## Expected Usage Examples

```bash
# Override word cloud settings
repo-statter --set wordCloud.maxWords=150 --set wordCloud.minWordLength=4

# Override chart dimensions
repo-statter --set charts.wordCloudHeight=500 --set charts.topContributorsLimit=15

# Override performance settings
repo-statter --set performance.progressThrottleMs=100

# Override exclusion patterns (JSON array syntax)
repo-statter --set 'exclusions.patterns=["*.log","*.tmp","custom/**/*"]'
```

## Benefits

- **Maximum flexibility**: Users can override any configuration without creating config files
- **Consistent with Unix philosophy**: Configuration via command-line arguments
- **Backward compatible**: Existing CLI options continue to work
- **Type safe**: Validates against existing configuration schema
