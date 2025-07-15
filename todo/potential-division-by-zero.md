# Potential Division by Zero Error

## Problem
- **Location**: `src/text/processor.ts:70`, `src/text/processor.ts:74`
- **Description**: Division by `range` variable can cause division by zero when all words have the same frequency, leading to runtime errors
- **Current vs Expected**: Potential division by zero vs safe division with fallback

## Solution
Add proper handling for edge cases:

```typescript
export function getWordFrequencies(words: string[]): WordFrequency[] {
  // ... existing logic ...
  
  if (top100.length === 0) return []
  
  const maxCount = top100[0]!.size
  const minCount = top100[top100.length - 1]!.size
  const range = maxCount - minCount
  
  // Handle edge case where all words have same frequency
  if (range === 0) {
    return top100.map(item => ({
      text: item.text,
      size: 40 // Use middle value when all frequencies are equal
    }))
  }
  
  return top100.map(item => ({
    text: item.text,
    size: 10 + (70 * (item.size - minCount) / range)
  }))
}
```

## Impact
- **Type**: Behavior change - fixes potential runtime error
- **Risk**: Low (prevents crashes)
- **Complexity**: Simple
- **Benefit**: Medium impact - prevents division by zero crashes

## Implementation Notes
Consider adding unit tests for edge cases like empty arrays and uniform frequencies.