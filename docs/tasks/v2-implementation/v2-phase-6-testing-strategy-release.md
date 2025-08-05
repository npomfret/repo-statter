# Phase 6: Testing Strategy and Release

## Overview
Implement comprehensive testing at all levels, establish performance benchmarks, and prepare for production release. Focus on reliability, performance validation, and smooth deployment.

## Goals
1. Establish comprehensive testing pyramid
2. Create performance benchmarks
3. Set up continuous integration
4. Prepare release documentation
5. Plan migration from V1

## Tasks

### 6.1 Unit Testing Strategy

#### Description
Implement thorough unit tests for all business logic components.

#### Testing Standards
```typescript
// packages/core/src/__tests__/test-utils.ts
import { CommitInfo, FileChange } from '../types/git'

export class TestDataBuilder {
  static createCommit(overrides?: Partial<CommitInfo>): CommitInfo {
    return {
      sha: 'abc123def456',
      author: 'Test Author',
      email: 'test@example.com',
      timestamp: new Date('2024-01-01'),
      message: 'Test commit message',
      stats: {
        filesChanged: 1,
        additions: 10,
        deletions: 5,
        files: [
          {
            path: 'src/index.ts',
            additions: 10,
            deletions: 5,
            status: 'modified'
          }
        ]
      },
      ...overrides
    }
  }
  
  static createFileChange(overrides?: Partial<FileChange>): FileChange {
    return {
      path: 'src/test.ts',
      additions: 5,
      deletions: 2,
      status: 'modified',
      ...overrides
    }
  }
  
  static createCommitSequence(count: number): CommitInfo[] {
    const commits: CommitInfo[] = []
    const baseDate = new Date('2024-01-01')
    
    for (let i = 0; i < count; i++) {
      commits.push(this.createCommit({
        sha: `commit-${i}`,
        timestamp: new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000),
        message: `Commit ${i}`,
        stats: {
          filesChanged: Math.floor(Math.random() * 10) + 1,
          additions: Math.floor(Math.random() * 100),
          deletions: Math.floor(Math.random() * 50),
          files: this.generateRandomFiles()
        }
      }))
    }
    
    return commits
  }
  
  private static generateRandomFiles(): FileChange[] {
    const extensions = ['ts', 'js', 'py', 'java', 'go', 'rs']
    const count = Math.floor(Math.random() * 5) + 1
    const files: FileChange[] = []
    
    for (let i = 0; i < count; i++) {
      const ext = extensions[Math.floor(Math.random() * extensions.length)]
      files.push({
        path: `src/file-${i}.${ext}`,
        additions: Math.floor(Math.random() * 50),
        deletions: Math.floor(Math.random() * 30),
        status: 'modified'
      })
    }
    
    return files
  }
}
```

