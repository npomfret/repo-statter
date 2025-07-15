# Silent Error Handling Anti-Pattern

## Problem
- **Location**: `src/git/parser.ts:86-89`, `src/git/parser.ts:191-194`, `src/git/parser.ts:238-240`
- **Description**: Errors are silently caught and ignored, making debugging difficult
- **Current vs Expected**: Silent try/catch blocks vs proper error handling or logging

## Solution
Add proper error handling with context:

```typescript
// Instead of:
} catch (error) {
  // Silent fail - not all repos have GitHub remotes
}

// Use:
} catch (error) {
  // Log for debugging but don't fail the operation
  console.debug('No GitHub remote found for repository:', error.message)
}

// For critical operations, let errors bubble up:
} catch (error) {
  throw new Error(`Failed to get repository size for commit ${commitHash}: ${error.message}`)
}
```

## Impact
- **Type**: Behavior change - better error visibility
- **Risk**: Low 
- **Complexity**: Simple
- **Benefit**: Medium impact - improves debugging

## Implementation Notes
Distinguish between expected failures (like missing GitHub remotes) and unexpected errors. Expected failures can be logged at debug level, while unexpected errors should bubble up.