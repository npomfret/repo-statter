import { describe, it, expect } from 'vitest'
import { replaceTemplateVariables, injectIntoBody } from './template-engine.js'

describe('template-engine', () => {
  describe('replaceTemplateVariables', () => {
    it('should replace single template variable', () => {
      const template = 'Hello {{name}}'
      const data = { name: 'World' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Hello World')
    })

    it('should replace multiple template variables', () => {
      const template = 'Hello {{name}}, today is {{day}}'
      const data = { name: 'Alice', day: 'Monday' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Hello Alice, today is Monday')
    })

    it('should replace repeated template variables', () => {
      const template = '{{name}} says: Hello {{name}}'
      const data = { name: 'Bob' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Bob says: Hello Bob')
    })

    it('should handle empty template', () => {
      const template = ''
      const data = { name: 'World' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('')
    })

    it('should handle template with no variables', () => {
      const template = 'Hello World'
      const data = { name: 'Alice' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Hello World')
    })

    it('should handle unused template variables', () => {
      const template = 'Hello {{name}}'
      const data = { name: 'World', unused: 'value' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Hello World')
    })

    it('should handle missing template variables', () => {
      const template = 'Hello {{name}} and {{other}}'
      const data = { name: 'World' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Hello World and {{other}}')
    })

    it('should handle special characters in template values', () => {
      const template = 'Value: {{value}}'
      const data = { value: 'special & chars < > "quotes"' }
      const result = replaceTemplateVariables(template, data)
      expect(result).toBe('Value: special & chars < > "quotes"')
    })

    it('should throw error for non-string template', () => {
      expect(() => replaceTemplateVariables(123 as any, {})).toThrow('Template must be a string')
    })

    it('should throw error for non-object data', () => {
      expect(() => replaceTemplateVariables('template', 'data' as any)).toThrow('Template data must be an object')
    })

    it('should throw error for null data', () => {
      expect(() => replaceTemplateVariables('template', null as any)).toThrow('Template data must be an object')
    })

    it('should throw error for non-string template values', () => {
      const template = 'Value: {{value}}'
      const data = { value: 123 }
      expect(() => replaceTemplateVariables(template, data as any)).toThrow('Template value for value must be a string')
    })
  })

  describe('injectIntoBody', () => {
    it('should inject content before closing body tag', () => {
      const template = '<html><body><h1>Test</h1></body></html>'
      const content = '<script>console.log("test")</script>'
      const result = injectIntoBody(template, content)
      expect(result).toBe('<html><body><h1>Test</h1><script>console.log("test")</script>\n</body></html>')
    })

    it('should handle multiple body tags', () => {
      const template = '<body>first</body><body>second</body>'
      const content = '<script>test</script>'
      const result = injectIntoBody(template, content)
      expect(result).toBe('<body>first<script>test</script>\n</body><body>second</body>')
    })

    it('should handle no body tag', () => {
      const template = '<html><head></head></html>'
      const content = '<script>test</script>'
      const result = injectIntoBody(template, content)
      expect(result).toBe('<html><head></head></html>')
    })

    it('should handle empty content', () => {
      const template = '<html><body></body></html>'
      const content = ''
      const result = injectIntoBody(template, content)
      expect(result).toBe('<html><body>\n</body></html>')
    })

    it('should handle empty template', () => {
      const template = ''
      const content = '<script>test</script>'
      const result = injectIntoBody(template, content)
      expect(result).toBe('')
    })

    it('should throw error for non-string template', () => {
      expect(() => injectIntoBody(123 as any, 'content')).toThrow('Template must be a string')
    })

    it('should throw error for non-string content', () => {
      expect(() => injectIntoBody('template', 123 as any)).toThrow('Content must be a string')
    })
  })
})