#### Example Unit Tests
```typescript
// packages/core/src/analysis/__tests__/time-series-builder.test.ts
import { TimeSeriesBuilder } from '../TimeSeriesBuilder'
import { TestDataBuilder } from '../../__tests__/test-utils'

describe('TimeSeriesBuilder', () => {
  let builder: TimeSeriesBuilder
  
  beforeEach(() => {
    builder = new TimeSeriesBuilder()
  })
  
  describe('buildCommitTimeSeries', () => {
    it('should create cumulative commit count series', () => {
      const commits = TestDataBuilder.createCommitSequence(10)
      const series = builder.buildCommitTimeSeries(commits)
      
      expect(series).toHaveLength(10)
      expect(series[0].value).toBe(1)
      expect(series[9].value).toBe(10)
      
      // Should be monotonically increasing
      for (let i = 1; i < series.length; i++) {
        expect(series[i].value).toBeGreaterThan(series[i - 1].value)
      }
    })
    
    it('should handle empty commit list', () => {
      const series = builder.buildCommitTimeSeries([])
      expect(series).toEqual([])
    })
    
    it('should handle commits on same day', () => {
      const sameDay = new Date('2024-01-01')
      const commits = [
        TestDataBuilder.createCommit({ timestamp: sameDay }),
        TestDataBuilder.createCommit({ timestamp: sameDay }),
        TestDataBuilder.createCommit({ timestamp: sameDay })
      ]
      
      const series = builder.buildCommitTimeSeries(commits)
      expect(series).toHaveLength(1)
      expect(series[0].value).toBe(3)
    })
  })
  
  describe('buildLinesOfCodeSeries', () => {
    it('should track cumulative lines over time', () => {
      const commits = [
        TestDataBuilder.createCommit({
          stats: {
            filesChanged: 1,
            additions: 100,
            deletions: 0,
            files: [{ path: 'a.ts', additions: 100, deletions: 0, status: 'added' }]
          }
        }),
        TestDataBuilder.createCommit({
          stats: {
            filesChanged: 1,
            additions: 50,
            deletions: 20,
            files: [{ path: 'a.ts', additions: 50, deletions: 20, status: 'modified' }]
          }
        })
      ]
      
      const series = builder.buildLinesOfCodeSeries(commits)
      
      expect(series[0].value).toBe(100) // Initial: +100
      expect(series[1].value).toBe(130) // After: +50 -20 = +30
    })
    
    it('should never go negative', () => {
      const commits = [
        TestDataBuilder.createCommit({
          stats: {
            filesChanged: 1,
            additions: 10,
            deletions: 100, // More deletions than additions
            files: []
          }
        })
      ]
      
      const series = builder.buildLinesOfCodeSeries(commits)
      expect(series[0].value).toBe(0) // Should clamp to 0
    })
  })
})
```

### 6.2 Integration Testing

#### Description
Test interaction between different layers and packages.

#### packages/tests/integration/analysis-pipeline.test.ts
```typescript
import { GitStreamReader } from '@repo-statter/core/git'
import { AnalysisOrchestrator } from '@repo-statter/core/analysis'
import { ReportBuilder } from '@repo-statter/report-builder'
import { createTestRepository } from '../fixtures/test-repo-builder'

describe('Analysis Pipeline Integration', () => {
  let testRepoPath: string
  
  beforeEach(async () => {
    // Create a test repository with known structure
    testRepoPath = await createTestRepository({
      commits: [
        {
          message: 'Initial commit',
          files: [
            { path: 'README.md', content: '# Test Repo' },
            { path: 'src/index.js', content: 'console.log("Hello")' }
          ]
        },
        {
          message: 'Add TypeScript',
          files: [
            { path: 'src/index.ts', content: 'console.log("Hello TS")' },
            { path: 'tsconfig.json', content: '{}' }
          ]
        },
        {
          message: 'Add tests',
          files: [
            { path: 'src/index.test.ts', content: 'test("works", () => {})' }
          ]
        }
      ]
    })
  })
  
  it('should process repository end-to-end', async () => {
    // 1. Stream commits
    const reader = new GitStreamReader()
    const commits: CommitInfo[] = []
    
    for await (const commit of reader.streamCommits(testRepoPath)) {
      commits.push(commit)
    }
    
    expect(commits).toHaveLength(3)
    
    // 2. Analyze data
    const orchestrator = new AnalysisOrchestrator()
    const analysis = await orchestrator.analyze(commits, testRepoPath)
    
    expect(analysis.repository.totalCommits).toBe(3)
    expect(analysis.currentState.fileTypes.get('ts')).toBe(2)
    expect(analysis.currentState.fileTypes.get('js')).toBe(1)
    
    // 3. Generate report
    const builder = new ReportBuilder()
    const reportPath = await builder.buildReport(analysis, {
      outputPath: join(testRepoPath, 'report.html'),
      theme: 'light'
    })
    
    const html = await readFile(reportPath, 'utf-8')
    expect(html).toContain('Test Repo')
    expect(html).toContain('3') // Total commits
  })
  
  it('should handle large repository efficiently', async () => {
    // Create large test repo
    const largeRepo = await createTestRepository({
      commits: Array.from({ length: 1000 }, (_, i) => ({
        message: `Commit ${i}`,
        files: [
          { 
            path: `src/file-${i}.ts`, 
            content: `export const value${i} = ${i};` 
          }
        ]
      }))
    })
    
    const startMemory = process.memoryUsage().heapUsed
    const startTime = performance.now()
    
    // Process repository
    const reader = new GitStreamReader()
    let commitCount = 0
    
    for await (const commit of reader.streamCommits(largeRepo)) {
      commitCount++
      
      // Memory should not grow linearly with commits
      const currentMemory = process.memoryUsage().heapUsed
      const memoryGrowth = currentMemory - startMemory
      
      // Allow some growth but not linear
      expect(memoryGrowth).toBeLessThan(commitCount * 1000) // < 1KB per commit
    }
    
    const duration = performance.now() - startTime
    
    expect(commitCount).toBe(1000)
    expect(duration).toBeLessThan(10000) // < 10 seconds
  })
})
```

