# Phase 5: Report Generation and CLI

## Overview
Assemble visualization components into complete HTML reports and create a robust CLI interface. Focus on performance, real progress tracking, and excellent error handling.

## Goals
1. Build HTML report generator with template system
2. Create CLI with real progress tracking
3. Implement configuration management
4. Add performance optimizations
5. Ensure graceful error handling

## Tasks

### 5.1 Report Template System

#### Description
Create a flexible template system for assembling components into complete reports.

#### packages/report-builder/src/templates/ReportTemplate.ts
```typescript
export interface TemplateData {
  repository: {
    name: string
    path: string
    url?: string
    analyzedAt: Date
  }
  metrics: Record<string, any>
  charts: Record<string, string> // Pre-rendered HTML
  assets: {
    styles: string
    scripts: string
    icons: Record<string, string>
  }
}

export abstract class ReportTemplate {
  constructor(
    protected data: TemplateData,
    protected options: {
      minify?: boolean
      inlineAssets?: boolean
      theme?: 'light' | 'dark' | 'auto'
    } = {}
  ) {}
  
  abstract render(): string
  
  protected renderHead(): string {
    return `
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.data.repository.name} - Repository Analysis</title>
        <meta name="generator" content="repo-statter v2">
        <meta name="generated-at" content="${this.data.repository.analyzedAt.toISOString()}">
        ${this.renderStyles()}
        ${this.renderThemeScript()}
      </head>
    `
  }
  
  protected renderStyles(): string {
    if (this.options.inlineAssets) {
      return `<style>${this.data.assets.styles}</style>`
    }
    return '<link rel="stylesheet" href="assets/styles.css">'
  }
  
  protected renderThemeScript(): string {
    if (this.options.theme === 'auto') {
      return `
        <script>
          // Apply theme before render to prevent flash
          const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          document.documentElement.setAttribute('data-theme', theme)
        </script>
      `
    }
    return ''
  }
  
  protected renderMetricCards(metrics: string[]): string {
    return metrics.map(key => 
      this.data.charts[`metric-${key}`] || ''
    ).join('\n')
  }
  
  protected renderChart(chartId: string): string {
    return this.data.charts[chartId] || `<!-- Chart ${chartId} not found -->`
  }
  
  protected minifyHTML(html: string): string {
    if (!this.options.minify) return html
    
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
```

#### packages/report-builder/src/templates/DefaultTemplate.ts
```typescript
export class DefaultTemplate extends ReportTemplate {
  render(): string {
    const html = `
<!DOCTYPE html>
<html lang="en" ${this.options.theme ? `data-theme="${this.options.theme}"` : ''}>
${this.renderHead()}
<body>
  <header class="report-header">
    <div class="header-content">
      <h1>${this.data.repository.name}</h1>
      <div class="header-meta">
        <span class="repo-path">${this.data.repository.path}</span>
        ${this.data.repository.url ? `
          <a href="${this.data.repository.url}" class="repo-link" target="_blank" rel="noopener">
            View on GitHub
          </a>
        ` : ''}
      </div>
    </div>
    <div class="header-actions">
      ${this.renderChart('theme-toggle')}
      <button class="export-button" aria-label="Export data">
        ${this.data.assets.icons.download}
      </button>
    </div>
  </header>

  <main class="report-content">
    <section class="metrics-section">
      <h2 class="section-title">Overview</h2>
      <div class="metrics-grid">
        ${this.renderMetricCards(['commits', 'contributors', 'files', 'lines'])}
      </div>
    </section>

    <section class="time-controls">
      ${this.renderChart('time-slider')}
      ${this.renderChart('chart-toggle')}
    </section>

    <section class="charts-section">
      <div class="chart-grid">
        <div class="chart-container full-width">
          <h3>Repository Growth</h3>
          ${this.renderChart('growth-chart')}
        </div>
        
        <div class="chart-container half-width">
          <h3>Code Distribution</h3>
          ${this.renderChart('file-types-pie')}
        </div>
        
        <div class="chart-container half-width">
          <h3>Top Contributors</h3>
          ${this.renderChart('contributor-bars')}
        </div>
        
        <div class="chart-container full-width">
          <h3>File Activity Heatmap</h3>
          ${this.renderChart('activity-heatmap')}
        </div>
      </div>
    </section>

    <section class="tables-section">
      <h2 class="section-title">File Analysis</h2>
      ${this.renderChart('top-files-table')}
    </section>

    <section class="insights-section">
      <h2 class="section-title">Insights</h2>
      <div class="insights-grid">
        ${this.renderChart('contributor-awards')}
        ${this.renderChart('commit-patterns')}
        ${this.renderChart('code-evolution')}
      </div>
    </section>
  </main>

  <footer class="report-footer">
    <p>Generated by <a href="https://github.com/user/repo-statter">repo-statter</a> on ${this.data.repository.analyzedAt.toLocaleString()}</p>
  </footer>

  ${this.renderScripts()}
