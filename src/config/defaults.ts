import type { RepoStatterConfig } from './schema.js';

export const DEFAULT_CONFIG: RepoStatterConfig = {
  version: '1.0',
  
  analysis: {
    maxCommits: null,
    bytesPerLineEstimate: 50,
    timeSeriesHourlyThresholdHours: 48
  },
  
  wordCloud: {
    minWordLength: 3,
    maxWords: 100,
    minSize: 10,
    maxSize: 80
  },
  
  fileHeat: {
    recencyDecayDays: 30,
    frequencyWeight: 0.4,
    recencyWeight: 0.6,
    maxFilesDisplayed: 100
  },
  
  charts: {
    wordCloudHeight: 400,
    topContributorsLimit: 10
  },
  
  performance: {
    progressThrottleMs: 200,
    cacheEnabled: true
  },
  
  exclusions: {
    patterns: [
      // Images
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.png',
      '**/*.gif',
      '**/*.svg',
      '**/*.bmp',
      '**/*.webp',
      
      // Documents
      '**/*.md',
      '**/*.pdf',
      '**/*.doc',
      '**/*.docx',
      '**/*.xls',
      '**/*.xlsx',
      
      // Lock files
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
      '**/composer.lock',
      '**/Cargo.lock',
      '**/poetry.lock',
      '**/Pipfile.lock',
      '**/Gemfile.lock',
      
      // Build & dependency directories
      '**/node_modules/**/*',
      '**/dist/**/*',
      '**/build/**/*',
      '**/target/**/*',
      '**/vendor/**/*',
      '**/coverage/**/*',
      '**/test-results/**/*',
      '**/reports/**/*',
      '**/out/**/*',
      '**/bin/**/*',
      '**/obj/**/*',
      
      // Git files
      '.git/**/*',
      '**/.gitignore',
      '**/.gitattributes',
      
      // Environment files
      '**/.env',
      '**/.env.*',
      
      // IDE and editor files
      '**/.vscode/**/*',
      '**/.idea/**/*',
      '**/.*.swp',
      '**/.*.swo',
      '**/*~',
      
      // System files
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.log',
      '**/*.tmp',
      '**/*.cache',
      
      // Language-specific artifacts
      '**/__pycache__/**/*',
      '**/*.pyc',
      '**/*.pyo',
      '**/*.class',
      '**/*.jar',
      '**/*.war',
      '**/*.ear'
    ]
  }
};