### 6.3 End-to-End Testing

#### Description
Test complete user workflows using Playwright.

#### apps/e2e/tests/report-generation.spec.ts
```typescript
import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

test.describe('Report Generation E2E', () => {
  test('should generate interactive report', async ({ page }) => {
    // Generate report
    const tempDir = await mkdtemp(join(tmpdir(), 'e2e-test-'))
    const reportPath = join(tempDir, 'report.html')
    
    await execAsync(
      `repo-statter analyze ./test-fixtures/sample-repo --output ${reportPath}`
    )
    
    // Open report
    await page.goto(`file://${reportPath}`)
    
    // Check basic structure
    await expect(page.locator('h1')).toContainText('sample-repo')
    await expect(page.locator('.metric-card')).toHaveCount(4)
    
    // Test time slider interaction
    const slider = page.locator('.time-range-slider')
    await expect(slider).toBeVisible()
    
    // Click 1 month preset
    await page.click('[data-range="1m"]')
    
    // Charts should update
    await page.waitForFunction(() => {
      const chart = document.querySelector('.growth-chart')
      return chart?.getAttribute('data-filtered') === 'true'
    })
    
    // Test chart toggle
    await page.click('[data-value="by-commit"]')
    await expect(page.locator('.growth-chart')).toHaveAttribute('data-view', 'by-commit')
    
    // Test file table tabs
    await page.click('[data-tab="churn"]')
    await expect(page.locator('#panel-churn')).toBeVisible()
    await expect(page.locator('#panel-largest')).toBeHidden()
    
    // Test theme toggle
    await page.click('.theme-toggle')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
  
  test('should handle large repositories', async ({ page }) => {
    const reportPath = './test-fixtures/large-repo-report.html'
    
    // Pre-generated large report
    await page.goto(`file://${reportPath}`)
    
    // Should load quickly
    const loadTime = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart)
    expect(loadTime).toBeLessThan(3000) // 3 seconds
    
    // Charts should render
    await expect(page.locator('.apexcharts-canvas')).toHaveCount(4)
    
    // Should be responsive
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone size
    await expect(page.locator('.chart-grid')).toHaveCSS('grid-template-columns', /1fr/)
  })
})
```

### 6.4 Performance Testing

#### Description
Establish and validate performance benchmarks.

#### packages/tests/performance/benchmark.ts
```typescript
import { performance } from 'perf_hooks'
import { GitStreamReader } from '@repo-statter/core'
import { createLargeTestRepository } from '../fixtures/large-repo-builder'

interface BenchmarkResult {
  name: string
  duration: number
  memory: number
  throughput: number
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = []
  
  async runAllBenchmarks(): Promise<void> {
    console.log('Running performance benchmarks...\n')
    
    await this.benchmarkGitStreaming()
    await this.benchmarkAnalysis()
    await this.benchmarkReportGeneration()
    await this.benchmarkMemoryUsage()
    
    this.printResults()
  }
  