</body>
</html>
    `
    
    return this.minifyHTML(html)
  }
  
  private renderScripts(): string {
    if (this.options.inlineAssets) {
      return `<script>${this.data.assets.scripts}</script>`
    }
    return '<script src="assets/scripts.js" defer></script>'
  }
}
```

### 5.2 Report Builder Orchestration

#### Description
Orchestrate component rendering and report assembly.

#### packages/report-builder/src/ReportBuilder.ts
```typescript
import { AnalysisResult } from '@repo-statter/core'
import { ComponentRegistry } from '@repo-statter/visualizations'
import { DefaultTemplate } from './templates/DefaultTemplate'
import { AssetBundler } from './AssetBundler'
import { Logger } from '@repo-statter/core'

export interface ReportOptions {
  template?: 'default' | 'minimal' | 'detailed'
  outputPath: string
  theme?: 'light' | 'dark' | 'auto'
  inlineAssets?: boolean
  minify?: boolean
  includeSourceData?: boolean
}

export class ReportBuilder {
  private logger = new Logger('ReportBuilder')
  private assetBundler = new AssetBundler()
  
  async buildReport(
    analysis: AnalysisResult,
    options: ReportOptions
  ): Promise<string> {
    this.logger.info('Building report', { 
      repository: analysis.repository.name,
      template: options.template
    })
    
    try {
      // 1. Prepare component data
      const componentData = this.prepareComponentData(analysis)
      
      // 2. Render all components
      const renderedCharts = await this.renderComponents(componentData)
      
      // 3. Bundle assets
      const assets = await this.assetBundler.bundle({
        inlineAssets: options.inlineAssets,
        theme: options.theme
      })
      
      // 4. Prepare template data
      const templateData: TemplateData = {
        repository: {
          name: analysis.repository.name,
          path: analysis.repository.path,
          url: analysis.repository.remote,
          analyzedAt: new Date()
        },
        metrics: this.extractMetrics(analysis),
        charts: renderedCharts,
        assets
      }
      
      // 5. Render template
      const Template = this.getTemplate(options.template)
      const template = new Template(templateData, {
        minify: options.minify,
        inlineAssets: options.inlineAssets,
        theme: options.theme
      })
      
      const html = template.render()
      
      // 6. Save report
      await this.saveReport(html, options.outputPath)
      
      // 7. Optionally save source data
      if (options.includeSourceData) {
        await this.saveSourceData(analysis, options.outputPath)
      }
      
      this.logger.info('Report built successfully', {
        size: html.length,
        path: options.outputPath
      })
      
      return options.outputPath
    } catch (error) {
      this.logger.error('Failed to build report', error as Error)
      throw error
    }
  }
  
  private prepareComponentData(analysis: AnalysisResult): Record<string, any> {
    return {
      // Metric cards
      'metric-commits': {
        type: 'metric-card',
        data: {
          label: 'Total Commits',
          value: analysis.repository.totalCommits,
          icon: 'commits',
          trend: this.calculateTrend(analysis, 'commits')
        }
      },
      
      // Growth chart
      'growth-chart': {
        type: 'growth-chart',
        data: {
          series: [
            {
              name: 'Commits',
              data: analysis.timeSeries.commits.map(p => ({
                x: p.date.getTime(),
                y: p.value
              }))
            },
            {
              name: 'Lines of Code',
              data: analysis.timeSeries.linesOfCode.map(p => ({
                x: p.date.getTime(),
                y: p.value
              }))
            }
          ]
        }
      },
      
      // File types pie
      'file-types-pie': {
        type: 'file-types-pie',
        data: {
          series: Array.from(analysis.currentState.fileTypes.values()),
          labels: Array.from(analysis.currentState.fileTypes.keys())
        }
      },
      
      // Time slider
      'time-slider': {
        type: 'time-slider',
        data: {
          min: analysis.repository.firstCommitDate,
          max: analysis.repository.lastCommitDate,
          current: {
            start: analysis.repository.firstCommitDate,
            end: analysis.repository.lastCommitDate
          }
        }
      },
      
      // Top files table
      'top-files-table': {
        type: 'top-files-table',
        data: {
          tabs: [
            {
              id: 'largest',
              label: 'Largest Files',
              files: this.getTopFilesBySize(analysis)
            },
            {
              id: 'churn',
              label: 'Most Changed',
              files: this.getTopFilesByChurn(analysis)
            },
            {
              id: 'complex',
              label: 'Most Complex',
              files: this.getTopFilesByComplexity(analysis)
            }
          ]
        }
      }
      
      // ... more components
    }
  }
  
  private async renderComponents(
    componentData: Record<string, any>
  ): Promise<Record<string, string>> {
    const rendered: Record<string, string> = {}
    
    for (const [id, config] of Object.entries(componentData)) {
      try {
        const { html } = ComponentRegistry.renderComponent(
          config.type,
          config.data,
          config.options
        )
        rendered[id] = html
      } catch (error) {
        this.logger.error(`Failed to render component ${id}`, error as Error)
        rendered[id] = `<!-- Error rendering ${id} -->`
      }
    }
    
    return rendered
  }
  
  private getTemplate(templateName?: string): typeof DefaultTemplate {
    // Could support multiple templates in the future
    return DefaultTemplate
  }
  
  private async saveReport(html: string, outputPath: string): Promise<void> {
    const { writeFile, mkdir } = await import('fs/promises')
    const { dirname } = await import('path')
    
    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true })
    
    // Write HTML file
    await writeFile(outputPath, html, 'utf-8')
  }
  
  private async saveSourceData(
    analysis: AnalysisResult,
    reportPath: string
  ): Promise<void> {
    const { writeFile } = await import('fs/promises')
    const { join, dirname, basename } = await import('path')
    
    const dataPath = join(
      dirname(reportPath),
      basename(reportPath, '.html') + '-data.json'
    )
    
    await writeFile(
      dataPath,
      JSON.stringify(analysis, null, 2),
      'utf-8'
    )
  }
}
```

