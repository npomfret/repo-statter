import { describe, it, expect } from 'vitest'
import { getFileType, parseCommitDiff, parseByteChanges } from './git-extractor.js'
import type { DiffSummary, ByteChanges } from './git-extractor.js'

describe('getFileType', () => {
  it('identifies common programming languages', () => {
    expect(getFileType('index.ts')).toBe('TypeScript')
    expect(getFileType('App.tsx')).toBe('TypeScript')
    expect(getFileType('script.js')).toBe('JavaScript')
    expect(getFileType('Component.jsx')).toBe('JavaScript')
    expect(getFileType('main.py')).toBe('Python')
    expect(getFileType('Main.java')).toBe('Java')
    expect(getFileType('main.go')).toBe('Go')
    expect(getFileType('lib.rs')).toBe('Rust')
  })

  it('identifies web files', () => {
    expect(getFileType('styles.css')).toBe('CSS')
    expect(getFileType('theme.scss')).toBe('SCSS')
    expect(getFileType('styles.sass')).toBe('SCSS')
    expect(getFileType('index.html')).toBe('HTML')
    expect(getFileType('config.json')).toBe('JSON')
    expect(getFileType('README.md')).toBe('Markdown')
  })

  it('identifies C/C++ files', () => {
    expect(getFileType('main.c')).toBe('C')
    expect(getFileType('main.cpp')).toBe('C++')
    expect(getFileType('app.cc')).toBe('C++')
    expect(getFileType('lib.cxx')).toBe('C++')
  })

  it('handles case insensitivity', () => {
    expect(getFileType('INDEX.TS')).toBe('TypeScript')
    expect(getFileType('MAIN.PY')).toBe('Python')
    expect(getFileType('Style.CSS')).toBe('CSS')
  })

  it('handles unknown extensions', () => {
    expect(getFileType('file.xyz')).toBe('Other')
    expect(getFileType('config.custom')).toBe('Other')
    expect(getFileType('no-extension')).toBe('Other')
    expect(getFileType('')).toBe('Other')
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
    
    const result = parseCommitDiff(diffSummary, byteChanges)
    
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
    
    const result = parseCommitDiff(diffSummary, byteChanges)
    
    expect(result.filesChanged[0]!.linesAdded).toBe(0)
    expect(result.filesChanged[0]!.linesDeleted).toBe(0)
    expect(result.filesChanged[1]!.linesAdded).toBe(0)
    expect(result.filesChanged[1]!.linesDeleted).toBe(100)
  })

  it('filters excluded files', () => {
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
        'src/app.ts': { bytesAdded: 500, bytesDeleted: 250 }
      }
    }
    
    const result = parseCommitDiff(diffSummary, byteChanges)
    
    expect(result.filesChanged).toHaveLength(1)
    expect(result.filesChanged[0]!.fileName).toBe('src/app.ts')
    expect(result.linesAdded).toBe(10)
    expect(result.linesDeleted).toBe(5)
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
    
    const result = parseCommitDiff(diffSummary, byteChanges)
    
    expect(result.filesChanged[0]!.bytesAdded).toBe(0)
    expect(result.filesChanged[0]!.bytesDeleted).toBe(0)
    expect(result.bytesAdded).toBe(0)
    expect(result.bytesDeleted).toBe(0)
  })

  it('throws on invalid input', () => {
    expect(() => parseCommitDiff(null as any, {} as any)).toThrow('diffSummary must exist')
    expect(() => parseCommitDiff({ files: null as any }, {} as any)).toThrow('diffSummary must have files property')
    expect(() => parseCommitDiff({ files: [] }, null as any)).toThrow('byteChanges must exist')
  })
})

describe('parseByteChanges', () => {
  it('parses standard git numstat output', () => {
    const gitOutput = `10\t5\tsrc/index.ts
20\t0\tsrc/utils.js
15\t10\ttest/app.test.ts`
    
    const result = parseByteChanges(gitOutput)
    
    expect(result.totalBytesAdded).toBe(2250) // (10+20+15) * 50
    expect(result.totalBytesDeleted).toBe(750) // (5+0+10) * 50
    expect(result.fileChanges['src/index.ts']).toEqual({ bytesAdded: 500, bytesDeleted: 250 })
    expect(result.fileChanges['src/utils.js']).toEqual({ bytesAdded: 1000, bytesDeleted: 0 })
    expect(result.fileChanges['test/app.test.ts']).toEqual({ bytesAdded: 750, bytesDeleted: 500 })
  })

  it('handles empty output', () => {
    const result = parseByteChanges('')
    
    expect(result.totalBytesAdded).toBe(0)
    expect(result.totalBytesDeleted).toBe(0)
    expect(Object.keys(result.fileChanges)).toHaveLength(0)
  })

  it('handles binary files with - instead of numbers', () => {
    const gitOutput = `-\t-\tassets/logo.png
10\t5\tsrc/app.ts`
    
    const result = parseByteChanges(gitOutput)
    
    // Should skip the binary file and only process the text file
    expect(result.totalBytesAdded).toBe(500)
    expect(result.totalBytesDeleted).toBe(250)
    expect(result.fileChanges['src/app.ts']).toEqual({ bytesAdded: 500, bytesDeleted: 250 })
    expect(result.fileChanges['assets/logo.png']).toBeUndefined()
  })

  it('filters excluded files', () => {
    const gitOutput = `10\t5\tsrc/app.ts
100\t50\tnode_modules/lib.js
1\t0\t.git/config`
    
    const result = parseByteChanges(gitOutput)
    
    // Should only include src/app.ts
    expect(result.totalBytesAdded).toBe(500)
    expect(result.totalBytesDeleted).toBe(250)
    expect(Object.keys(result.fileChanges)).toHaveLength(1)
    expect(result.fileChanges['src/app.ts']).toBeDefined()
  })

  it('handles malformed lines', () => {
    const gitOutput = `10\t5\tsrc/app.ts
invalid line
20\t\tsrc/utils.js
\t10\ttest.js
15\t10\tvalid.js`
    
    const result = parseByteChanges(gitOutput)
    
    // Should process only valid lines
    expect(result.fileChanges['src/app.ts']).toBeDefined()
    expect(result.fileChanges['valid.js']).toBeDefined()
    expect(Object.keys(result.fileChanges)).toHaveLength(2)
  })

  it('handles tabs in filenames', () => {
    const gitOutput = `10\t5\tsrc/file\twith\ttabs.ts`
    
    const result = parseByteChanges(gitOutput)
    
    // Should handle the filename with tabs correctly
    expect(result.fileChanges['src/file\twith\ttabs.ts']).toEqual({ bytesAdded: 500, bytesDeleted: 250 })
  })

  it('throws on invalid input type', () => {
    expect(() => parseByteChanges(null as any)).toThrow('gitNumstatOutput must be a string')
    expect(() => parseByteChanges(undefined as any)).toThrow('gitNumstatOutput must be a string')
    expect(() => parseByteChanges(123 as any)).toThrow('gitNumstatOutput must be a string')
  })
})