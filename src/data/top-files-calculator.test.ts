import { describe, it, expect } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import { getTopFilesBySize, getTopFilesByChurn, getTopFilesStats } from './top-files-calculator.js'
import { createTestCommit } from '../test/builders.js'
import type { AnalysisContext } from '../report/generator.js'

describe('top-files-calculator', () => {
  describe('getTopFilesBySize', () => {
    it('should return empty array for empty commits', () => {
      const result = getTopFilesBySize([])
      expect(result).toEqual([])
    })

    it('should calculate file sizes correctly', () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 100, linesDeleted: 20, fileType: 'ts' },
            { fileName: 'file2.ts', linesAdded: 50, linesDeleted: 10, fileType: 'ts' }
          ]
        }),
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 30, linesDeleted: 10, fileType: 'ts' },
            { fileName: 'file3.ts', linesAdded: 200, linesDeleted: 0, fileType: 'ts' }
          ]
        })
      ]

      const result = getTopFilesBySize(commits)
      
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        fileName: 'file3.ts',
        value: 200,
        percentage: expect.any(Number)
      })
      expect(result[1]).toEqual({
        fileName: 'file1.ts',
        value: 100, // (100-20) + (30-10) = 80 + 20 = 100
        percentage: expect.any(Number)
      })
      expect(result[2]).toEqual({
        fileName: 'file2.ts',
        value: 40, // 50-10 = 40
        percentage: expect.any(Number)
      })
    })

    it('should return top 20 files (all files when less than 20)', () => {
      const commits = [
        createTestCommit({
          filesChanged: Array.from({ length: 10 }, (_, i) => ({
            fileName: `file${i}.ts`,
            linesAdded: (10 - i) * 10,
            linesDeleted: 0,
            fileType: 'ts'
          }))
        })
      ]

      const result = getTopFilesBySize(commits)
      
      expect(result).toHaveLength(10) // All 10 files since less than 20
      expect(result[0]?.fileName).toBe('file0.ts')
      expect(result[9]?.fileName).toBe('file9.ts')
    })

    it('should filter out files with negative or zero size', () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            { fileName: 'deleted.ts', linesAdded: 10, linesDeleted: 50, fileType: 'ts' },
            { fileName: 'unchanged.ts', linesAdded: 20, linesDeleted: 20, fileType: 'ts' },
            { fileName: 'added.ts', linesAdded: 30, linesDeleted: 10, fileType: 'ts' }
          ]
        })
      ]

      const result = getTopFilesBySize(commits)
      
      expect(result).toHaveLength(1)
      expect(result[0]?.fileName).toBe('added.ts')
      expect(result[0]?.value).toBe(20)
    })

    it('should calculate percentages correctly', () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 100, linesDeleted: 0, fileType: 'ts' },
            { fileName: 'file2.ts', linesAdded: 50, linesDeleted: 0, fileType: 'ts' },
            { fileName: 'file3.ts', linesAdded: 50, linesDeleted: 0, fileType: 'ts' }
          ]
        })
      ]

      const result = getTopFilesBySize(commits)
      
      expect(result[0]?.percentage).toBeCloseTo(50, 1) // 100/200 = 50%
      expect(result[1]?.percentage).toBeCloseTo(25, 1) // 50/200 = 25%
      expect(result[2]?.percentage).toBeCloseTo(25, 1) // 50/200 = 25%
    })
  })

  describe('getTopFilesByChurn', () => {
    it('should return empty array for empty commits', () => {
      const result = getTopFilesByChurn([])
      expect(result).toEqual([])
    })

    it('should calculate churn correctly', () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 100, linesDeleted: 50, fileType: 'ts' },
            { fileName: 'file2.ts', linesAdded: 20, linesDeleted: 10, fileType: 'ts' }
          ]
        }),
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 30, linesDeleted: 40, fileType: 'ts' },
            { fileName: 'file3.ts', linesAdded: 200, linesDeleted: 100, fileType: 'ts' }
          ]
        })
      ]

      const result = getTopFilesByChurn(commits)
      
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        fileName: 'file3.ts',
        value: 300, // 200 + 100
        percentage: expect.any(Number)
      })
      expect(result[1]).toEqual({
        fileName: 'file1.ts',
        value: 220, // (100+50) + (30+40) = 150 + 70 = 220
        percentage: expect.any(Number)
      })
      expect(result[2]).toEqual({
        fileName: 'file2.ts',
        value: 30, // 20 + 10
        percentage: expect.any(Number)
      })
    })

    it('should return top 20 files (all files when less than 20)', () => {
      const commits = [
        createTestCommit({
          filesChanged: Array.from({ length: 10 }, (_, i) => ({
            fileName: `file${i}.ts`,
            linesAdded: (10 - i) * 10,
            linesDeleted: (10 - i) * 5,
            fileType: 'ts'
          }))
        })
      ]

      const result = getTopFilesByChurn(commits)
      
      expect(result).toHaveLength(10) // All 10 files since less than 20
      expect(result[0]?.fileName).toBe('file0.ts')
      expect(result[9]?.fileName).toBe('file9.ts')
    })

    it('should calculate percentages correctly', () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 60, linesDeleted: 40, fileType: 'ts' },
            { fileName: 'file2.ts', linesAdded: 30, linesDeleted: 20, fileType: 'ts' },
            { fileName: 'file3.ts', linesAdded: 25, linesDeleted: 25, fileType: 'ts' }
          ]
        })
      ]

      const result = getTopFilesByChurn(commits)
      
      expect(result[0]?.percentage).toBeCloseTo(50, 1) // 100/200 = 50%
      expect(result[1]?.percentage).toBeCloseTo(25, 1) // 50/200 = 25%
      expect(result[2]?.percentage).toBeCloseTo(25, 1) // 50/200 = 25%
    })
  })

  describe('getTopFilesStats', () => {
    it('should return all three categories', async () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            { fileName: 'file1.ts', linesAdded: 100, linesDeleted: 20, fileType: 'ts' },
            { fileName: 'file2.ts', linesAdded: 50, linesDeleted: 30, fileType: 'ts' }
          ]
        })
      ]

      const context: AnalysisContext = {
        repoPath: '/fake/repo',
        repoName: 'fake-repo',
        isLizardInstalled: false,
        currentFiles: new Set<string>(['file1.ts', 'file2.ts']),
        commits,
        config: TEST_CONFIG
      }
      const result = await getTopFilesStats(context)
      
      expect(result).toHaveProperty('largest')
      expect(result).toHaveProperty('mostChurn')
      expect(result).toHaveProperty('mostComplex')
      
      expect(result.largest).toHaveLength(2)
      expect(result.mostChurn).toHaveLength(2)
      expect(result.mostComplex).toEqual([]) // Should be empty when no currentFiles provided
    })

    it('should handle empty commits', async () => {
      const context: AnalysisContext = {
        repoPath: '/fake/repo',
        repoName: 'fake-repo',
        isLizardInstalled: false,
        currentFiles: new Set<string>(),
        commits: [],
        config: TEST_CONFIG
      }
      const result = await getTopFilesStats(context)
      
      expect(result.largest).toEqual([])
      expect(result.mostChurn).toEqual([])
      expect(result.mostComplex).toEqual([])
    })

    it('should calculate different rankings for size vs churn', async () => {
      const commits = [
        createTestCommit({
          filesChanged: [
            // High churn but net negative size
            { fileName: 'refactored.ts', linesAdded: 500, linesDeleted: 600, fileType: 'ts' },
            // Low churn but high size
            { fileName: 'stable.ts', linesAdded: 200, linesDeleted: 0, fileType: 'ts' },
            // Medium both
            { fileName: 'normal.ts', linesAdded: 100, linesDeleted: 50, fileType: 'ts' }
          ]
        })
      ]

      const context: AnalysisContext = {
        repoPath: '/fake/repo',
        repoName: 'fake-repo',
        isLizardInstalled: false,
        currentFiles: new Set<string>(['refactored.ts', 'stable.ts', 'normal.ts']),
        commits,
        config: TEST_CONFIG
      }
      const result = await getTopFilesStats(context)
      
      // Size ranking should exclude negative size file
      expect(result.largest).toHaveLength(2)
      expect(result.largest[0]?.fileName).toBe('stable.ts')
      expect(result.largest[1]?.fileName).toBe('normal.ts')
      
      // Churn ranking should include all files
      expect(result.mostChurn).toHaveLength(3)
      expect(result.mostChurn[0]?.fileName).toBe('refactored.ts')
      expect(result.mostChurn[0]?.value).toBe(1100) // 500 + 600
    })
  })
})
