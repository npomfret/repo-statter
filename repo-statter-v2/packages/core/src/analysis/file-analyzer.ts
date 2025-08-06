/**
 * File Analysis Engine for repo-statter
 * Handles complexity calculation and language detection
 * @module @repo-statter/core/analysis/file-analyzer
 */

import { spawn } from 'child_process'
import { createLogger } from '../logging/logger.js'
import { AnalysisEngineError } from './engine.js'

const logger = createLogger('FileAnalyzer')

export interface FileAnalysisResult {
  /** File path */
  path: string
  /** Programming language detected */
  language: string
  /** Cyclomatic complexity score */
  complexity: number
  /** Line count */
  lines: number
  /** File size in bytes */
  sizeBytes: number
  /** Whether file is binary */
  isBinary: boolean
}

export interface LanguageDefinition {
  /** Language name */
  name: string
  /** File extensions (including dot) */
  extensions: string[]
  /** MIME types */
  mimeTypes?: string[]
  /** Language family */
  family?: 'javascript' | 'c-family' | 'functional' | 'markup' | 'config' | 'data' | 'other'
  /** Whether to analyze complexity */
  supportsComplexity: boolean
}

export interface ComplexityMetrics {
  /** Average complexity across all files */
  averageComplexity: number
  /** Maximum complexity found */
  maxComplexity: number
  /** Top complex files (hotspots) */
  hotspots: Array<{
    path: string
    complexity: number
    lines: number
  }>
}

// Language definitions for common programming languages
const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  // JavaScript family
  { name: 'JavaScript', extensions: ['.js', '.mjs', '.cjs'], family: 'javascript', supportsComplexity: true },
  { name: 'TypeScript', extensions: ['.ts', '.tsx'], family: 'javascript', supportsComplexity: true },
  { name: 'JSX', extensions: ['.jsx'], family: 'javascript', supportsComplexity: true },
  
  // Python
  { name: 'Python', extensions: ['.py', '.pyw', '.pyx'], supportsComplexity: true },
  
  // C family
  { name: 'C', extensions: ['.c', '.h'], family: 'c-family', supportsComplexity: true },
  { name: 'C++', extensions: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx'], family: 'c-family', supportsComplexity: true },
  { name: 'C#', extensions: ['.cs'], family: 'c-family', supportsComplexity: true },
  { name: 'Java', extensions: ['.java'], family: 'c-family', supportsComplexity: true },
  
  // Other languages
  { name: 'Go', extensions: ['.go'], supportsComplexity: true },
  { name: 'Rust', extensions: ['.rs'], supportsComplexity: true },
  { name: 'Ruby', extensions: ['.rb', '.rbw'], supportsComplexity: true },
  { name: 'PHP', extensions: ['.php', '.phtml'], supportsComplexity: true },
  { name: 'Swift', extensions: ['.swift'], supportsComplexity: true },
  { name: 'Kotlin', extensions: ['.kt', '.kts'], supportsComplexity: true },
  
  // Functional
  { name: 'Haskell', extensions: ['.hs', '.lhs'], family: 'functional', supportsComplexity: true },
  { name: 'Erlang', extensions: ['.erl', '.hrl'], family: 'functional', supportsComplexity: true },
  { name: 'Elixir', extensions: ['.ex', '.exs'], family: 'functional', supportsComplexity: true },
  
  // Markup and styles
  { name: 'HTML', extensions: ['.html', '.htm', '.xhtml'], family: 'markup', supportsComplexity: false },
  { name: 'CSS', extensions: ['.css'], family: 'markup', supportsComplexity: false },
  { name: 'SCSS', extensions: ['.scss'], family: 'markup', supportsComplexity: false },
  { name: 'LESS', extensions: ['.less'], family: 'markup', supportsComplexity: false },
  { name: 'XML', extensions: ['.xml', '.xsl', '.xsd'], family: 'markup', supportsComplexity: false },
  
  // Data formats
  { name: 'JSON', extensions: ['.json'], family: 'data', supportsComplexity: false },
  { name: 'YAML', extensions: ['.yaml', '.yml'], family: 'data', supportsComplexity: false },
  { name: 'TOML', extensions: ['.toml'], family: 'data', supportsComplexity: false },
  { name: 'CSV', extensions: ['.csv'], family: 'data', supportsComplexity: false },
  
  // Config files
  { name: 'Shell', extensions: ['.sh', '.bash', '.zsh', '.fish'], family: 'config', supportsComplexity: true },
  { name: 'Dockerfile', extensions: ['.dockerfile'], family: 'config', supportsComplexity: false },
  { name: 'Makefile', extensions: ['.make', '.mk'], family: 'config', supportsComplexity: false },
  
  // Documentation
  { name: 'Markdown', extensions: ['.md', '.markdown'], family: 'markup', supportsComplexity: false },
  { name: 'Text', extensions: ['.txt'], family: 'other', supportsComplexity: false },
]