### 5.3 CLI Implementation

#### Description
Create the command-line interface with real progress tracking.

#### packages/cli/src/index.ts
```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import { version } from '../package.json'
import { analyzeCommand } from './commands/analyze'
import { Logger } from '@repo-statter/core'

const program = new Command()

program
  .name('repo-statter')
  .description('Analyze git repositories and generate beautiful reports')
  .version(version)

program
  .command('analyze [path]')
  .description('Analyze a git repository')
  .option('-o, --output <path>', 'Output file path', 'repo-analysis.html')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--theme <theme>', 'Report theme (light/dark/auto)', 'auto')
  .option('--no-cache', 'Disable caching')
  .option('--max-commits <number>', 'Maximum commits to analyze')
  .option('--include <pattern>', 'File patterns to include')
  .option('--exclude <pattern>', 'File patterns to exclude')
  .option('--verbose', 'Enable verbose logging')
  .option('--json', 'Also output raw JSON data')
  .action(analyzeCommand)

program
  .command('cache')
  .description('Manage analysis cache')
  .option('--clear', 'Clear all cache')
  .option('--size', 'Show cache size')
  .action(async (options) => {
    const { CacheManager } = await import('@repo-statter/core')
    const cache = new CacheManager()
    
    if (options.clear) {
      await cache.clearCache()
      console.log('Cache cleared')
    } else if (options.size) {
      const size = await cache.getCacheSize()
      console.log(`Cache size: ${(size / 1024 / 1024).toFixed(2)} MB`)
    }
  })

// Parse arguments
program.parse(process.argv)
```

