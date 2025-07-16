import type { ChartData } from '../types/index.js'

export class TemplateEngine {
  private template: string
  
  constructor(template: string) {
    this.template = template
  }
  
  public render(data: ChartData, scriptContent: string): string {
    let result = this.template
    
    // Replace all placeholders
    const replacements: Record<string, string> = {
      '{{repositoryName}}': data.repositoryName,
      '{{generationDate}}': data.generationDate,
      '{{totalCommits}}': data.totalCommits.toString(),
      '{{totalLinesOfCode}}': data.totalLinesOfCode.toString(),
      '{{totalCodeChurn}}': data.totalCodeChurn.toString(),
      '{{githubLink}}': data.githubLink,
      '{{logoSvg}}': data.logoSvg,
      '{{latestCommitHash}}': data.latestCommitHash,
      '{{latestCommitAuthor}}': data.latestCommitAuthor,
      '{{latestCommitDate}}': data.latestCommitDate
    }
    
    // Apply replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'g'), value)
    }
    
    // Inject script before closing body tag
    result = result.replace('</body>', scriptContent + '\n</body>')
    
    return result
  }
  
  public static validateTemplate(template: string): string[] {
    const errors: string[] = []
    
    // Check for required placeholders
    const requiredPlaceholders = [
      '{{repositoryName}}',
      '{{generationDate}}',
      '{{totalCommits}}',
      '{{totalLinesOfCode}}',
      '{{totalCodeChurn}}'
    ]
    
    for (const placeholder of requiredPlaceholders) {
      if (!template.includes(placeholder)) {
        errors.push(`Missing required placeholder: ${placeholder}`)
      }
    }
    
    // Check for required containers
    const requiredContainers = [
      'commitActivityChart',
      'contributorsChart',
      'linesOfCodeChart',
      'fileTypesChart',
      'codeChurnChart',
      'repositorySizeChart',
      'wordCloudChart',
      'fileHeatmapChart',
      'awardsContainer',
      'userChartsContainer'
    ]
    
    for (const container of requiredContainers) {
      if (!template.includes(`id="${container}"`)) {
        errors.push(`Missing required container: ${container}`)
      }
    }
    
    return errors
  }
}