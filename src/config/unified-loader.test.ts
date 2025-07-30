import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadConfigFile, exportConfiguration, loadConfiguration } from './unified-loader.js'
import { DEFAULT_CONFIG } from './defaults.js'

describe('Unified Config Loader', () => {
  let testDir: string
  
  beforeEach(() => {
    testDir = join(tmpdir(), 'repo-statter-test-' + Date.now())
    mkdirSync(testDir, { recursive: true })
  })
  
  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })
  
  describe('loadConfigFile', () => {
    it('should load simplified config', () => {
      const simplifiedConfig = {
        analysis: {
          maxCommits: 500,
          bytesPerLineEstimate: 60
        },
        exclusions: {
          patterns: ['**/temp/**']
        }
      }
      
      const configPath = join(testDir, 'simplified.json')
      writeFileSync(configPath, JSON.stringify(simplifiedConfig, null, 2))
      
      const loaded = loadConfigFile(configPath)
      
      expect(loaded.analysis.maxCommits).toBe(500)
      expect(loaded.analysis.bytesPerLineEstimate).toBe(60)
      expect(loaded.exclusions.patterns).toEqual(['**/temp/**'])
    })
    
    it('should load full config', () => {
      const fullConfig = {
        ...DEFAULT_CONFIG,
        analysis: {
          ...DEFAULT_CONFIG.analysis,
          maxCommits: 1000
        }
      }
      
      const configPath = join(testDir, 'full.json')
      writeFileSync(configPath, JSON.stringify(fullConfig, null, 2))
      
      const loaded = loadConfigFile(configPath)
      
      expect(loaded.analysis.maxCommits).toBe(1000)
      expect(loaded.analysis.bytesPerLineEstimate).toBe(50) // Should use default
    })
    
    it('should detect simplified config without version field', () => {
      const config = {
        analysis: { 
          maxCommits: 100,
          bytesPerLineEstimate: 60,
          timeSeriesHourlyThresholdHours: 24
        }
      }
      
      const configPath = join(testDir, 'config.json')
      writeFileSync(configPath, JSON.stringify(config))
      
      const loaded = loadConfigFile(configPath)
      expect(loaded.analysis.maxCommits).toBe(100)
    })
    
    it('should load config with custom values', () => {
      const config = {
        wordCloud: {
          maxWords: 150
        },
        analysis: {
          maxCommits: 200
        }
      }
      
      const configPath = join(testDir, 'config.json')
      writeFileSync(configPath, JSON.stringify(config))
      
      const loaded = loadConfigFile(configPath)
      expect(loaded.analysis.maxCommits).toBe(200)
      expect(loaded.wordCloud.maxWords).toBe(150)
    })
    
    it('should throw error for non-existent file', () => {
      expect(() => loadConfigFile('/non/existent/file.json')).toThrow()
    })
  })
  
  describe('exportConfiguration', () => {
    it('should export simplified config by default', async () => {
      const exportPath = join(testDir, 'exported.json')
      await exportConfiguration(exportPath)
      
      const content = readFileSync(exportPath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed.analysis).toBeDefined()
      expect(parsed.exclusions).toBeDefined()
      expect(parsed.version).toBeUndefined()
    })
    
    it('should export simplified config', async () => {
      const exportPath = join(testDir, 'exported.json')
      await exportConfiguration(exportPath, false)
      
      const content = readFileSync(exportPath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed.analysis).toBeDefined()
      expect(parsed.wordCloud).toBeDefined()
      expect(parsed.fileHeat).toBeDefined()
    })
    
    it('should add .json extension if missing', async () => {
      const exportPath = join(testDir, 'config')
      await exportConfiguration(exportPath)
      
      expect(existsSync(join(testDir, 'config.json'))).toBe(true)
    })
    
    it('should create directory if needed', async () => {
      const exportPath = join(testDir, 'subdir', 'config.json')
      await exportConfiguration(exportPath)
      
      expect(existsSync(exportPath)).toBe(true)
    })
    
    it('should throw error if file exists without force', async () => {
      const exportPath = join(testDir, 'existing.json')
      writeFileSync(exportPath, '{}')
      
      await expect(exportConfiguration(exportPath)).rejects.toThrow()
    })
    
    it('should overwrite with force flag', async () => {
      const exportPath = join(testDir, 'existing.json')
      writeFileSync(exportPath, '{"old": true}')
      
      await exportConfiguration(exportPath, true)
      
      const content = readFileSync(exportPath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(content).not.toContain('"old"')
      expect(parsed.analysis).toBeDefined()
    })
  })
  
  describe('loadConfiguration', () => {
    it('should load defaults without overrides', () => {
      const config = loadConfiguration()
      
      expect(config).toEqual(DEFAULT_CONFIG)
    })
    
    it('should apply CLI overrides', () => {
      const config = loadConfiguration({
        maxCommits: 200,
        noCache: true
      })
      
      expect(config.analysis.maxCommits).toBe(200)
      expect(config.performance.cacheEnabled).toBe(false)
    })
    
    it('should load and merge config file', () => {
      const partialConfig = {
        analysis: {
          bytesPerLineEstimate: 75
        }
      }
      
      const configPath = join(testDir, 'config.json')
      writeFileSync(configPath, JSON.stringify(partialConfig))
      
      const config = loadConfiguration({
        configPath,
        maxCommits: 300
      })
      
      expect(config.analysis.bytesPerLineEstimate).toBe(75) // From file
      expect(config.analysis.maxCommits).toBe(300) // From CLI override
    })
    
    it('should validate configuration', () => {
      const invalidConfig = {
        analysis: {
          bytesPerLineEstimate: -1
        }
      }
      
      const configPath = join(testDir, 'invalid.json')
      writeFileSync(configPath, JSON.stringify(invalidConfig))
      
      expect(() => loadConfiguration({ configPath })).toThrow('bytesPerLineEstimate must be positive')
    })
  })
})

// Helper to import fs for the test
import { readFileSync, existsSync } from 'fs'