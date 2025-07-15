# Hardcoded Word Cloud Thresholds

## Problem
- **Location**: `src/text/processor.ts:44`, `src/text/processor.ts:63`, `src/text/processor.ts:74`
- **Description**: Word processing has multiple hardcoded magic numbers (min length=3, top 100 words, size scaling 10-80) that should be configurable
- **Current vs Expected**: Hardcoded values vs configurable parameters

## Analysis and Validation
✅ **Confirmed locations**: 
- Line 44: `word.length >= 3` (min word length)
- Line 63: `slice(0, 100)` (max words) 
- Line 74: `size: 10 + (70 * ...)` (size scaling 10-80)

✅ **Valid task**: All hardcoded values exist as described
✅ **Safe refactoring**: Pure configuration extraction, no behavior changes

## Solution
Extract magic numbers into a configuration object:

```typescript
interface WordCloudConfig {
  minWordLength: number
  maxWords: number
  minSize: number
  maxSize: number
}

const DEFAULT_CONFIG: WordCloudConfig = {
  minWordLength: 3,
  maxWords: 100,
  minSize: 10,
  maxSize: 80
}

export function filterStopWords(words: string[], config = DEFAULT_CONFIG): string[] {
  return words.filter(word => 
    word.length >= config.minWordLength && 
    !STOP_WORDS.has(word) && 
    !/^\d+$/.test(word)
  )
}

export function getWordFrequencies(words: string[], config = DEFAULT_CONFIG): WordFrequency[] {
  // ... existing logic ...
  
  const topWords = frequencies.slice(0, config.maxWords)
  
  return topWords.map(item => ({
    text: item.text,
    size: config.minSize + ((config.maxSize - config.minSize) * (item.size - minCount) / range)
  }))
}
```

## Impact
- **Type**: Pure refactoring
- **Risk**: Low
- **Complexity**: Simple
- **Benefit**: Medium impact - improves configurability and maintainability

## Implementation Plan
This can be completed in a single commit:

1. **Add interface and default config** at top of file
2. **Update filterStopWords function** to accept optional config parameter
3. **Update getWordFrequencies function** to accept optional config parameter and use config values
4. **Update processCommitMessages function** to pass config through (if needed)
5. **Verify build** and test functionality
6. **Commit** with clear message about config extraction

**Implementation Steps:**
- Add `WordCloudConfig` interface after existing interfaces
- Add `DEFAULT_CONFIG` constant after interface
- Modify `filterStopWords`: add config parameter, use `config.minWordLength`
- Modify `getWordFrequencies`: add config parameter, use `config.maxWords`, `config.minSize`, `config.maxSize`
- Update size calculation: `config.minSize + ((config.maxSize - config.minSize) * ...)`

**Risk**: Very low - maintains backward compatibility with default parameters
**Time**: ~10 minutes
**Complexity**: Simple refactoring

This task is ready for implementation.