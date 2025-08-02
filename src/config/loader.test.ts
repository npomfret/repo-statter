import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadConfiguration, validateConfiguration } from './loader.js';
import type { ConfigOverrides } from './loader.js';
import { DEFAULT_CONFIG } from './defaults.js';

const TEST_TMP_DIR = join(process.cwd(), 'tmp', 'config-tests');

describe('Configuration Loader', () => {
  beforeEach(() => {
    if (existsSync(TEST_TMP_DIR)) {
      rmSync(TEST_TMP_DIR, { recursive: true });
    }
    mkdirSync(TEST_TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_TMP_DIR)) {
      rmSync(TEST_TMP_DIR, { recursive: true });
    }
  });

  test('loads default configuration when no config files exist', () => {
    // Save current working directory
    const originalCwd = process.cwd();
    
    try {
      // Change to test directory to avoid loading project config
      process.chdir(TEST_TMP_DIR);
      const config = loadConfiguration(TEST_TMP_DIR);
      expect(config).toEqual(DEFAULT_CONFIG);
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  test('loads and merges JSON configuration file', () => {
    const originalCwd = process.cwd();
    
    try {
      process.chdir(TEST_TMP_DIR);
      
      const configPath = join(TEST_TMP_DIR, 'repo-statter.config.json');
      writeFileSync(configPath, JSON.stringify({
        wordCloud: {
          maxWords: 150
        },
        charts: {
          topContributorsLimit: 15
        }
      }));

      const config = loadConfiguration(TEST_TMP_DIR);
      
      expect(config.wordCloud.maxWords).toBe(150);
      expect(config.charts.topContributorsLimit).toBe(15);
      // Other values should remain default
      expect(config.wordCloud.minWordLength).toBe(DEFAULT_CONFIG.wordCloud.minWordLength);
      expect(config.analysis.bytesPerLineEstimate).toBe(DEFAULT_CONFIG.analysis.bytesPerLineEstimate);
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('applies CLI overrides over configuration file', () => {
    const configPath = join(TEST_TMP_DIR, 'repo-statter.config.json');
    writeFileSync(configPath, JSON.stringify({
      analysis: {
        maxCommits: 1000
      }
    }));

    const overrides: ConfigOverrides = {
      maxCommits: 500,
      noCache: true
    };

    const config = loadConfiguration(TEST_TMP_DIR, overrides);
    
    expect(config.analysis.maxCommits).toBe(500); // CLI override
    expect(config.performance.cacheEnabled).toBe(false); // CLI override
  });

  test('loads custom config file when specified', () => {
    const customConfigPath = join(TEST_TMP_DIR, 'custom.config.json');
    writeFileSync(customConfigPath, JSON.stringify({
      wordCloud: {
        minWordLength: 5
      }
    }));

    const config = loadConfiguration(TEST_TMP_DIR, { configPath: customConfigPath });
    
    expect(config.wordCloud.minWordLength).toBe(5);
  });

  test('throws error for invalid JSON', () => {
    const configPath = join(TEST_TMP_DIR, 'repo-statter.config.json');
    writeFileSync(configPath, '{ invalid json }');

    expect(() => loadConfiguration(TEST_TMP_DIR)).toThrow('Failed to load configuration');
  });

  test('throws error for non-object JSON', () => {
    const configPath = join(TEST_TMP_DIR, 'repo-statter.config.json');
    writeFileSync(configPath, '"string value"');

    expect(() => loadConfiguration(TEST_TMP_DIR)).toThrow('Configuration file must contain a JSON object');
  });

  test('validates configuration constraints', () => {
    const invalidConfigs = [
      {
        ...DEFAULT_CONFIG,
        analysis: { ...DEFAULT_CONFIG.analysis, bytesPerLineEstimate: 0 }
      },
      {
        ...DEFAULT_CONFIG,
        wordCloud: { ...DEFAULT_CONFIG.wordCloud, minWordLength: 0 }
      },
      {
        ...DEFAULT_CONFIG,
        fileHeat: { ...DEFAULT_CONFIG.fileHeat, frequencyWeight: 0.3, recencyWeight: 0.5 }
      }
    ];

    invalidConfigs.forEach(config => {
      expect(() => validateConfiguration(config)).toThrow();
    });
  });

  test('passes validation for valid configuration', () => {
    expect(() => validateConfiguration(DEFAULT_CONFIG)).not.toThrow();
  });

  test('handles clearCache override', () => {
    const config = loadConfiguration(TEST_TMP_DIR, { clearCache: true });
    expect(config.performance.cacheEnabled).toBe(false);
  });

  test('exports configuration to JSON file', async () => {
    const { exportConfiguration } = await import('./loader.js');
    const exportPath = join(TEST_TMP_DIR, 'exported-config.json');
    
    await exportConfiguration(exportPath);
    
    expect(existsSync(exportPath)).toBe(true);
    
    const exportedContent = JSON.parse(readFileSync(exportPath, 'utf-8'));
    expect(exportedContent).toEqual(DEFAULT_CONFIG);
  });

  test('adds .json extension if not provided', async () => {
    const { exportConfiguration } = await import('./loader.js');
    const exportPath = join(TEST_TMP_DIR, 'config-no-ext');
    
    await exportConfiguration(exportPath);
    
    expect(existsSync(exportPath + '.json')).toBe(true);
    
    const exportedContent = JSON.parse(readFileSync(exportPath + '.json', 'utf-8'));
    expect(exportedContent).toEqual(DEFAULT_CONFIG);
  });

  test('throws error when file exists without force', async () => {
    const { exportConfiguration } = await import('./loader.js');
    const exportPath = join(TEST_TMP_DIR, 'existing.json');
    
    // Create existing file
    writeFileSync(exportPath, '{}');
    
    await expect(exportConfiguration(exportPath, false)).rejects.toThrow('Configuration file already exists');
  });

  test('overwrites existing file with force flag', async () => {
    const { exportConfiguration } = await import('./loader.js');
    const exportPath = join(TEST_TMP_DIR, 'existing.json');
    
    // Create existing file with different content
    writeFileSync(exportPath, '{"test": true}');
    
    await exportConfiguration(exportPath, true);
    
    const exportedContent = JSON.parse(readFileSync(exportPath, 'utf-8'));
    expect(exportedContent).toEqual(DEFAULT_CONFIG);
  });

  test('creates directory if it doesn\'t exist', async () => {
    const { exportConfiguration } = await import('./loader.js');
    const subDir = join(TEST_TMP_DIR, 'new-dir');
    const exportPath = join(subDir, 'config.json');
    
    await exportConfiguration(exportPath);
    
    expect(existsSync(exportPath)).toBe(true);
    
    const exportedContent = JSON.parse(readFileSync(exportPath, 'utf-8'));
    expect(exportedContent).toEqual(DEFAULT_CONFIG);
  });
});