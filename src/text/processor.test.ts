import { describe, it, expect } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import { extractWords, filterStopWords, getWordFrequencies, processCommitMessages } from './processor.js'

describe('extractWords', () => {
  it('should extract words from empty array', () => {
    const result = extractWords([])
    expect(result).toEqual([])
  })

  it('should extract words from single message', () => {
    const result = extractWords(['Fix bug in parser'])
    expect(result).toEqual(['fix', 'bug', 'in', 'parser'])
  })

  it('should extract words from multiple messages', () => {
    const result = extractWords(['Add feature', 'Update docs'])
    expect(result).toEqual(['add', 'feature', 'update', 'docs'])
  })

  it('should convert to lowercase', () => {
    const result = extractWords(['FIX BUG', 'Update PARSER'])
    expect(result).toEqual(['fix', 'bug', 'update', 'parser'])
  })

  it('should remove special characters', () => {
    const result = extractWords(['fix: bug!', 'feat(parser): update-code'])
    expect(result).toEqual(['fix', 'bug', 'feat', 'parser', 'update', 'code'])
  })

  it('should handle messages with only special characters', () => {
    const result = extractWords(['!!!', '...', '---'])
    expect(result).toEqual([])
  })

  it('should filter empty strings after processing', () => {
    const result = extractWords(['   ', 'test   ', '  word  '])
    expect(result).toEqual(['test', 'word'])
  })

  it('should handle unicode and emojis by removing them', () => {
    const result = extractWords(['🎉 fix bug', 'update • parser'])
    expect(result).toEqual(['fix', 'bug', 'update', 'parser'])
  })
})

describe('filterStopWords', () => {
  it('should return empty array for empty input', () => {
    const result = filterStopWords([], TEST_CONFIG.wordCloud)
    expect(result).toEqual([])
  })

  it('should filter common stop words', () => {
    const words = ['the', 'fix', 'is', 'bug', 'in', 'parser']
    const result = filterStopWords(words, TEST_CONFIG.wordCloud)
    expect(result).toEqual(['fix', 'bug', 'parser'])
  })

  it('should filter words shorter than minWordLength', () => {
    const words = ['a', 'ab', 'abc', 'abcd']
    const result = filterStopWords(words, TEST_CONFIG.wordCloud)
    expect(result).toEqual(['abc', 'abcd'])
  })

  it('should filter pure numbers', () => {
    const words = ['123', 'version2', '2023', 'test']
    const result = filterStopWords(words, TEST_CONFIG.wordCloud)
    expect(result).toEqual(['version2', 'test'])
  })

  it('should respect custom config', () => {
    const words = ['ab', 'abc', 'abcd', 'abcde']
    const config = { minWordLength: 4, maxWords: 100, minSize: 10, maxSize: 80 }
    const result = filterStopWords(words, config)
    expect(result).toEqual(['abcd', 'abcde'])
  })

  it('should keep valid technical terms', () => {
    const words = ['refactor', 'typescript', 'async', 'component']
    const result = filterStopWords(words, TEST_CONFIG.wordCloud)
    expect(result).toEqual(['refactor', 'typescript', 'async', 'component'])
  })
})

