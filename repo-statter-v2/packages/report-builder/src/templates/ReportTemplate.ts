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