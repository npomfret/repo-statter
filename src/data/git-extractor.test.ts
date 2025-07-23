import { describe, it, expect } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import { getFileType, parseCommitDiff, parseByteChanges } from './git-extractor.js'
import type { DiffSummary, ByteChanges } from './git-extractor.js'

describe('getFileType', () => {
  it('identifies common programming languages', () => {
    expect(getFileType('index.ts', TEST_CONFIG)).toBe('TypeScript')
    expect(getFileType('App.tsx', TEST_CONFIG)).toBe('TypeScript')
    expect(getFileType('script.js', TEST_CONFIG)).toBe('JavaScript')
    expect(getFileType('Component.jsx', TEST_CONFIG)).toBe('JavaScript')
    expect(getFileType('main.py', TEST_CONFIG)).toBe('Python')
    expect(getFileType('Main.java', TEST_CONFIG)).toBe('Java')
    expect(getFileType('main.go', TEST_CONFIG)).toBe('Go')
    expect(getFileType('lib.rs', TEST_CONFIG)).toBe('Rust')
  })

  it('identifies web files', () => {
    expect(getFileType('styles.css', TEST_CONFIG)).toBe('CSS')
    expect(getFileType('theme.scss', TEST_CONFIG)).toBe('SCSS')
    expect(getFileType('styles.sass', TEST_CONFIG)).toBe('SCSS')
    expect(getFileType('index.html', TEST_CONFIG)).toBe('HTML')
    expect(getFileType('config.json', TEST_CONFIG)).toBe('JSON')
    expect(getFileType('README.md', TEST_CONFIG)).toBe('Markdown')
  })

  it('identifies C/C++ files', () => {
    expect(getFileType('main.c', TEST_CONFIG)).toBe('C')
    expect(getFileType('main.cpp', TEST_CONFIG)).toBe('C++')
    expect(getFileType('app.cc', TEST_CONFIG)).toBe('C++')
    expect(getFileType('lib.cxx', TEST_CONFIG)).toBe('C++')
  })

  it('handles case insensitivity', () => {
    expect(getFileType('INDEX.TS', TEST_CONFIG)).toBe('TypeScript')
    expect(getFileType('MAIN.PY', TEST_CONFIG)).toBe('Python')
    expect(getFileType('Style.CSS', TEST_CONFIG)).toBe('CSS')
  })

  it('handles unknown extensions', () => {
    expect(getFileType('file.xyz', TEST_CONFIG)).toBe('Other')
    expect(getFileType('config.custom', TEST_CONFIG)).toBe('Other')
    expect(getFileType('no-extension', TEST_CONFIG)).toBe('Other')
    expect(getFileType('', TEST_CONFIG)).toBe('Other')
  })
})

