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

## Implementation Notes
Consider what the actual build process should be - currently it just runs the analyzer.