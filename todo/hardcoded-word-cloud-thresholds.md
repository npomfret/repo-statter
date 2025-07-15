# Hardcoded Word Cloud Thresholds

## Problem
- **Location**: `src/text/processor.ts:44`, `src/text/processor.ts:62`, `src/text/processor.ts:67-68`, `src/text/processor.ts:74`
- **Description**: Word processing has multiple hardcoded magic numbers (min length=3, top 100 words, size scaling 10-80) that should be configurable
- **Current vs Expected**: Hardcoded values vs configurable parameters

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

## Implementation Notes
Consider adding validation for config values to ensure they're within reasonable ranges.