#### packages/cli/src/commands/analyze.ts
```typescript
import { resolve } from 'path'
import { GitOperationError } from '@repo-statter/core'
import { ProgressTracker } from '../progress/ProgressTracker'
import { ConfigLoader } from '../config/ConfigLoader'
import { ReportBuilder } from '@repo-statter/report-builder'

export async function analyzeCommand(
  path: string = '.',
  options: any
): Promise<void> {
  const progress = new ProgressTracker()
  
  try {
    // 1. Load configuration
    progress.start('Loading configuration')
    const config = await ConfigLoader.load(options.config)
    const mergedOptions = { ...config, ...options }
    
    // 2. Initialize core modules
    progress.update('Initializing analyzer')
    const { RepositoryAnalyzer } = await import('@repo-statter/core')
    const analyzer = new RepositoryAnalyzer({
      maxCommits: mergedOptions.maxCommits,
      useCache: mergedOptions.cache !== false,
      filters: {
        include: mergedOptions.include,
        exclude: mergedOptions.exclude
      }
    })
    
    // 3. Analyze repository
    progress.update('Analyzing repository')
    const repoPath = resolve(path)
    
    // Subscribe to analysis progress
    analyzer.on('progress', (event) => {
      progress.update(event.message, {
        current: event.current,
        total: event.total,
        percentage: event.percentage
      })
    })
    
    const analysis = await analyzer.analyze(repoPath)
    
    // 4. Build report
    progress.update('Generating report')
    const builder = new ReportBuilder()
    const outputPath = await builder.buildReport(analysis, {
      outputPath: resolve(mergedOptions.output),
      theme: mergedOptions.theme,
      includeSourceData: mergedOptions.json
    })
    
    // 5. Complete
    progress.complete(`Report generated: ${outputPath}`)
    
    // Show summary
    console.log('\nAnalysis Summary:')
    console.log(`  Repository: ${analysis.repository.name}`)
    console.log(`  Commits: ${analysis.repository.totalCommits}`)
    console.log(`  Contributors: ${analysis.currentState.contributors.size}`)
    console.log(`  Files: ${analysis.currentState.fileMetrics.size}`)
    console.log(`  Total LOC: ${analysis.currentState.totalLines.toLocaleString()}`)
    
  } catch (error) {
    progress.error('Analysis failed')
    
    if (error instanceof GitOperationError) {
      console.error(`\nError: ${error.userMessage}`)
      
      if (mergedOptions.verbose) {
        console.error('\nDetails:', error.message)
        console.error(error.stack)
      }
    } else {
      console.error('\nUnexpected error:', error)
    }
    
    process.exit(1)
  }
}
```

### 5.4 Progress Tracking

#### Description
Implement real, accurate progress tracking.

#### packages/cli/src/progress/ProgressTracker.ts
```typescript
import { SingleBar, Presets } from 'cli-progress'
import chalk from 'chalk'

export interface ProgressInfo {
  current?: number
  total?: number
  percentage?: number
  eta?: number
}

export class ProgressTracker {
  private bar?: SingleBar
  private startTime: number
  private lastUpdate: number
  private currentMessage: string = ''
  
  constructor(
    private options: {
      showBar?: boolean
      showETA?: boolean
      updateInterval?: number
    } = {}
  ) {
    this.startTime = Date.now()
    this.lastUpdate = Date.now()
  }
  
  start(message: string): void {
    this.currentMessage = message
    console.log(chalk.blue('●'), message)
    
    if (this.options.showBar !== false) {
      this.bar = new SingleBar({
        format: '{bar} {percentage}% | {message} | {eta_formatted}',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true
      }, Presets.shades_classic)
    }
  }
  
  update(message: string, info?: ProgressInfo): void {
    const now = Date.now()
    const interval = this.options.updateInterval || 100
    
    // Throttle updates
    if (now - this.lastUpdate < interval && !info?.percentage) {
      return
    }
    
    this.lastUpdate = now
    this.currentMessage = message
    
    if (this.bar && info?.total) {
      if (!this.bar.isActive) {
        this.bar.start(info.total, info.current || 0, {
          message,
          eta_formatted: this.formatETA(info.eta)
        })
      } else {
        this.bar.update(info.current || 0, {
          message,
          eta_formatted: this.formatETA(info.eta)
        })
      }
    } else {
      // Simple spinner for indeterminate progress
      const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
      const index = Math.floor(now / 100) % spinner.length
      
      process.stdout.write(
        `\r${chalk.blue(spinner[index])} ${message}${' '.repeat(50)}`
      )
    }
  }
  
  complete(message?: string): void {
    if (this.bar) {
      this.bar.stop()
    } else {
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
    }
    
    const duration = Date.now() - this.startTime
    console.log(
      chalk.green('✓'),
      message || this.currentMessage,
      chalk.gray(`(${this.formatDuration(duration)})`)
    )
  }
  
  error(message: string): void {
    if (this.bar) {
      this.bar.stop()
    } else {
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
    }
    
    console.log(chalk.red('✗'), message)
  }
  
  private formatETA(eta?: number): string {
    if (!eta || !this.options.showETA) return ''
    
    if (eta < 60) {
      return `${Math.round(eta)}s`
    } else if (eta < 3600) {
      return `${Math.round(eta / 60)}m`
    } else {
      return `${Math.round(eta / 3600)}h`
    }
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
    }
  }
}
```