describe('parseCommitDiff', () => {
  it('parses diff with multiple files', () => {
    const diffSummary: DiffSummary = {
      files: [
        { file: 'src/index.ts', insertions: 10, deletions: 5 },
        { file: 'src/utils.js', insertions: 20, deletions: 0 },
        { file: 'test/app.test.ts', insertions: 15, deletions: 10 }
      ]
    }
    
    const byteChanges: ByteChanges = {
      totalBytesAdded: 2250,
      totalBytesDeleted: 750,
      fileChanges: {
        'src/index.ts': { bytesAdded: 500, bytesDeleted: 250 },
        'src/utils.js': { bytesAdded: 1000, bytesDeleted: 0 },
        'test/app.test.ts': { bytesAdded: 750, bytesDeleted: 500 }
      }
    }
    
    const result = parseCommitDiff(diffSummary, byteChanges, TEST_CONFIG)
    
    expect(result.linesAdded).toBe(45)
    expect(result.linesDeleted).toBe(15)
    expect(result.bytesAdded).toBe(2250)
    expect(result.bytesDeleted).toBe(750)
    expect(result.filesChanged).toHaveLength(3)
    expect(result.filesChanged[0]).toEqual({
      fileName: 'src/index.ts',
      linesAdded: 10,
      linesDeleted: 5,
      fileType: 'TypeScript',
      bytesAdded: 500,
      bytesDeleted: 250
    })
  })

  it('handles missing insertions/deletions properties', () => {
    const diffSummary: DiffSummary = {
      files: [
        { file: 'new-file.js' }, // No insertions/deletions properties
        { file: 'deleted-file.js', deletions: 100 } // Only deletions
      ]
    }
    
    const byteChanges: ByteChanges = {
      totalBytesAdded: 0,
      totalBytesDeleted: 5000,
      fileChanges: {
        'new-file.js': { bytesAdded: 0, bytesDeleted: 0 },
        'deleted-file.js': { bytesAdded: 0, bytesDeleted: 5000 }
      }
    }
    
    const result = parseCommitDiff(diffSummary, byteChanges, TEST_CONFIG)
    
    expect(result.filesChanged[0]!.linesAdded).toBe(0)
    expect(result.filesChanged[0]!.linesDeleted).toBe(0)
    expect(result.filesChanged[1]!.linesAdded).toBe(0)
    expect(result.filesChanged[1]!.linesDeleted).toBe(100)
  })

  it('includes all files without filtering', () => {
    const diffSummary: DiffSummary = {
      files: [
        { file: 'src/app.ts', insertions: 10, deletions: 5 },
        { file: 'node_modules/lib.js', insertions: 100, deletions: 50 },
        { file: '.git/config', insertions: 1, deletions: 0 }
      ]
    }
    
    const byteChanges: ByteChanges = {
      totalBytesAdded: 500,
      totalBytesDeleted: 250,
      fileChanges: {
        'src/app.ts': { bytesAdded: 500, bytesDeleted: 250 },
        'node_modules/lib.js': { bytesAdded: 0, bytesDeleted: 0 },
        '.git/config': { bytesAdded: 0, bytesDeleted: 0 }
      }
    }
    
    const result = parseCommitDiff(diffSummary, byteChanges, TEST_CONFIG)
    
    // Now includes all files since filtering happens at runtime
    expect(result.filesChanged).toHaveLength(3)
    expect(result.filesChanged[0]!.fileName).toBe('src/app.ts')
    expect(result.filesChanged[1]!.fileName).toBe('node_modules/lib.js')
    expect(result.filesChanged[2]!.fileName).toBe('.git/config')
    expect(result.linesAdded).toBe(111) // 10 + 100 + 1
    expect(result.linesDeleted).toBe(55) // 5 + 50 + 0
  })

  it('handles missing byte changes data', () => {
    const diffSummary: DiffSummary = {
      files: [
        { file: 'src/new-file.ts', insertions: 50, deletions: 0 }
      ]
    }
    
    const byteChanges: ByteChanges = {
      totalBytesAdded: 0,
      totalBytesDeleted: 0,
      fileChanges: {} // No byte data for the file
    }
    
    const result = parseCommitDiff(diffSummary, byteChanges, TEST_CONFIG)
    
    expect(result.filesChanged[0]!.bytesAdded).toBe(0)
    expect(result.filesChanged[0]!.bytesDeleted).toBe(0)
    expect(result.bytesAdded).toBe(0)
    expect(result.bytesDeleted).toBe(0)
  })

  it('throws on invalid input', () => {
    expect(() => parseCommitDiff(null as any, {} as any, TEST_CONFIG)).toThrow('diffSummary must exist')
    expect(() => parseCommitDiff({ files: null as any }, {} as any, TEST_CONFIG)).toThrow('diffSummary must have files property')
    expect(() => parseCommitDiff({ files: [] }, null as any, TEST_CONFIG)).toThrow('byteChanges must exist')
  })

  it('includes files in data directories (filtering happens at runtime)', () => {
    const diffSummary: DiffSummary = {
      files: [
        { file: 'src/index.ts', insertions: 10, deletions: 5 },
        { file: 'packages/core/data/solsan/file.json', insertions: 1000, deletions: 0 },
        { file: 'data/test.csv', insertions: 5000, deletions: 0 },
        { file: 'src/data/models.ts', insertions: 20, deletions: 10 },
        { file: 'src/utils/helpers.ts', insertions: 15, deletions: 3 }
      ]
    }

    const byteChanges: ByteChanges = {
      totalBytesAdded: 306250,
      totalBytesDeleted: 900,
      fileChanges: {
        'src/index.ts': { bytesAdded: 500, bytesDeleted: 250 },
        'packages/core/data/solsan/file.json': { bytesAdded: 50000, bytesDeleted: 0 },
        'data/test.csv': { bytesAdded: 250000, bytesDeleted: 0 },
        'src/data/models.ts': { bytesAdded: 1000, bytesDeleted: 500 },
        'src/utils/helpers.ts': { bytesAdded: 750, bytesDeleted: 150 }
      }
    }

    const result = parseCommitDiff(diffSummary, byteChanges, TEST_CONFIG)

    // Now includes ALL files since filtering happens at runtime
    expect(result.filesChanged).toHaveLength(5)
    expect(result.filesChanged[0]!.fileName).toBe('src/index.ts')
    expect(result.filesChanged[1]!.fileName).toBe('packages/core/data/solsan/file.json')
    expect(result.filesChanged[2]!.fileName).toBe('data/test.csv')
    expect(result.filesChanged[3]!.fileName).toBe('src/data/models.ts')
    expect(result.filesChanged[4]!.fileName).toBe('src/utils/helpers.ts')
    
    // Totals now include all files
    expect(result.linesAdded).toBe(6045) // 10 + 1000 + 5000 + 20 + 15
    expect(result.linesDeleted).toBe(18) // 5 + 0 + 0 + 10 + 3
    expect(result.bytesAdded).toBe(302250) // 500 + 50000 + 250000 + 1000 + 750
    expect(result.bytesDeleted).toBe(900) // 250 + 0 + 0 + 500 + 150
  })
})

