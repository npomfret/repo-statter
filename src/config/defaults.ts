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
    topContributorsLimit: 10,
    fileHeatmapHeight: 400,
    fileHeatmapMaxFiles: 100,
    topFilesChartHeight: 400
  },
  
  performance: {
    progressThrottleMs: 200,
    cacheEnabled: true,
    cacheVersion: '1.0',
    cacheDirName: 'repo-statter-cache'
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
  },
  
  fileTypes: {
    mappings: {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'SCSS',
      '.html': 'HTML',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.cc': 'C++',
      '.cxx': 'C++',
      '.c': 'C',
      '.go': 'Go',
      '.rs': 'Rust',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.xml': 'XML',
      '.sh': 'Shell',
      '.bash': 'Shell',
      '.zsh': 'Shell',
      '.fish': 'Shell',
      '.ps1': 'PowerShell',
      '.psm1': 'PowerShell',
      '.psd1': 'PowerShell',
      '.bat': 'Batch',
      '.cmd': 'Batch',
      '.dockerfile': 'Dockerfile',
      '.makefile': 'Makefile',
      '.mk': 'Makefile',
      '.gitignore': 'Git',
      '.gitattributes': 'Git',
      '.toml': 'TOML',
      '.ini': 'INI',
      '.cfg': 'Config',
      '.conf': 'Config',
      '.properties': 'Properties',
      '.env': 'Environment',
      '.sql': 'SQL',
      '.r': 'R',
      '.R': 'R',
      '.scala': 'Scala',
      '.gradle': 'Gradle',
      '.lua': 'Lua',
      '.vim': 'VimScript',
      '.pl': 'Perl',
      '.pm': 'Perl'
    },
    binaryExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
      '.exe', '.dll', '.so', '.dylib', '.lib', '.a',
      '.class', '.jar', '.war', '.ear', '.pyc', '.pyo',
      '.ttf', '.otf', '.woff', '.woff2', '.eot',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv',
      '.db', '.sqlite', '.sqlite3',
      '.bin', '.dat', '.img', '.iso'
    ]
  },
  
  textAnalysis: {
    stopWords: [
      'the', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
      'can', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'under', 'since', 'without', 'within', 'along',
      'following', 'across', 'behind', 'beyond', 'plus', 'except', 'but', 'yet', 'so',
      'if', 'then', 'than', 'such', 'both', 'either', 'neither', 'all', 'each',
      'every', 'any', 'some', 'no', 'not', 'only', 'just', 'also', 'very',
      'too', 'quite', 'almost', 'always', 'often', 'never', 'seldom', 'rarely', 'usually',
      'generally', 'sometimes', 'now', 'then', 'once', 'twice', 'first', 'second', 'last',
      'next', 'previous', 'few', 'many', 'much', 'more', 'most', 'less', 'least',
      'own', 'same', 'other', 'another', 'such', 'what', 'which', 'who', 'whom',
      'whose', 'where', 'when', 'why', 'how', 'here', 'there', 'where', 'everywhere',
      'anywhere', 'somewhere', 'nowhere', 'this', 'that', 'these', 'those', 'it', 'its',
      'they', 'them', 'their', 'theirs', 'we', 'us', 'our', 'ours', 'you',
      'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'i',
      'me', 'my', 'mine', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves',
      'yourselves', 'themselves', 'yes', 'no', 'as', 'because', 'while', 'until', 'although',
      'though', 'unless', 'however', 'therefore', 'thus', 'hence', 'moreover', 'furthermore', 'meanwhile'
    ]
  }
};