### 5.5 Configuration Management

#### Description
Handle configuration files and environment variables.

#### packages/cli/src/config/ConfigLoader.ts
```typescript
import { cosmiconfig } from 'cosmiconfig'
import { z } from 'zod'
import { resolve } from 'path'

const ConfigSchema = z.object({
  output: z.string().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  cache: z.boolean().optional(),
  maxCommits: z.number().positive().optional(),
  filters: z.object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional()
  }).optional(),
  visualization: z.object({
    charts: z.array(z.string()).optional(),
    colors: z.record(z.string()).optional()
  }).optional(),
  performance: z.object({
    workerThreads: z.number().optional(),
    chunkSize: z.number().optional()
  }).optional()
})

export type Config = z.infer<typeof ConfigSchema>

export class ConfigLoader {
  private static explorer = cosmiconfig('repo-statter', {
    searchPlaces: [
      '.repo-statter.json',
      '.repo-statter.yaml',
      '.repo-statter.yml',
      '.repo-statterrc',
      '.repo-statterrc.json',
      '.repo-statterrc.yaml',
      '.repo-statterrc.yml',
      'repo-statter.config.js',
      'repo-statter.config.mjs',
      'package.json'
    ]
  })
  
  static async load(configPath?: string): Promise<Config> {
    try {
      let result
      
      if (configPath) {
        // Load specific config file
        result = await this.explorer.load(resolve(configPath))
      } else {
        // Search for config file
        result = await this.explorer.search()
      }
      
      if (!result) {
        return this.loadFromEnv()
      }
      
      // Validate config
      const validated = ConfigSchema.parse(result.config)
      
      // Merge with environment variables
      return this.mergeWithEnv(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid configuration:\n${error.errors
            .map(e => `  - ${e.path.join('.')}: ${e.message}`)
            .join('\n')}`
        )
      }
      throw error
    }
  }
  
  private static loadFromEnv(): Config {
    const config: Config = {}
    
    if (process.env.REPO_STATTER_OUTPUT) {
      config.output = process.env.REPO_STATTER_OUTPUT
    }
    
    if (process.env.REPO_STATTER_THEME) {
      config.theme = process.env.REPO_STATTER_THEME as any
    }
    
    if (process.env.REPO_STATTER_NO_CACHE) {
      config.cache = false
    }
    
    if (process.env.REPO_STATTER_MAX_COMMITS) {
      config.maxCommits = parseInt(process.env.REPO_STATTER_MAX_COMMITS)
    }
    
    return config
  }
  
  private static mergeWithEnv(config: Config): Config {
    const envConfig = this.loadFromEnv()
    
    return {
      ...config,
      ...envConfig,
      filters: {
        ...config.filters,
        ...envConfig.filters
      },
      visualization: {
        ...config.visualization,
        ...envConfig.visualization
      },
      performance: {
        ...config.performance,
        ...envConfig.performance
      }
    }
  }
}
```

### 5.6 Asset Bundler

#### Description
Bundle CSS and JavaScript assets for the report.

#### packages/report-builder/src/AssetBundler.ts
```typescript
import { readFile } from 'fs/promises'
import { join } from 'path'
import postcss from 'postcss'
import cssnano from 'cssnano'
import { minify } from 'terser'

export interface BundleOptions {
  inlineAssets?: boolean
  theme?: 'light' | 'dark' | 'auto'
  customCSS?: string
  customJS?: string
}

export class AssetBundler {
  private assetsDir = join(__dirname, '../assets')
  
  async bundle(options: BundleOptions): Promise<{
    styles: string
    scripts: string
    icons: Record<string, string>
  }> {
    const [styles, scripts, icons] = await Promise.all([
      this.bundleStyles(options),
      this.bundleScripts(options),
      this.loadIcons()
    ])
    
    return { styles, scripts, icons }
  }
  
