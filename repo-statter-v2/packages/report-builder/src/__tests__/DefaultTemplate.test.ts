import { describe, it, expect } from 'vitest'
import { DefaultTemplate } from '../templates/DefaultTemplate.js'
import type { TemplateData } from '../templates/ReportTemplate.js'

describe('DefaultTemplate', () => {
  const mockTemplateData: TemplateData = {
    repository: {
      name: 'test-repo',
      path: '/path/to/repo',
      url: 'https://github.com/user/test-repo',
      analyzedAt: new Date('2023-01-01T00:00:00Z')
    },
    metrics: {
      commits: 100,
      contributors: 5,
      files: 25
    },
    charts: {
      'metric-commits': '<div class="metric-card">100 Commits</div>',
      'metric-contributors': '<div class="metric-card">5 Contributors</div>',
      'metric-files': '<div class="metric-card">25 Files</div>',
      'growth-chart': '<div class="chart">Growth Chart</div>',
      'file-types-pie': '<div class="chart">File Types</div>'
    },
    assets: {
      styles: '.test { color: red; }',
      scripts: 'console.log("test");',
      icons: {
        download: '<svg>download</svg>',
        theme: '<svg>theme</svg>'
      }
    }
  }
  
  it('should render complete HTML structure', () => {
    const template = new DefaultTemplate(mockTemplateData)
    const html = template.render()
    
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="en"')
    expect(html).toContain('<head>')
    expect(html).toContain('<body>')
    expect(html).toContain('</html>')
  })
  
  it('should include repository information', () => {
    const template = new DefaultTemplate(mockTemplateData)
    const html = template.render()
    
    expect(html).toContain('test-repo')
    expect(html).toContain('/path/to/repo')
    expect(html).toContain('https://github.com/user/test-repo')
  })
  
  it('should include meta information', () => {
    const template = new DefaultTemplate(mockTemplateData)
    const html = template.render()
    
    expect(html).toContain('repo-statter v2')
    expect(html).toContain('2023-01-01T00:00:00.000Z')
    expect(html).toContain('charset="UTF-8"')
    expect(html).toContain('viewport')
  })
  
  it('should render metric cards', () => {
    const template = new DefaultTemplate(mockTemplateData)
    const html = template.render()
    
    expect(html).toContain('100 Commits')
    expect(html).toContain('5 Contributors')
    expect(html).toContain('25 Files')
  })
  
  it('should include chart sections', () => {
    const template = new DefaultTemplate(mockTemplateData)
    const html = template.render()
    
    expect(html).toContain('Repository Growth')
    expect(html).toContain('Code Distribution')
    expect(html).toContain('File Analysis')
    expect(html).toContain('Insights')
  })
  
  it('should handle inline assets', () => {
    const template = new DefaultTemplate(mockTemplateData, { 
      inlineAssets: true 
    })
    const html = template.render()
    
    expect(html).toContain('<style>.test { color: red; }</style>')
    expect(html).toContain('<script>console.log("test");</script>')
    expect(html).not.toContain('<link rel="stylesheet"')
    expect(html).not.toContain('<script src="assets/scripts.js"')
  })
  
  it('should handle external assets', () => {
    const template = new DefaultTemplate(mockTemplateData, { 
      inlineAssets: false 
    })
    const html = template.render()
    
    expect(html).toContain('<link rel="stylesheet" href="assets/styles.css">')
    expect(html).toContain('<script src="assets/scripts.js" defer></script>')
    expect(html).not.toContain('<style>')
  })
  
  it('should handle theme attributes', () => {
    const lightTemplate = new DefaultTemplate(mockTemplateData, { theme: 'light' })
    const darkTemplate = new DefaultTemplate(mockTemplateData, { theme: 'dark' })
    
    expect(lightTemplate.render()).toContain('data-theme="light"')
    expect(darkTemplate.render()).toContain('data-theme="dark"')
  })
  
  it('should include theme script for auto theme', () => {
    const template = new DefaultTemplate(mockTemplateData, { theme: 'auto' })
    const html = template.render()
    
    expect(html).toContain('prefers-color-scheme: dark')
    expect(html).toContain('setAttribute(\'data-theme\', theme)')
  })
  
  it('should minify HTML when option is set', () => {
    const template = new DefaultTemplate(mockTemplateData, { minify: true })
    const html = template.render()
    
    // Minified HTML should have fewer whitespace
    expect(html.split('\n').length).toBeLessThan(10)
    expect(html).not.toMatch(/>\s+</)
  })
  
  it('should not minify HTML by default', () => {
    const template = new DefaultTemplate(mockTemplateData)
    const html = template.render()
    
    // Non-minified HTML should have more lines and whitespace
    expect(html.split('\n').length).toBeGreaterThan(20)
  })
})