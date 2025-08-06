// JSON report generator
import type { AnalysisResult } from '@repo-statter/core'
import type { ReportGenerator, ReportOptions, ReportOutput } from '../report-builder.js'

export class JSONReportGenerator implements ReportGenerator {
  async generate(result: AnalysisResult, options: ReportOptions): Promise<ReportOutput> {
    const filename = options.filename || `${result.repository.name}.json`
    
    const content = options.minify
      ? JSON.stringify(result)
      : JSON.stringify(result, null, 2)
    
    return {
      format: 'json',
      filename,
      path: options.outputPath,
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        repository: result.repository.name
      }
    }
  }
}