  private async bundleStyles(options: BundleOptions): Promise<string> {
    // Load base styles
    const baseCSS = await readFile(
      join(this.assetsDir, 'styles/base.css'),
      'utf-8'
    )
    
    // Load theme styles
    const themeCSS = await this.loadThemeStyles(options.theme)
    
    // Load component styles
    const componentCSS = await this.loadComponentStyles()
    
    // Combine all styles
    let combinedCSS = [
      baseCSS,
      themeCSS,
      componentCSS,
      options.customCSS || ''
    ].join('\n')
    
    // Process with PostCSS
    const result = await postcss([
      cssnano({
        preset: ['default', {
          discardComments: { removeAll: true }
        }]
      })
    ]).process(combinedCSS, { from: undefined })
    
    return result.css
  }
  
  private async bundleScripts(options: BundleOptions): Promise<string> {
    // Load core scripts
    const coreJS = await readFile(
      join(this.assetsDir, 'scripts/core.js'),
      'utf-8'
    )
    
    // Load component hydration scripts
    const hydrationJS = await this.loadHydrationScripts()
    
    // Combine scripts
    const combinedJS = [
      '(function() {',
      '"use strict";',
      coreJS,
      hydrationJS,
      options.customJS || '',
      '})();'
    ].join('\n')
    
    // Minify if not inlining (inlined scripts are already small)
    if (!options.inlineAssets) {
      const result = await minify(combinedJS, {
        compress: {
          drop_console: true,
          passes: 2
        },
        mangle: true
      })
      
      return result.code || combinedJS
    }
    
    return combinedJS
  }
  
  private async loadThemeStyles(theme?: string): Promise<string> {
    const themes = {
      light: `
        :root {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --text-primary: #212529;
          --text-secondary: #6c757d;
          --border-color: #dee2e6;
          --accent-color: #0066cc;
        }
      `,
      dark: `
        :root {
          --bg-primary: #1a1a1a;
          --bg-secondary: #2d2d2d;
          --text-primary: #ffffff;
          --text-secondary: #a0a0a0;
          --border-color: #404040;
          --accent-color: #4db8ff;
        }
      `,
      auto: `
        ${themes.light}
        
        @media (prefers-color-scheme: dark) {
          ${themes.dark}
        }
        
        [data-theme="dark"] {
          ${themes.dark}
        }
      `
    }
    
    return themes[theme || 'auto'] || themes.auto
  }
  
  private async loadComponentStyles(): Promise<string> {
    // In production, these would be loaded from actual component packages
    return `
      /* Chart containers */
      .chart-container {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }
      
      /* Metric cards */
      .metric-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      /* Time slider */
      .time-range-slider {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1rem;
      }
      
      .slider-track {
        height: 6px;
        background: var(--border-color);
        border-radius: 3px;
        position: relative;
      }
      
      .slider-handle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--accent-color);
        border: 2px solid var(--bg-primary);
        position: absolute;
        top: -7px;
        cursor: grab;
      }
      
      /* Responsive grid */
      .chart-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
      }
      
      .full-width {
        grid-column: 1 / -1;
      }
      
      @media (min-width: 768px) {
        .half-width {
          grid-column: span 1;
        }
      }
    `
  }
  
  private async loadHydrationScripts(): Promise<string> {
    return `
      // Component hydration
      document.addEventListener('DOMContentLoaded', function() {
        // Import visualization components dynamically
        const components = document.querySelectorAll('[data-component]');
        
        components.forEach(async (element) => {
          const componentType = element.getAttribute('data-component');
          const config = JSON.parse(element.getAttribute('data-config') || '{}');
          
          try {
            // In production, this would use dynamic imports
            const module = await import('@repo-statter/visualizations');
            const Component = module[componentType];
            
            if (Component) {
              const instance = new Component(config.data, config.options);
              instance.hydrate(element);
            }
          } catch (error) {
            console.error('Failed to hydrate component:', componentType, error);
          }
        });
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
          themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
          });
        }
        
        // Export functionality
        const exportButton = document.querySelector('.export-button');
        if (exportButton) {
          exportButton.addEventListener('click', () => {
            // Export logic here
          });
        }
      });
    `
  }
  
  private async loadIcons(): Promise<Record<string, string>> {
    return {
      download: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
      theme: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>',
      github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.02 10.02 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>'
    }
  }
}
```

### 5.7 CLI Testing

#### Description
Test the CLI commands and options.

#### packages/cli/src/__tests__/cli.test.ts
```typescript
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