  private async benchmarkGitStreaming(): Promise<void> {
    const sizes = [100, 1000, 10000, 100000]
    
    for (const size of sizes) {
      const repoPath = await createLargeTestRepository(size)
      
      const start = performance.now()
      const startMemory = process.memoryUsage().heapUsed
      
      const reader = new GitStreamReader()
      let count = 0
      
      for await (const commit of reader.streamCommits(repoPath)) {
        count++
      }
      
      const duration = performance.now() - start
      const memoryUsed = process.memoryUsage().heapUsed - startMemory
      
      this.results.push({
        name: `Git Streaming (${size} commits)`,
        duration,
        memory: memoryUsed,
        throughput: size / (duration / 1000) // commits per second
      })
    }
  }
  
  private async benchmarkAnalysis(): Promise<void> {
    const testCases = [
      { files: 100, commits: 1000 },
      { files: 1000, commits: 10000 },
      { files: 10000, commits: 50000 }
    ]
    
    for (const testCase of testCases) {
      const repoPath = await createLargeTestRepository(
        testCase.commits,
        testCase.files
      )
      
      const start = performance.now()
      const startMemory = process.memoryUsage().heapUsed
      
      // Run full analysis
      const analyzer = new RepositoryAnalyzer()
      await analyzer.analyze(repoPath)
      
      const duration = performance.now() - start
      const memoryUsed = process.memoryUsage().heapUsed - startMemory
      
      this.results.push({
        name: `Analysis (${testCase.files} files, ${testCase.commits} commits)`,
        duration,
        memory: memoryUsed,
        throughput: testCase.commits / (duration / 1000)
      })
    }
  }
  
  private async benchmarkReportGeneration(): Promise<void> {
    const dataSizes = [
      { name: 'Small', commits: 100, series: 100 },
      { name: 'Medium', commits: 1000, series: 365 },
      { name: 'Large', commits: 10000, series: 1000 },
      { name: 'Extra Large', commits: 100000, series: 3650 }
    ]
    
    for (const size of dataSizes) {
      const analysisData = generateMockAnalysis(size)
      
      const start = performance.now()
      const startMemory = process.memoryUsage().heapUsed
      
      const builder = new ReportBuilder()
      await builder.buildReport(analysisData, {
        outputPath: `/tmp/report-${size.name}.html`,
        inlineAssets: true
      })
      
      const duration = performance.now() - start
      const memoryUsed = process.memoryUsage().heapUsed - startMemory
      
      this.results.push({
        name: `Report Generation (${size.name})`,
        duration,
        memory: memoryUsed,
        throughput: size.series / (duration / 1000) // data points per second
      })
    }
  }
  
  private async benchmarkMemoryUsage(): Promise<void> {
    // Test memory usage under sustained load
    const repoPath = await createLargeTestRepository(50000)
    
    const samples: number[] = []
    const interval = setInterval(() => {
      samples.push(process.memoryUsage().heapUsed)
    }, 100)
    
    // Process repository
    const analyzer = new RepositoryAnalyzer()
    await analyzer.analyze(repoPath)
    
    clearInterval(interval)
    
    const maxMemory = Math.max(...samples)
    const avgMemory = samples.reduce((a, b) => a + b, 0) / samples.length
    
    this.results.push({
      name: 'Memory Usage (50k commits)',
      duration: 0,
      memory: maxMemory,
      throughput: avgMemory / (1024 * 1024) // Average MB
    })
  }
  
  private printResults(): void {
    console.log('\n=== Performance Benchmark Results ===\n')
    
    const table = this.results.map(r => ({
      Test: r.name,
      Duration: `${(r.duration / 1000).toFixed(2)}s`,
      Memory: `${(r.memory / 1024 / 1024).toFixed(2)} MB`,
      Throughput: r.throughput.toFixed(0) + '/s'
    }))
    
    console.table(table)
    
    // Check against targets
    console.log('\n=== Performance Targets ===')
    console.log('✓ 100k commits < 60s:', this.checkTarget('Git Streaming (100000 commits)', 60000))
    console.log('✓ Memory < 256MB:', this.checkMemoryTarget(256))
    console.log('✓ Report generation < 5s:', this.checkTarget('Report Generation (Large)', 5000))
  }
  