export class FileAnalyzer {
  private readonly languageMap = new Map<string, LanguageDefinition>()

  constructor() {
    // Build extension -> language map
    for (const lang of LANGUAGE_DEFINITIONS) {
      for (const ext of lang.extensions) {
        this.languageMap.set(ext.toLowerCase(), lang)
      }
    }
  }

  /**
   * Detect the programming language of a file based on its extension
   */
  detectLanguage(filePath: string): string {
    const ext = this.getFileExtension(filePath).toLowerCase()
    const language = this.languageMap.get(ext)
    
    if (language) {
      return language.name
    }

    // Special cases for files without extensions
    const fileName = filePath.split('/').pop()?.toLowerCase() || ''
    if (fileName === 'dockerfile') return 'Dockerfile'
    if (fileName === 'makefile') return 'Makefile'
    if (fileName.startsWith('.')) return 'Config'

    return 'Unknown'
  }

  /**
   * Check if a language supports complexity analysis
   */
  supportsComplexityAnalysis(language: string): boolean {
    for (const lang of LANGUAGE_DEFINITIONS) {
      if (lang.name === language) {
        return lang.supportsComplexity
      }
    }
    return false
  }

  /**
   * Analyze a file's content for complexity and metrics
   */
  async analyzeFileContent(filePath: string, content: string): Promise<FileAnalysisResult> {
    logger.debug(`Analyzing file: ${filePath}`)

    const language = this.detectLanguage(filePath)
    const isBinary = this.isBinaryContent(content)
    const lines = isBinary ? 0 : content.split('\n').length
    const sizeBytes = Buffer.byteLength(content, 'utf8')

    let complexity = 0
    if (!isBinary && this.supportsComplexityAnalysis(language)) {
      complexity = this.calculateCyclomaticComplexity(content, language)
    }

    return {
      path: filePath,
      language,
      complexity,
      lines,
      sizeBytes,
      isBinary
    }
  }

  /**
   * Calculate cyclomatic complexity for supported languages
   */
  private calculateCyclomaticComplexity(content: string, language: string): number {
    // Base complexity is 1 (single path)
    let complexity = 1

    // Language-specific complexity patterns
    const patterns = this.getComplexityPatterns(language)
    
    for (const pattern of patterns) {
      const matches = content.match(pattern.regex)
      if (matches) {
        complexity += matches.length * pattern.weight
      }
    }

    return complexity
  }

  /**
   * Get complexity calculation patterns for different languages
   */
  private getComplexityPatterns(language: string): Array<{ regex: RegExp; weight: number }> {
    const patterns: Array<{ regex: RegExp; weight: number }> = []

    switch (language) {
      case 'JavaScript':
      case 'TypeScript':
      case 'JSX':
        patterns.push(
          // Decision points: if, while, for, catch, case, &&, ||, ?
          { regex: /\b(if|while|for|catch)\b/g, weight: 1 },
          { regex: /\bcase\b(?!\s*:)/g, weight: 1 }, // case statements
          { regex: /&&/g, weight: 1 },
          { regex: /\|\|/g, weight: 1 },
          { regex: /\?/g, weight: 1 }, // ternary operators
        )
        break
        
      case 'Python':
        patterns.push(
          { regex: /\b(if|while|for|except|elif)\b/g, weight: 1 },
          { regex: /\band\b/g, weight: 1 },
          { regex: /\bor\b/g, weight: 1 },
        )
        break
        
      case 'Java':
      case 'C#':
      case 'C':
      case 'C++':
        patterns.push(
          { regex: /\b(if|while|for|catch|case|switch)\b/g, weight: 1 },
          { regex: /&&/g, weight: 1 },
          { regex: /\|\|/g, weight: 1 },
          { regex: /\?/g, weight: 1 },
        )
        break
        
      case 'Go':
        patterns.push(
          { regex: /\b(if|for|switch|case)\b/g, weight: 1 },
          { regex: /&&/g, weight: 1 },
          { regex: /\|\|/g, weight: 1 },
        )
        break
        
      case 'Rust':
        patterns.push(
          { regex: /\b(if|while|for|match)\b/g, weight: 1 },
          { regex: /&&/g, weight: 1 },
          { regex: /\|\|/g, weight: 1 },
        )
        break
        
      default:
        // Generic patterns for unknown languages
        patterns.push(
          { regex: /\b(if|while|for|catch|case)\b/g, weight: 1 },
          { regex: /&&/g, weight: 1 },
          { regex: /\|\|/g, weight: 1 },
        )
    }

    return patterns
  }

