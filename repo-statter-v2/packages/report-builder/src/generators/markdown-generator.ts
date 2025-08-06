// Markdown report generator
import type { AnalysisResult } from '@repo-statter/core'
import type { ReportGenerator, ReportOptions, ReportOutput } from '../report-builder.js'

export class MarkdownReportGenerator implements ReportGenerator {
  async generate(result: AnalysisResult, options: ReportOptions): Promise<ReportOutput> {
    const filename = options.filename || `${result.repository.name}.md`
    
    const content = this.generateMarkdown(result)
    
    return {
      format: 'markdown',
      filename,
      path: options.outputPath,
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        repository: result.repository.name
      }
    }
  }
  
  private generateMarkdown(result: AnalysisResult): string {
    return `# ${result.repository.name} - Repository Analysis

## Summary

- **Total Commits**: ${result.repository.totalCommits}
- **First Commit**: ${result.repository.firstCommitDate.toLocaleDateString()}
- **Last Commit**: ${result.repository.lastCommitDate.toLocaleDateString()}
- **Total Lines**: ${result.currentState.totalLines}
- **Contributors**: ${result.currentState.contributors.size}

## File Statistics

- **Total Files**: ${result.currentState.fileMetrics.size}
- **Languages**: ${result.currentState.languages.size}

_Generated at ${new Date().toISOString()}_
`
  }
}