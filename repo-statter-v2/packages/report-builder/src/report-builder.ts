// Main report builder class
import type { AnalysisResult } from '@repo-statter/core'
import type { VisualizationConfig } from '@repo-statter/visualizations'
import { HTMLReportGenerator } from './generators/html-generator.js'
import { JSONReportGenerator } from './generators/json-generator.js'
import { MarkdownReportGenerator } from './generators/markdown-generator.js'

export interface ReportOptions {
  format: 'html' | 'json' | 'markdown' | 'all'
  outputPath: string
  filename?: string
  visualization?: VisualizationConfig
  includeRawData?: boolean
  minify?: boolean
}

export class ReportBuilder {
  private generators = new Map<string, ReportGenerator>()
  
  constructor() {
    this.registerGenerator('html', new HTMLReportGenerator())
    this.registerGenerator('json', new JSONReportGenerator())
    this.registerGenerator('markdown', new MarkdownReportGenerator())
  }
  
  registerGenerator(format: string, generator: ReportGenerator): void {
    this.generators.set(format, generator)
  }
  
  async generate(
    analysisResult: AnalysisResult,
    options: ReportOptions
  ): Promise<ReportOutput[]> {
    const outputs: ReportOutput[] = []
    const formats = options.format === 'all' 
      ? ['html', 'json', 'markdown'] 
      : [options.format]
    
    for (const format of formats) {
      const generator = this.generators.get(format)
      if (!generator) {
        throw new Error(`Unknown report format: ${format}`)
      }
      
      const output = await generator.generate(analysisResult, options)
      outputs.push(output)
    }
    
    return outputs
  }
  
  async save(outputs: ReportOutput[]): Promise<string[]> {
    const savedPaths: string[] = []
    
    for (const output of outputs) {
      const path = await this.saveOutput(output)
      savedPaths.push(path)
    }
    
    return savedPaths
  }
  
  private async saveOutput(output: ReportOutput): Promise<string> {
    const { writeFile, mkdir } = await import('fs/promises')
    const { dirname, join } = await import('path')
    
    const fullPath = join(output.path, output.filename)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, output.content, 'utf-8')
    
    return fullPath
  }
}

export interface ReportGenerator {
  generate(result: AnalysisResult, options: ReportOptions): Promise<ReportOutput>
}

export interface ReportOutput {
  format: string
  filename: string
  path: string
  content: string
  metadata?: Record<string, any>
}