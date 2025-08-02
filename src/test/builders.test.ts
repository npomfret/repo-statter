import { describe, it, expect } from 'vitest'
import {
  CommitDataBuilder,
  FileChangeBuilder,
  createTestCommit,
  createEmptyCommit
} from './builders.js'

describe('CommitDataBuilder', () => {
  it('builds basic commit data', () => {
    const commit = new CommitDataBuilder()
      .withHash('def456')
      .withAuthor('John Doe', 'john@example.com')
      .withDate('2024-02-01')
      .withMessage('Fix bug')
      .build()

    expect(commit.sha).toBe('def456')
    expect(commit.authorName).toBe('John Doe')
    expect(commit.authorEmail).toBe('john@example.com')
    expect(commit.date).toBe('2024-02-01')
    expect(commit.message).toBe('Fix bug')
  })

  it('calculates statistics from file changes', () => {
    const commit = new CommitDataBuilder()
      .withFileChange(new FileChangeBuilder()
        .withPath('src/index.js')
        .withAdditions(10, 500)
        .withDeletions(5, 250)
        .build())
      .withFileChange(new FileChangeBuilder()
        .withPath('src/utils.js')
        .withAdditions(20, 1000)
        .build())
      .build()

    expect(commit.linesAdded).toBe(30)
    expect(commit.linesDeleted).toBe(5)
    expect(commit.bytesAdded).toBe(1500)
    expect(commit.bytesDeleted).toBe(250)
  })
})

describe('FileChangeBuilder', () => {
  it('builds file change with defaults', () => {
    const change = new FileChangeBuilder()
      .withPath('test.py')
      .withAdditions(15)
      .build()

    expect(change.fileName).toBe('test.py')
    expect(change.fileType).toBe('py')
    expect(change.linesAdded).toBe(15)
    expect(change.linesDeleted).toBe(0)
    expect(change.bytesAdded).toBe(750) // 15 * 50
    expect(change.bytesDeleted).toBe(0)
  })

  it('builds file change with custom bytes', () => {
    const change = new FileChangeBuilder()
      .withPath('config.json')
      .withAdditions(5, 200)
      .withDeletions(3, 120)
      .build()

    expect(change.linesAdded).toBe(5)
    expect(change.bytesAdded).toBe(200)
    expect(change.linesDeleted).toBe(3)
    expect(change.bytesDeleted).toBe(120)
  })
})

describe('Factory functions', () => {
  it('creates test commit with defaults', () => {
    const commit = createTestCommit()
    expect(commit.authorName).toBe('Test Author')
    expect(commit.filesChanged).toHaveLength(1)
    expect(commit.filesChanged[0]!.fileName).toBe('src/index.js')
    expect(commit.linesAdded).toBe(10)
  })

  it('creates empty commit', () => {
    const commit = createEmptyCommit('Bob')
    expect(commit.authorName).toBe('Bob')
    expect(commit.message).toBe('Empty commit')
    expect(commit.filesChanged).toHaveLength(0)
    expect(commit.linesAdded).toBe(0)
    expect(commit.linesDeleted).toBe(0)
  })

})