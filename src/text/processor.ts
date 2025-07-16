// Assert utilities for fail-fast error handling
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

export interface WordFrequency {
  text: string
  size: number
}

export interface WordCloudConfig {
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

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'can', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'since', 'without', 'within', 'along',
  'following', 'across', 'behind', 'beyond', 'plus', 'except', 'but', 'yet', 'so',
  'if', 'then', 'than', 'such', 'both', 'either', 'neither', 'all', 'each',
  'every', 'any', 'some', 'no', 'not', 'only', 'just', 'also', 'very',
  'too', 'quite', 'almost', 'always', 'often', 'never', 'seldom', 'rarely', 'usually',
  'generally', 'sometimes', 'now', 'then', 'once', 'twice', 'first', 'second', 'last',
  'next', 'this', 'that', 'these', 'those', 'it', 'its', 'our', 'their',
  'there', 'here', 'when', 'where', 'why', 'how', 'what', 'which', 'who',
  'whom', 'whose', 'i', 'me', 'my', 'we', 'you', 'your', 'he', 'him',
  'his', 'she', 'her', 'they', 'them', 'as', 'more', 'most', 'other',
  'another', 'much', 'many', 'few', 'less', 'least', 'own', 'same', 'different',
  'small', 'large', 'big', 'high', 'low', 'early', 'late', 'new', 'old'
])

export function extractWords(messages: string[]): string[] {
  const words: string[] = []
  
  for (const message of messages) {
    // Remove special characters and split into words
    const messageWords = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
    
    words.push(...messageWords)
  }
  
  return words
}

export function filterStopWords(words: string[], config = DEFAULT_CONFIG): string[] {
  return words.filter(word => 
    word.length >= config.minWordLength && 
    !STOP_WORDS.has(word) && 
    !/^\d+$/.test(word) // Filter out pure numbers
  )
}

export function getWordFrequencies(words: string[], config = DEFAULT_CONFIG): WordFrequency[] {
  const frequencyMap = new Map<string, number>()
  
  for (const word of words) {
    frequencyMap.set(word, (frequencyMap.get(word) ?? 0) + 1)
  }
  
  // Convert to array and sort by frequency
  const frequencies = Array.from(frequencyMap.entries())
    .map(([text, count]) => ({ text, size: count }))
    .sort((a, b) => b.size - a.size)
  
  // Take top words and scale sizes for better visualization
  const topWords = frequencies.slice(0, config.maxWords)
  
  if (topWords.length === 0) return []
  
  // Scale sizes based on config
  const maxCount = topWords[0]!.size
  const minCount = topWords[topWords.length - 1]!.size
  const range = maxCount - minCount || 1
  
  return topWords.map(item => ({
    text: item.text,
    size: config.minSize + ((config.maxSize - config.minSize) * (item.size - minCount) / range)
  }))
}

export function processCommitMessages(messages: string[]): WordFrequency[] {
  assert(messages.length > 0, 'Cannot process empty messages array')
  const words = extractWords(messages)
  const filteredWords = filterStopWords(words)
  return getWordFrequencies(filteredWords)
}