  private checkTarget(name: string, maxDuration: number): boolean {
    const result = this.results.find(r => r.name === name)
    return result ? result.duration < maxDuration : false
  }
  
  private checkMemoryTarget(maxMB: number): boolean {
    const maxMemory = Math.max(...this.results.map(r => r.memory))
    return maxMemory < maxMB * 1024 * 1024
  }
}

// Run benchmarks
if (require.main === module) {
  const benchmark = new PerformanceBenchmark()
  benchmark.runAllBenchmarks().catch(console.error)
}
```

### 6.5 Visual Regression Testing

#### Description
Ensure charts and components render consistently.

#### apps/e2e/tests/visual-regression.spec.ts
```typescript
import { test, expect } from '@playwright/test'
import { ComponentRegistry } from '@repo-statter/visualizations'

test.describe('Visual Regression Tests', () => {
  // Test each component in isolation
  const components = [
    { name: 'growth-chart', data: 'growth-data.json' },
    { name: 'file-types-pie', data: 'pie-data.json' },
    { name: 'contributor-bars', data: 'contributor-data.json' },
    { name: 'time-slider', data: 'time-data.json' },
    { name: 'metric-card', data: 'metric-data.json' }
  ]
  
  for (const component of components) {
    test(`${component.name} should match snapshot`, async ({ page }) => {
      await page.goto(`/playground?component=${component.name}&data=${component.data}`)
      await page.waitForSelector(`[data-component="${component.name}"]`)
      
      // Wait for animations to complete
      await page.waitForTimeout(500)
      
      const element = page.locator(`[data-component="${component.name}"]`)
      await expect(element).toHaveScreenshot(`${component.name}.png`, {
        animations: 'disabled',
        mask: [page.locator('.timestamp')] // Mask dynamic content
      })
    })
  }
  
  test('full report should match snapshot', async ({ page }) => {
    await page.goto('/test-fixtures/golden-report.html')
    
    // Test different viewport sizes
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(200) // Let layout settle
      
      await expect(page).toHaveScreenshot(`report-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled'
      })
    }
  })
  
  test('dark theme should match snapshot', async ({ page }) => {
    await page.goto('/test-fixtures/golden-report.html')
    
    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    
    await expect(page).toHaveScreenshot('report-dark-theme.png', {
      fullPage: true
    })
  })
})
```

### 6.6 Continuous Integration Setup

#### Description
Configure GitHub Actions for automated testing and releases.

#### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck

  test:
    name: Test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
    
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit
      - run: pnpm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      
      - name: Install Playwright
        run: pnpm playwright install --with-deps
      
      - name: Run E2E tests
        run: pnpm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  visual-regression:
    name: Visual Regression
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      
      - name: Run visual tests
        run: pnpm run test:visual
      
      - name: Upload snapshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-regression-diff
          path: apps/e2e/test-results/

  performance:
    name: Performance
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      
      - name: Run benchmarks
        run: pnpm run test:performance
      
      - name: Store benchmark result
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'customBiggerIsBetter'
          output-file-path: benchmark-results.json
          github-token: ${{ secrets.GITHUB_TOKEN }}
          auto-push: true

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      
      - name: Check bundle size
        run: pnpm run size
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            packages/*/dist/
            apps/*/dist/
```

### 6.7 Release Process

#### Description
Automate releases with semantic versioning and changelog generation.

#### .github/workflows/release.yml
```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      
      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm run release
          version: pnpm run version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub Release
        if: steps.changesets.outputs.published == 'true'
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.changesets.outputs.publishedPackages[0].version }}
          release_name: v${{ steps.changesets.outputs.publishedPackages[0].version }}
          body: |
            ## What's Changed
            
            See [CHANGELOG.md](https://github.com/${{ github.repository }}/blob/main/CHANGELOG.md) for details.
            
            ## Installation
            
            ```bash
            npm install -g repo-statter@${{ steps.changesets.outputs.publishedPackages[0].version }}
            ```
          draft: false
          prerelease: false
```

### 6.8 Migration Guide

#### Description
Help users migrate from V1 to V2.

#### docs/MIGRATION.md
```markdown
# Migration Guide: V1 to V2

## Overview

Repo-Statter V2 is a complete rewrite focusing on performance, reliability, and maintainability. While the core functionality remains the same, the architecture and some features have changed.

## Breaking Changes

### CLI Changes

#### Command Structure
```bash
# V1
repo-statter generate ./my-repo

# V2  
repo-statter analyze ./my-repo
```

#### Options
- `--output-file` → `--output`
- `--skip-cache` → `--no-cache`
- `--config-file` → `--config`

### Configuration Changes

#### File Format
V2 uses a more structured configuration:

```javascript
// V1: .repo-statter.config.js
module.exports = {
  outputFile: 'report.html',
  excludePatterns: ['node_modules', 'dist'],
  maxCommits: 10000
}

// V2: .repo-statter.json
{
  "output": "report.html",
  "filters": {
    "exclude": ["node_modules", "dist"]
  },
  "maxCommits": 10000
}
```

### Output Changes

#### Report Structure
- New responsive design
- Server-side rendered charts (better performance)
- Dark mode support
- Enhanced interactivity

#### Data Format
The JSON output structure has changed:

```javascript
// V1
{
  stats: { commits: 1000, contributors: 10 },
  charts: { ... }
}

// V2
{
  repository: { totalCommits: 1000, ... },
  timeSeries: { ... },
  currentState: { contributors: Map, ... }
}
```

## Migration Steps

### 1. Install V2

```bash
npm install -g repo-statter@2
```

### 2. Update Configuration

Convert your configuration file to the new format:

```bash
repo-statter migrate-config .repo-statter.config.js
```

### 3. Update Scripts

If you have scripts using the CLI:

```bash
# Before
repo-statter generate ./repo --output-file custom.html

# After
repo-statter analyze ./repo --output custom.html
```

### 4. Handle Cache

V2 uses a different cache format. Clear old cache:

```bash
repo-statter cache --clear
```

## Feature Comparison

| Feature | V1 | V2 |
|---------|----|----|
| Large repo support | Limited (memory issues) | ✓ Streaming architecture |
| Progress tracking | Estimated | ✓ Real percentages |
| Theme support | Light only | ✓ Light/Dark/Auto |
| Browser testing | Basic | ✓ Component playground |
| Error messages | Generic | ✓ Detailed & actionable |
| Performance | Slow for large repos | ✓ 10x faster |

## New Features in V2

### Performance Improvements
- Streaming git operations (no memory limits)
- Smart caching with incremental updates
- Parallel processing where applicable

### Better Testing
- Each component can be tested in isolation
- Visual regression testing
- Performance benchmarks

### Enhanced Reports
- Real-time filtering with time slider
- Multiple chart views (by date/by commit)
- Accessibility improvements
- Mobile responsive design

## Common Issues

### Issue: Old cache interfering
**Solution**: Clear cache with `repo-statter cache --clear`

### Issue: Configuration not recognized
**Solution**: Ensure using new format (.repo-statter.json)

### Issue: Different output format
**Solution**: Use `--json` flag to get raw data for processing

## Getting Help

- GitHub Issues: https://github.com/user/repo-statter/issues
- Documentation: https://repo-statter.dev/docs
- Migration examples: https://repo-statter.dev/examples/migration
```

### 6.9 Documentation

#### Description
Comprehensive user and developer documentation.

#### docs/README.md
```markdown
# Repo-Statter Documentation

## Quick Start

```bash
# Install
npm install -g repo-statter

# Analyze current directory
repo-statter analyze

# Analyze specific repository
repo-statter analyze /path/to/repo --output my-report.html

# With configuration
repo-statter analyze --config .repo-statter.json
```

## Table of Contents

1. [Installation](./installation.md)
2. [Configuration](./configuration.md)
3. [CLI Reference](./cli-reference.md)
4. [Understanding Reports](./reports.md)
5. [Performance Tips](./performance.md)
6. [Troubleshooting](./troubleshooting.md)
7. [API Reference](./api-reference.md)
8. [Contributing](./contributing.md)

## Features

### 📊 Comprehensive Analysis
- Repository growth over time
- Code distribution by file type
- Contributor statistics
- File complexity analysis
- Commit patterns

### 🚀 Performance
- Stream processing for unlimited repository size
- Smart caching for faster re-runs
- Memory-efficient architecture
- Real progress tracking

### 🎨 Beautiful Reports
- Interactive charts and visualizations
- Dark/light theme support
- Mobile responsive design
- Accessible HTML output
- Export to various formats

### 🧪 Reliability
- Comprehensive test coverage
- Visual regression testing
- Performance benchmarks
- Cross-platform support

## Configuration

Create a `.repo-statter.json` file:

```json
{
  "output": "docs/repo-analysis.html",
  "theme": "auto",
  "maxCommits": 50000,
  "filters": {
    "exclude": [
      "node_modules/**",
      "dist/**",
      "*.min.js"
    ]
  },
  "visualization": {
    "charts": ["growth", "fileTypes", "contributors", "activity"],
    "colors": {
      "primary": "#0066cc",
      "secondary": "#28a745"
    }
  }
}
```

## Examples

### Basic Usage
```bash
repo-statter analyze
```

### Custom Output
```bash
repo-statter analyze --output reports/analysis.html --theme dark
```

### Filtered Analysis
```bash
repo-statter analyze --exclude "test/**" --include "src/**"
```

### Limited Scope
```bash
repo-statter analyze --max-commits 1000
```

## Performance Tips

1. **Use Caching**: Caching is enabled by default and significantly speeds up re-runs
2. **Filter Files**: Exclude generated files and dependencies
3. **Limit Commits**: For initial exploration, use `--max-commits`
4. **Streaming Mode**: Handles any repository size without memory issues

## Troubleshooting

### Not a Git Repository
Ensure you're running the command inside a git repository or provide a path to one.

### Permission Denied
Some git operations may require appropriate permissions. Ensure you have read access to the repository.

### Out of Memory (V1 only)
This issue is resolved in V2 with streaming architecture. Consider upgrading.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.
```

## Testing Checklist

### Unit Tests
- [ ] Core business logic 100% coverage
- [ ] Edge cases handled
- [ ] Error scenarios tested
- [ ] Mock external dependencies

### Integration Tests
- [ ] Package interactions verified
- [ ] Data flow validated
- [ ] Configuration loading tested
- [ ] Cache behavior verified

### E2E Tests
- [ ] Complete user workflows
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Accessibility compliance

### Performance Tests
- [ ] Benchmark targets met
- [ ] Memory limits respected
- [ ] Large repository handling
- [ ] Concurrent operation safety

### Visual Tests
- [ ] Component snapshots stable
- [ ] Theme variations captured
- [ ] Responsive layouts verified
- [ ] Animation states tested

## Release Checklist

### Pre-release
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Migration guide complete
- [ ] Performance benchmarks acceptable

### Release Process
- [ ] Version bump via changesets
- [ ] GitHub release created
- [ ] NPM package published
- [ ] Docker image built
- [ ] Documentation site updated

### Post-release
- [ ] Announcement prepared
- [ ] Social media updates
- [ ] Migration support ready
- [ ] Issue templates updated
- [ ] Roadmap updated

## Success Criteria

- [ ] 90%+ test coverage across all packages
- [ ] E2E tests pass on all platforms
- [ ] Performance targets achieved
- [ ] Zero high-severity bugs
- [ ] Documentation complete and accurate
- [ ] Smooth migration path from V1

## Conclusion

With comprehensive testing and a robust release process, Repo-Statter V2 is ready for production use. The testing pyramid ensures reliability at all levels, while automated CI/CD enables confident releases.