  /**
   * Check if content appears to be binary
   */
  private isBinaryContent(content: string): boolean {
    // Simple heuristic: if content contains null bytes or too many non-printable characters
    if (content.includes('\0')) return true
    
    const nonPrintableCount = content.split('').filter(char => {
      const code = char.charCodeAt(0)
      return code < 32 && code !== 9 && code !== 10 && code !== 13 // exclude tab, LF, CR
    }).length
    
    const threshold = Math.max(content.length * 0.3, 100) // 30% or 100 chars max
    return nonPrintableCount > threshold
  }

  /**
   * Extract file extension from path
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.')
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    
    if (lastDot > lastSlash && lastDot !== -1) {
      return filePath.slice(lastDot)
    }
    
    return ''
  }

  /**
   * Get file content from git at a specific commit
   */
  async getFileContentAtCommit(repoPath: string, commitSha: string, filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', ['show', `${commitSha}:${filePath}`], {
        cwd: repoPath,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      gitProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      gitProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      gitProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new AnalysisEngineError(`Failed to get file content: ${stderr}`))
        }
      })

      gitProcess.on('error', (error) => {
        reject(new AnalysisEngineError(`Git process failed: ${error.message}`, error))
      })
    })
  }

  /**
   * Batch analyze multiple files at a specific commit
   */
  async batchAnalyzeFiles(
    repoPath: string, 
    commitSha: string, 
    filePaths: string[]
  ): Promise<FileAnalysisResult[]> {
    logger.info(`Batch analyzing ${filePaths.length} files at commit ${commitSha.slice(0, 7)}`)
    
    const results: FileAnalysisResult[] = []
    const batchSize = 10 // Process files in batches to avoid overwhelming the system
    
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize)
      const batchPromises = batch.map(async (filePath) => {
        try {
          const content = await this.getFileContentAtCommit(repoPath, commitSha, filePath)
          return await this.analyzeFileContent(filePath, content)
        } catch (error) {
          logger.warn(`Failed to analyze file ${filePath}: ${error}`)
          // Return minimal result for failed files
          return {
            path: filePath,
            language: this.detectLanguage(filePath),
            complexity: 0,
            lines: 0,
            sizeBytes: 0,
            isBinary: true
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Log progress
      logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filePaths.length / batchSize)}`)
    }
    
    return results
  }

  /**
   * Calculate aggregate complexity metrics for a set of files
   */
  calculateComplexityMetrics(results: FileAnalysisResult[]): ComplexityMetrics {
    const complexityValues = results
      .filter(r => r.complexity > 0)
      .map(r => r.complexity)
    
    if (complexityValues.length === 0) {
      return {
        averageComplexity: 0,
        maxComplexity: 0,
        hotspots: []
      }
    }
    
    const averageComplexity = complexityValues.reduce((sum, val) => sum + val, 0) / complexityValues.length
    const maxComplexity = Math.max(...complexityValues)
    
    // Find complexity hotspots (top 10 most complex files)
    const hotspots = results
      .filter(r => r.complexity > 0)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10)
      .map(r => ({
        path: r.path,
        complexity: r.complexity,
        lines: r.lines
      }))
    
    return {
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      maxComplexity,
      hotspots
    }
  }
}