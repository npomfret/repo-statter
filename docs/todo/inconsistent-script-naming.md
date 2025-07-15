# Inconsistent Script Naming

## Problem
- **Location**: `package.json:8-17`
- **Description**: Scripts have inconsistent naming - some use same command for different purposes
- **Current vs Expected**: `build` and `analyse` run same command vs clear distinction between build and analysis

## Solution
Clarify script purposes:

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc && tsx src/index.ts",
    "analyse": "tsx src/index.ts",
    "analyse:self": "tsx src/index.ts .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  }
}
```

Or if no compilation is needed:

```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "analyse": "tsx src/index.ts",
    "analyse:self": "tsx src/index.ts .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  }
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Quick win - clearer script purposes

## Implementation Plan

### Analysis
Current package.json scripts (lines 8-17):
- `dev`: `tsx src/index.ts` - runs analyzer in development mode
- `build`: `tsx src/index.ts` - misleading name, doesn't build anything
- `build:self`: `tsx src/index.ts .` - runs analyzer on current repo
- `analyse`: `tsx src/index.ts` - runs analyzer (redundant with others)

### Decision
Since this is a repository analysis tool, not a build tool, the primary function is analysis. The scripts should be:
- `start`: Primary entry point for running the analyzer
- `analyse`: Alias for clarity
- `analyse:self`: Analyze current repository
- Keep existing test, typecheck, lint scripts

### Implementation
Update package.json scripts to:
```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "analyse": "tsx src/index.ts", 
    "analyse:self": "tsx src/index.ts .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  }
}
```

## Implementation Notes
- Remove misleading `build` and `dev` scripts
- Use `start` as the primary entry point (npm convention)
- Keep `analyse` for clarity about the tool's purpose
- This is a pure refactoring with no behavior changes