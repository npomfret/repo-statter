import { assert } from '../utils/errors.js'
import type { SimplifiedConfig } from '../config/simplified-schema.js'

export interface WordFrequency {
  text: string
  size: number
}


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

export function filterStopWords(words: string[], config: SimplifiedConfig): string[] {
  const stopWordsSet = new Set(config.textAnalysis.stopWords)
  return words.filter(word => 
    word.length >= config.wordCloud.minWordLength && 
    !stopWordsSet.has(word) && 
    !/^\d+$/.test(word) // Filter out pure numbers
  )
}

export function getWordFrequencies(words: string[], config: SimplifiedConfig['wordCloud']): WordFrequency[] {
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

export function processCommitMessages(messages: string[], config: SimplifiedConfig): WordFrequency[] {
  assert(messages.length > 0, 'Cannot process empty messages array')
  const words = extractWords(messages)
  const filteredWords = filterStopWords(words, config)
  return getWordFrequencies(filteredWords, config.wordCloud)
}