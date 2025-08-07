import { writeFile, mkdir } from 'fs/promises'
import { dirname, join, basename } from 'path'
import { Logger } from '@repo-statter/core'
// import { ComponentRegistry } from '@repo-statter/visualizations' // Will be used when components are ready
import { DefaultTemplate } from './templates/DefaultTemplate.js'
import { AssetBundler } from './AssetBundler.js'
import type { TemplateData } from './templates/ReportTemplate.js'

// These interfaces need to be imported from core when available
interface AnalysisResult {
  repository: {
    name: string
    path: string
    remote?: string
    totalCommits: number
    firstCommitDate: Date
    lastCommitDate: Date
  }
  currentState: {
    contributors: Map<string, any>
    fileMetrics: Map<string, any>
    totalLines: number
    fileTypes: Map<string, number>
  }
  timeSeries: {
    commits: Array<{ date: Date; value: number }>
    linesOfCode: Array<{ date: Date; value: number }>
  }
}

export interface ReportOptions {
  template?: 'default' | 'minimal' | 'detailed'
  outputPath: string
  theme?: 'light' | 'dark' | 'auto'
  inlineAssets?: boolean
  minify?: boolean
  includeSourceData?: boolean
}

export class ReportBuilderV5 {
  private logger = new Logger('ReportBuilderV5')
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
      
      'metric-contributors': {
        type: 'metric-card',
        data: {
          label: 'Contributors',
          value: analysis.currentState.contributors.size,
          icon: 'users',
          trend: this.calculateTrend(analysis, 'contributors')
        }
      },
      
      'metric-files': {
        type: 'metric-card',
        data: {
          label: 'Files',
          value: analysis.currentState.fileMetrics.size,
          icon: 'files',
          trend: this.calculateTrend(analysis, 'files')
        }
      },
      
      'metric-lines': {
        type: 'metric-card',
        data: {
          label: 'Lines of Code',
          value: analysis.currentState.totalLines.toLocaleString(),
          icon: 'code',
          trend: this.calculateTrend(analysis, 'lines')
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
      },
      
      // Theme toggle
      'theme-toggle': {
        type: 'theme-toggle',
        data: {
          current: 'auto'
        }
      }
    }
  }
  
  private async renderComponents(
    componentData: Record<string, any>
  ): Promise<Record<string, string>> {
    const rendered: Record<string, string> = {}
    
    for (const [id, config] of Object.entries(componentData)) {
      try {
        // For now, we'll create simple placeholders since ComponentRegistry.renderComponent 
        // might not be implemented yet
        rendered[id] = this.renderComponentPlaceholder(id, config)
      } catch (error) {
        this.logger.error(`Failed to render component ${id}`, error as Error)
        rendered[id] = `<!-- Error rendering ${id} -->`
      }
    }
    
    return rendered
  }
  
  private renderComponentPlaceholder(id: string, config: any): string {
    // Create basic HTML structures for each component type
    switch (config.type) {
      case 'metric-card':
        return `
          <div class="metric-card" data-component="metric-card">
            <div class="metric-label">${config.data.label}</div>
            <div class="metric-value">${config.data.value}</div>
          </div>
        `
      
      case 'growth-chart':
        return `
          <div class="chart-container" data-component="growth-chart">
            <div class="chart-placeholder">Growth Chart (${config.data.series?.length || 0} series)</div>
          </div>
        `
      
      case 'file-types-pie':
        return `
          <div class="chart-container" data-component="file-types-pie">
            <div class="chart-placeholder">File Types Chart (${config.data.labels?.length || 0} types)</div>
          </div>
        `
      
      case 'time-slider':
        return `
          <div class="time-range-slider" data-component="time-slider" data-interactive="true">
            <div class="slider-track">
              <div class="slider-handle" style="left: 0%"></div>
              <div class="slider-handle" style="left: 100%"></div>
            </div>
          </div>
        `
      
      case 'top-files-table':
        return `
          <div class="data-table" data-component="top-files-table">
            <div class="table-placeholder">Top Files Table</div>
          </div>
        `
      
      case 'theme-toggle':
        return `
          <button class="theme-toggle" data-component="theme-toggle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          </button>
        `
      
      default:
        return `<div class="component-placeholder" data-component="${config.type}">Component: ${id}</div>`
    }
  }
  
  private getTemplate(_templateName?: string): typeof DefaultTemplate {
    // Could support multiple templates in the future
    return DefaultTemplate
  }
  
  private async saveReport(html: string, outputPath: string): Promise<void> {
    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true })
    
    // Write HTML file
    await writeFile(outputPath, html, 'utf-8')
  }
  
  private async saveSourceData(
    analysis: AnalysisResult,
    reportPath: string
  ): Promise<void> {
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
  
  private extractMetrics(analysis: AnalysisResult): Record<string, any> {
    return {
      totalCommits: analysis.repository.totalCommits,
      contributors: analysis.currentState.contributors.size,
      files: analysis.currentState.fileMetrics.size,
      totalLines: analysis.currentState.totalLines,
      fileTypes: Object.fromEntries(analysis.currentState.fileTypes)
    }
  }
  
  private calculateTrend(_analysis: AnalysisResult, _metric: string): { direction: 'up' | 'down' | 'stable'; percentage: number } {
    // Placeholder trend calculation
    return { direction: 'up', percentage: 5.2 }
  }
  
  private getTopFilesBySize(_analysis: AnalysisResult): Array<{ path: string; size: number; lines: number }> {
    // Placeholder implementation
    return []
  }
  
  private getTopFilesByChurn(_analysis: AnalysisResult): Array<{ path: string; changes: number; lastModified: Date }> {
    // Placeholder implementation
    return []
  }
  
  private getTopFilesByComplexity(_analysis: AnalysisResult): Array<{ path: string; complexity: number; maintainability: number }> {
    // Placeholder implementation
    return []
  }
}