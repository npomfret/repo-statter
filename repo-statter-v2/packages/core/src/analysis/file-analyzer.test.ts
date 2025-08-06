/**
 * Tests for FileAnalyzer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FileAnalyzer } from './file-analyzer.js'

describe('FileAnalyzer', () => {
  let analyzer: FileAnalyzer

  beforeEach(() => {
    analyzer = new FileAnalyzer()
  })

  describe('Language Detection', () => {
    it('should detect JavaScript files', () => {
      expect(analyzer.detectLanguage('app.js')).toBe('JavaScript')
      expect(analyzer.detectLanguage('module.mjs')).toBe('JavaScript')
      expect(analyzer.detectLanguage('config.cjs')).toBe('JavaScript')
    })

    it('should detect TypeScript files', () => {
      expect(analyzer.detectLanguage('app.ts')).toBe('TypeScript')
      expect(analyzer.detectLanguage('component.tsx')).toBe('TypeScript')
    })

    it('should detect Python files', () => {
      expect(analyzer.detectLanguage('script.py')).toBe('Python')
      expect(analyzer.detectLanguage('module.pyw')).toBe('Python')
    })

    it('should detect markup files', () => {
      expect(analyzer.detectLanguage('index.html')).toBe('HTML')
      expect(analyzer.detectLanguage('styles.css')).toBe('CSS')
      expect(analyzer.detectLanguage('README.md')).toBe('Markdown')
    })

    it('should detect config files', () => {
      expect(analyzer.detectLanguage('data.json')).toBe('JSON')
      expect(analyzer.detectLanguage('config.yaml')).toBe('YAML')
      expect(analyzer.detectLanguage('setup.sh')).toBe('Shell')
    })

    it('should handle special filenames', () => {
      expect(analyzer.detectLanguage('Dockerfile')).toBe('Dockerfile')
      expect(analyzer.detectLanguage('Makefile')).toBe('Makefile')
      expect(analyzer.detectLanguage('.gitignore')).toBe('Config')
    })

    it('should return Unknown for unrecognized extensions', () => {
      expect(analyzer.detectLanguage('file.xyz')).toBe('Unknown')
      expect(analyzer.detectLanguage('noextension')).toBe('Unknown')
    })
  })

  describe('Complexity Analysis Support', () => {
    it('should support complexity analysis for programming languages', () => {
      expect(analyzer.supportsComplexityAnalysis('JavaScript')).toBe(true)
      expect(analyzer.supportsComplexityAnalysis('TypeScript')).toBe(true)
      expect(analyzer.supportsComplexityAnalysis('Python')).toBe(true)
      expect(analyzer.supportsComplexityAnalysis('Java')).toBe(true)
      expect(analyzer.supportsComplexityAnalysis('C++')).toBe(true)
    })

    it('should not support complexity analysis for markup and data files', () => {
      expect(analyzer.supportsComplexityAnalysis('HTML')).toBe(false)
      expect(analyzer.supportsComplexityAnalysis('CSS')).toBe(false)
      expect(analyzer.supportsComplexityAnalysis('JSON')).toBe(false)
      expect(analyzer.supportsComplexityAnalysis('YAML')).toBe(false)
      expect(analyzer.supportsComplexityAnalysis('Markdown')).toBe(false)
    })
  })

  describe('File Content Analysis', () => {
    it('should analyze simple JavaScript file', async () => {
      const content = `function simpleFunction() {
  console.log("Hello world");
  return true;
}`
      
      const result = await analyzer.analyzeFileContent('simple.js', content)
      
      expect(result.path).toBe('simple.js')
      expect(result.language).toBe('JavaScript')
      expect(result.lines).toBe(4)
      expect(result.complexity).toBe(1) // Base complexity for simple function
      expect(result.isBinary).toBe(false)
      expect(result.sizeBytes).toBeGreaterThan(0)
    })

    it('should analyze complex JavaScript with control flow', async () => {
      const content = `function complexFunction(x, y) {
  if (x > 0) {
    if (y > 0) {
      return x + y;
    } else {
      return x - y;
    }
  } else if (x < 0) {
    for (let i = 0; i < 10; i++) {
      console.log(i);
    }
    return -x;
  }
  return 0;
}`
      
      const result = await analyzer.analyzeFileContent('complex.js', content)
      
      expect(result.complexity).toBeGreaterThan(1) // Should have higher complexity
      expect(result.lines).toBe(12)
    })

    it('should analyze Python file with specific patterns', async () => {
      const content = `def analyze_data(data):
    if data is None:
        return None
    
    result = []
    for item in data:
        if item > 0 and item < 100:
            result.append(item)
        elif item >= 100 or item == -1:
            result.append(item * 2)
    
    return result`
      
      const result = await analyzer.analyzeFileContent('analysis.py', content)
      
      expect(result.language).toBe('Python')
      expect(result.complexity).toBeGreaterThan(1) // Should detect Python control structures
    })

    it('should handle binary content', async () => {
      const binaryContent = '\0\0\0\x89PNG\r\n\x1a\n\0\0\0\rIHDR\0\0\0'
      
      const result = await analyzer.analyzeFileContent('image.png', binaryContent)
      
      expect(result.isBinary).toBe(true)
      expect(result.lines).toBe(0)
      expect(result.complexity).toBe(0)
    })

    it('should handle non-code files', async () => {
      const content = `# My Project

This is a markdown file with some content.

## Features
- Feature 1
- Feature 2`
      
      const result = await analyzer.analyzeFileContent('README.md', content)
      
      expect(result.language).toBe('Markdown')
      expect(result.complexity).toBe(0) // Markdown doesn't support complexity
      expect(result.lines).toBe(8)
      expect(result.isBinary).toBe(false)
    })
  })

  describe('Complexity Metrics Calculation', () => {
    it('should calculate aggregate metrics for multiple files', () => {
      const results = [
        {
          path: 'simple.js',
          language: 'JavaScript',
          complexity: 1,
          lines: 10,
          sizeBytes: 100,
          isBinary: false
        },
        {
          path: 'complex.js', 
          language: 'JavaScript',
          complexity: 8,
          lines: 50,
          sizeBytes: 500,
          isBinary: false
        },
        {
          path: 'medium.js',
          language: 'JavaScript', 
          complexity: 4,
          lines: 25,
          sizeBytes: 250,
          isBinary: false
        },
        {
          path: 'README.md',
          language: 'Markdown',
          complexity: 0,
          lines: 20,
          sizeBytes: 200,
          isBinary: false
        }
      ]

      const metrics = analyzer.calculateComplexityMetrics(results)

      expect(metrics.averageComplexity).toBe(4.33) // (1 + 8 + 4) / 3
      expect(metrics.maxComplexity).toBe(8)
      expect(metrics.hotspots).toHaveLength(3) // Should only include files with complexity > 0
      expect(metrics.hotspots[0].path).toBe('complex.js') // Highest complexity first
      expect(metrics.hotspots[0].complexity).toBe(8)
    })

    it('should handle empty results', () => {
      const metrics = analyzer.calculateComplexityMetrics([])
      
      expect(metrics.averageComplexity).toBe(0)
      expect(metrics.maxComplexity).toBe(0)
      expect(metrics.hotspots).toHaveLength(0)
    })

    it('should handle results with no complexity files', () => {
      const results = [
        {
          path: 'README.md',
          language: 'Markdown',
          complexity: 0,
          lines: 20,
          sizeBytes: 200,
          isBinary: false
        },
        {
          path: 'config.json',
          language: 'JSON',
          complexity: 0,
          lines: 10,
          sizeBytes: 100,
          isBinary: false
        }
      ]

      const metrics = analyzer.calculateComplexityMetrics(results)
      
      expect(metrics.averageComplexity).toBe(0)
      expect(metrics.maxComplexity).toBe(0)
      expect(metrics.hotspots).toHaveLength(0)
    })
  })
})