import { assert } from './errors.js'

interface TemplateData {
  [key: string]: string
}

export function replaceTemplateVariables(template: string, data: TemplateData): string {
  assert(typeof template === 'string', 'Template must be a string')
  assert(typeof data === 'object' && data !== null, 'Template data must be an object')
  
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    assert(typeof value === 'string', `Template value for ${key} must be a string`)
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, 'g'), value)
  }
  
  return result
}

export function injectIntoBody(template: string, content: string): string {
  assert(typeof template === 'string', 'Template must be a string')
  assert(typeof content === 'string', 'Content must be a string')
  
  return template.replace('</body>', content + '\n</body>')
}