export interface WordFrequency {
  text: string
  size: number
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

export function filterStopWords(words: string[]): string[] {
  return words.filter(word => 
    word.length >= 3 && 
    !STOP_WORDS.has(word) && 
    !/^\d+$/.test(word) // Filter out pure numbers
  )
}

export function getWordFrequencies(words: string[]): WordFrequency[] {
  const frequencyMap = new Map<string, number>()
  
  for (const word of words) {
    frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1)
  }
  
  // Convert to array and sort by frequency
  const frequencies = Array.from(frequencyMap.entries())
    .map(([text, count]) => ({ text, size: count }))
    .sort((a, b) => b.size - a.size)
  
  // Take top 100 words and scale sizes for better visualization
  const top100 = frequencies.slice(0, 100)
  
  if (top100.length === 0) return []
  
  // Scale sizes: largest word = 80, smallest = 10
  const maxCount = top100[0]!.size
  const minCount = top100[top100.length - 1]!.size
  const range = maxCount - minCount || 1
  
  return top100.map(item => ({
    text: item.text,
    size: 10 + (70 * (item.size - minCount) / range)
  }))
}

export function processCommitMessages(messages: string[]): WordFrequency[] {
  const words = extractWords(messages)
  const filteredWords = filterStopWords(words)
  return getWordFrequencies(filteredWords)
}