describe('CLI', () => {
  let tempDir: string
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'repo-statter-test-'))
  })
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  
  describe('analyze command', () => {
    it('should analyze current directory by default', async () => {
      const { stdout } = await execAsync('repo-statter analyze')
      
      expect(stdout).toContain('Analysis Summary:')
      expect(stdout).toContain('Repository:')
      expect(stdout).toContain('Commits:')
    })
    
    it('should respect output option', async () => {
      const outputPath = join(tempDir, 'custom-report.html')
      const { stdout } = await execAsync(
        `repo-statter analyze --output ${outputPath}`
      )
      
      expect(stdout).toContain(`Report generated: ${outputPath}`)
    })
    
    it('should handle non-git directories', async () => {
      await expect(
        execAsync(`repo-statter analyze ${tempDir}`)
      ).rejects.toThrow('Not a git repository')
    })
    
    it('should respect max-commits option', async () => {
      const { stdout } = await execAsync(
        'repo-statter analyze --max-commits 100'
      )
      
      expect(stdout).toContain('Commits: 100')
    })
  })
  
  describe('cache command', () => {
    it('should clear cache', async () => {
      const { stdout } = await execAsync('repo-statter cache --clear')
      expect(stdout).toContain('Cache cleared')
    })
    
    it('should show cache size', async () => {
      const { stdout } = await execAsync('repo-statter cache --size')
      expect(stdout).toMatch(/Cache size: \d+\.\d+ MB/)
    })
  })
  
  describe('configuration', () => {
    it('should load config file', async () => {
      const configPath = join(tempDir, '.repo-statter.json')
      await writeFile(configPath, JSON.stringify({
        theme: 'dark',
        maxCommits: 50
      }))
      
      const { stdout } = await execAsync(
        `repo-statter analyze --config ${configPath}`
      )
      
      expect(stdout).toContain('Commits: 50')
    })
    
    it('should validate config schema', async () => {
      const configPath = join(tempDir, '.repo-statter.json')
      await writeFile(configPath, JSON.stringify({
        theme: 'invalid'
      }))
      
      await expect(
        execAsync(`repo-statter analyze --config ${configPath}`)
      ).rejects.toThrow('Invalid configuration')
    })
  })
})
```

## Integration Test

#### packages/cli/src/__tests__/integration.test.ts
```typescript
describe('End-to-end report generation', () => {
  it('should generate complete report', async () => {
    const testRepo = './test-fixtures/sample-repo'
    const outputPath = join(tempDir, 'report.html')
    
    // Run analysis
    await execAsync(
      `repo-statter analyze ${testRepo} --output ${outputPath}`
    )
    
    // Verify HTML structure
    const html = await readFile(outputPath, 'utf-8')
    
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Repository Growth')
    expect(html).toContain('metric-card')
    expect(html).toContain('growth-chart')
    expect(html).toContain('file-types-pie')
    
    // Verify assets
    if (!html.includes('<style>')) {
      const assetsDir = join(dirname(outputPath), 'assets')
      expect(await exists(join(assetsDir, 'styles.css'))).toBe(true)
      expect(await exists(join(assetsDir, 'scripts.js'))).toBe(true)
    }
  })
  
  it('should handle large repositories', async () => {
    const largeRepo = './test-fixtures/large-repo'
    const start = performance.now()
    
    await execAsync(
      `repo-statter analyze ${largeRepo} --max-commits 10000`
    )
    
    const duration = performance.now() - start
    
    // Should complete in reasonable time
    expect(duration).toBeLessThan(60000) // 1 minute
    
    // Should not use excessive memory
    const { heapUsed } = process.memoryUsage()
    expect(heapUsed).toBeLessThan(256 * 1024 * 1024) // 256MB
  })
})
```

## Deliverables

1. **Report Templates**: Flexible template system with themes
2. **Report Builder**: Component orchestration and assembly
3. **CLI Interface**: Commands with real progress tracking
4. **Configuration**: File and environment variable support
5. **Asset Bundling**: Optimized CSS/JS bundling

## Success Criteria

- [ ] Reports render correctly in all browsers
- [ ] Progress tracking shows real percentages
- [ ] Configuration system is intuitive
- [ ] CLI provides helpful error messages
- [ ] Performance meets targets (<1min for 10k commits)
- [ ] Memory usage stays under 256MB

## Next Phase

With report generation complete, Phase 6 will focus on comprehensive testing strategies and preparing for release.