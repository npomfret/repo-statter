import { describe, it, expect } from 'vitest'
import { ReportBuilderV5 } from '@repo-statter/report-builder'
import { analyzeCommand } from '../commands/analyze.js'

describe('Phase 5 Integration Tests', () => {
  it('should build a report with mock data', async () => {
    const mockAnalysis = {
      repository: {
        name: 'test-repo',
        path: '/test/path',
        remote: 'https://github.com/test/repo',
        totalCommits: 100,
        firstCommitDate: new Date('2020-01-01'),
        lastCommitDate: new Date()
      },
      currentState: {
        contributors: new Map([
          ['alice', { commits: 50 }],
          ['bob', { commits: 30 }]
        ]),
        fileMetrics: new Map([
          ['src/index.ts', { lines: 100 }],
          ['src/utils.ts', { lines: 50 }]
        ]),
        totalLines: 1500,
        fileTypes: new Map([
          ['TypeScript', 1200],
          ['JavaScript', 300]
        ])
      },
      timeSeries: {
        commits: [
          { date: new Date('2020-01-01'), value: 10 },
          { date: new Date('2020-02-01'), value: 20 }
        ],
        linesOfCode: [
          { date: new Date('2020-01-01'), value: 500 },
          { date: new Date('2020-02-01'), value: 1000 }
        ]
      }
    }

    const builder = new ReportBuilderV5()
    const result = await builder.buildReport(mockAnalysis, {
      outputPath: '/tmp/test-report.html',
      theme: 'auto',
      inlineAssets: true,
      minify: false
    })

    expect(result).toBe('/tmp/test-report.html')
  })

  it('should create components correctly', async () => {
    const builder = new ReportBuilderV5()
    
    // Test that the builder can be instantiated
    expect(builder).toBeDefined()
    expect(typeof builder.buildReport).toBe('function')
  })

  it('should have all CLI commands available', () => {
    expect(typeof analyzeCommand).toBe('function')
  })
})