describe('parseByteChanges', () => {
  it('parses standard git numstat output', () => {
    const gitOutput = `10\t5\tsrc/index.ts
20\t0\tsrc/utils.js
15\t10\ttest/app.test.ts`
    
    const result = parseByteChanges(gitOutput, TEST_CONFIG)
    
    expect(result.totalBytesAdded).toBe(2250) // (10+20+15) * 50
    expect(result.totalBytesDeleted).toBe(750) // (5+0+10) * 50
    expect(result.fileChanges['src/index.ts']).toEqual({ bytesAdded: 500, bytesDeleted: 250 })
    expect(result.fileChanges['src/utils.js']).toEqual({ bytesAdded: 1000, bytesDeleted: 0 })
    expect(result.fileChanges['test/app.test.ts']).toEqual({ bytesAdded: 750, bytesDeleted: 500 })
  })

  it('handles empty output', () => {
    const result = parseByteChanges('', TEST_CONFIG)
    
    expect(result.totalBytesAdded).toBe(0)
    expect(result.totalBytesDeleted).toBe(0)
    expect(Object.keys(result.fileChanges)).toHaveLength(0)
  })

  it('handles binary files with - instead of numbers', () => {
    const gitOutput = `-\t-\tassets/logo.png
10\t5\tsrc/app.ts`
    
    const result = parseByteChanges(gitOutput, TEST_CONFIG)
    
    // Should skip the binary file and only process the text file
    expect(result.totalBytesAdded).toBe(500)
    expect(result.totalBytesDeleted).toBe(250)
    expect(result.fileChanges['src/app.ts']).toEqual({ bytesAdded: 500, bytesDeleted: 250 })
    expect(result.fileChanges['assets/logo.png']).toBeUndefined()
  })

  it('includes all files without filtering', () => {
    const gitOutput = `10\t5\tsrc/app.ts
100\t50\tnode_modules/lib.js
1\t0\t.git/config`
    
    const result = parseByteChanges(gitOutput, TEST_CONFIG)
    
    // Now includes all files since filtering happens at runtime
    expect(result.totalBytesAdded).toBe(5550) // (10*50) + (100*50) + (1*50)
    expect(result.totalBytesDeleted).toBe(2750) // (5*50) + (50*50) + (0*50)
    expect(Object.keys(result.fileChanges)).toHaveLength(3)
    expect(result.fileChanges['src/app.ts']).toBeDefined()
    expect(result.fileChanges['node_modules/lib.js']).toBeDefined()
    expect(result.fileChanges['.git/config']).toBeDefined()
  })

  it('handles malformed lines', () => {
    const gitOutput = `10\t5\tsrc/app.ts
invalid line
20\t\tsrc/utils.js
\t10\ttest.js
15\t10\tvalid.js`
    
    const result = parseByteChanges(gitOutput, TEST_CONFIG)
    
    // Should process only valid lines
    expect(result.fileChanges['src/app.ts']).toBeDefined()
    expect(result.fileChanges['valid.js']).toBeDefined()
    expect(Object.keys(result.fileChanges)).toHaveLength(2)
  })

  it('handles tabs in filenames', () => {
    const gitOutput = `10\t5\tsrc/file\twith\ttabs.ts`
    
    const result = parseByteChanges(gitOutput, TEST_CONFIG)
    
    // Should handle the filename with tabs correctly
    expect(result.fileChanges['src/file\twith\ttabs.ts']).toEqual({ bytesAdded: 500, bytesDeleted: 250 })
  })

  it('throws on invalid input type', () => {
    expect(() => parseByteChanges(null as any, TEST_CONFIG)).toThrow('gitNumstatOutput must be a string')
    expect(() => parseByteChanges(undefined as any, TEST_CONFIG)).toThrow('gitNumstatOutput must be a string')
    expect(() => parseByteChanges(123 as any, TEST_CONFIG)).toThrow('gitNumstatOutput must be a string')
  })
})