describe('getWordFrequencies', () => {
  it('should return empty array for empty input', () => {
    const result = getWordFrequencies([], TEST_CONFIG.wordCloud)
    expect(result).toEqual([])
  })

  it('should count single occurrence', () => {
    const result = getWordFrequencies(['test'], TEST_CONFIG.wordCloud)
    expect(result).toEqual([{ text: 'test', size: 10 }])
  })

  it('should count multiple occurrences', () => {
    const words = ['fix', 'bug', 'fix', 'fix', 'bug']
    const result = getWordFrequencies(words, TEST_CONFIG.wordCloud)
    expect(result).toHaveLength(2)
    expect(result[0]!.text).toBe('fix')
    expect(result[1]!.text).toBe('bug')
  })

  it('should sort by frequency descending', () => {
    const words = ['rare', 'common', 'common', 'common', 'medium', 'medium']
    const result = getWordFrequencies(words, TEST_CONFIG.wordCloud)
    expect(result.map(w => w.text)).toEqual(['common', 'medium', 'rare'])
  })

  it('should scale sizes correctly', () => {
    const words = ['max', 'max', 'max', 'min']
    const result = getWordFrequencies(words, TEST_CONFIG.wordCloud)
    expect(result[0]!.size).toBe(80) // maxSize
    expect(result[1]!.size).toBe(10) // minSize
  })

  it('should handle all same frequency', () => {
    const words = ['a', 'b', 'c']
    const result = getWordFrequencies(words, TEST_CONFIG.wordCloud)
    expect(result).toHaveLength(3)
    // All should have same size when frequencies are equal
    expect(new Set(result.map(w => w.size)).size).toBe(1)
  })

  it('should respect maxWords config', () => {
    const words = Array(200).fill(0).flatMap((_, i) => [`word${i}`])
    const config = { minWordLength: 3, maxWords: 10, minSize: 10, maxSize: 80 }
    const result = getWordFrequencies(words, config)
    expect(result).toHaveLength(10)
  })

  it('should handle intermediate scaling', () => {
    const words = ['max', 'max', 'max', 'max', 'med', 'med', 'min']
    const result = getWordFrequencies(words, TEST_CONFIG.wordCloud)
    const sizes = result.map(w => w.size)
    expect(sizes[0]).toBe(80) // max
    expect(sizes[2]).toBe(10) // min
    expect(sizes[1]).toBeGreaterThan(10)
    expect(sizes[1]).toBeLessThan(80)
  })
})

describe('processCommitMessages', () => {
  it('should throw on empty messages array', () => {
    expect(() => processCommitMessages([], TEST_CONFIG)).toThrowError('Cannot process empty messages array')
  })

  it('should process single message', () => {
    const result = processCommitMessages(['Fix critical bug in parser module'], TEST_CONFIG)
    expect(result.map(w => w.text)).toContain('fix')
    expect(result.map(w => w.text)).toContain('critical')
    expect(result.map(w => w.text)).toContain('bug')
    expect(result.map(w => w.text)).toContain('parser')
    expect(result.map(w => w.text)).toContain('module')
  })

  it('should combine and process multiple messages', () => {
    const messages = [
      'Add authentication feature',
      'Fix authentication bug',
      'Update authentication docs'
    ]
    const result = processCommitMessages(messages, TEST_CONFIG)
    const authWord = result.find(w => w.text === 'authentication')
    expect(authWord).toBeDefined()
    expect(authWord!.size).toBe(80) // Should be most frequent
  })

  it('should filter stop words from messages', () => {
    const messages = ['The quick brown fox jumps over the lazy dog']
    const result = processCommitMessages(messages, TEST_CONFIG)
    const texts = result.map(w => w.text)
    expect(texts).not.toContain('the')
    expect(texts).toContain('quick')
    expect(texts).toContain('brown')
    expect(texts).toContain('fox')
    expect(texts).toContain('jumps')
    expect(texts).toContain('over')
    expect(texts).toContain('lazy')
    expect(texts).toContain('dog')
  })

  it('should handle messages with only stop words gracefully', () => {
    const messages = ['the is are was were been be have has had']
    const result = processCommitMessages(messages, TEST_CONFIG)
    expect(result).toEqual([])
  })

  it('should handle real-world commit messages', () => {
    const messages = [
      'feat: add user authentication',
      'fix: resolve memory leak in auth service',
      'docs: update authentication guide',
      'refactor: improve auth performance',
      'test: add auth integration tests'
    ]
    const result = processCommitMessages(messages, TEST_CONFIG)
    const texts = result.map(w => w.text)
    expect(texts).toContain('auth')
    expect(texts).toContain('authentication')
    expect(texts).toContain('add')
    expect(texts).toContain('update')
  })

  it('should handle commit messages with version numbers', () => {
    const messages = [
      'chore: bump version to 2.0.0',
      'release: v1.2.3',
      'fix: bug in version 3'
    ]
    const result = processCommitMessages(messages, TEST_CONFIG)
    const texts = result.map(w => w.text)
    expect(texts).toContain('version')
    expect(texts).toContain('bump')
    expect(texts).toContain('release')
    expect(texts).not.toContain('2')
    expect(texts).not.toContain('3')
  })
})