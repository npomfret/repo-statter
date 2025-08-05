# Phase 1: Foundation and Core Infrastructure

## Overview
Establish the monorepo structure, build systems, TypeScript configuration, and core type definitions that all other phases will build upon.

## Goals
1. Set up a robust monorepo with proper tooling
2. Define all core types and interfaces
3. Create the browser playground for component testing
4. Establish coding standards and patterns

## Tasks

### 1.1 Monorepo Setup

#### Description
Set up a modern monorepo using pnpm workspaces with proper build tooling.

#### Implementation
```bash
# Repository structure
repo-statter-v2/
├── pnpm-workspace.yaml
├── package.json (root)
├── .npmrc
├── tsconfig.json (root)
├── vitest.config.ts (root)
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── visualizations/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── report-builder/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/
│       ├── package.json
│       └── tsconfig.json
└── apps/
    ├── playground/
    │   ├── package.json
    │   └── vite.config.ts
    └── e2e/
        ├── package.json
        └── playwright.config.ts
```

#### Testing
- Verify all packages can reference each other
- Ensure TypeScript paths resolve correctly
- Test that build commands work for all packages

### 1.2 TypeScript Configuration

#### Description
Set up strict TypeScript configuration with proper project references.

#### Root tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/visualizations" },
    { "path": "./packages/report-builder" },
    { "path": "./packages/cli" }
  ]
}
```

#### Testing
- No TypeScript errors in strict mode
- All imports resolve correctly
- Type definitions are generated

### 1.3 Core Type Definitions

#### Description
Define all shared types that will be used across the application.

#### packages/core/src/types/git.ts
```typescript
export interface CommitInfo {
  sha: string
  author: string
  email: string
  timestamp: Date
  message: string
  stats: CommitStats
}

export interface CommitStats {
  filesChanged: number
  additions: number
  deletions: number
  files: FileChange[]
}

export interface FileChange {
  path: string
  additions: number
  deletions: number
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  oldPath?: string // for renames
}

export interface RepositoryInfo {
  path: string
  name: string
  remote?: string
  branch: string
  totalCommits: number
  firstCommitDate: Date
  lastCommitDate: Date
}
```

#### packages/core/src/types/analysis.ts
```typescript
export interface TimeSeriesPoint {
  date: Date
  value: number
  metadata?: Record<string, unknown>
}

export interface FileMetrics {
  path: string
  currentLines: number
  totalCommits: number
  totalChurn: number
  complexity: number
  lastModified: Date
  contributors: Set<string>
}

export interface ContributorStats {
  name: string
  email: string
  commits: number
  additions: number
  deletions: number
  filesModified: Set<string>
  firstCommit: Date
  lastCommit: Date
}

export interface AnalysisResult {
  repository: RepositoryInfo
  timeSeries: {
    commits: TimeSeriesPoint[]
    linesOfCode: TimeSeriesPoint[]
    contributors: TimeSeriesPoint[]
    fileTypes: Map<string, TimeSeriesPoint[]>
  }
  currentState: {
    totalLines: number
    fileMetrics: Map<string, FileMetrics>
    contributors: Map<string, ContributorStats>
    fileTypes: Map<string, number>
  }
}
```

#### Testing
- Types compile without errors
- All properties are documented
- Types are exported correctly

### 1.4 Browser Playground Setup

#### Description
Create a Vite-based playground for testing visualization components in isolation.

#### apps/playground/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Repo-Statter Component Playground</title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>Repo-Statter Component Playground</h1>
      <nav>
        <select id="component-selector">
          <option value="">Select a component...</option>
          <option value="growth-chart">Growth Over Time Chart</option>
          <option value="file-types-pie">File Types Pie Chart</option>
          <option value="contributor-bars">Contributor Bar Chart</option>
          <option value="metric-card">Metric Card</option>
          <option value="time-slider">Time Range Slider</option>
        </select>
      </nav>
    </header>
    
    <main>
      <section id="controls">
        <h2>Component Controls</h2>
        <div id="control-panel"></div>
      </section>
      
      <section id="preview">
        <h2>Preview</h2>
        <div id="component-container"></div>
      </section>
      
      <section id="code">
        <h2>Usage Example</h2>
        <pre><code id="code-example"></code></pre>
      </section>
    </main>
  </div>
  
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

#### apps/playground/src/main.ts
```typescript
import { fixtures } from './fixtures'
import { ComponentRegistry } from './registry'

const selector = document.getElementById('component-selector') as HTMLSelectElement
const container = document.getElementById('component-container') as HTMLDivElement
const controlPanel = document.getElementById('control-panel') as HTMLDivElement
const codeExample = document.getElementById('code-example') as HTMLElement

selector.addEventListener('change', async (e) => {
  const componentName = (e.target as HTMLSelectElement).value
  if (!componentName) return
  
  // Clear previous component
  container.innerHTML = ''
  controlPanel.innerHTML = ''
  
  // Load and render new component
  const component = await ComponentRegistry.get(componentName)
  const controls = component.createControls()
  const instance = component.create(fixtures[componentName])
  
  controlPanel.appendChild(controls)
  container.appendChild(instance)
  codeExample.textContent = component.getExample()
})
```

#### Testing
- Playground loads without errors
- Components can be selected and rendered
- Controls update component in real-time
- Code examples are accurate

### 1.5 Development Tooling

#### Description
Set up ESLint, Prettier, and git hooks for code quality.

#### .eslintrc.js
```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json', './packages/*/tsconfig.json']
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}
```

#### .prettierrc
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5",
  "arrowParens": "avoid"
}
```

#### Testing
- ESLint catches type errors
- Prettier formats consistently
- Git hooks prevent bad commits

### 1.6 Error Handling Foundation

#### Description
Create base error classes and error handling utilities.

#### packages/core/src/errors/base.ts
```typescript
export abstract class RepoStatterError extends Error {
  abstract code: string
  abstract userMessage: string
  
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = this.constructor.name
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      stack: this.stack
    }
  }
}

export class GitOperationError extends RepoStatterError {
  code = 'GIT_OPERATION_ERROR'
  
  get userMessage(): string {
    if (this.message.includes('not a git repository')) {
      return 'This directory is not a git repository. Please run from within a git repository.'
    }
    return `Git operation failed: ${this.message}`
  }
}

export class ConfigurationError extends RepoStatterError {
  code = 'CONFIGURATION_ERROR'
  
  get userMessage(): string {
    return `Configuration error: ${this.message}`
  }
}
```

#### Testing
- Error classes extend properly
- User messages are helpful
- JSON serialization works
- Stack traces are preserved

### 1.7 Logging Infrastructure

#### Description
Set up structured logging with different verbosity levels.

#### packages/core/src/logging/logger.ts
```typescript
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogContext {
  timestamp: Date
  level: LogLevel
  message: string
  data?: Record<string, unknown>
  error?: Error
}

export class Logger {
  constructor(
    private name: string,
    private level: LogLevel = LogLevel.INFO
  ) {}
  
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error)
  }
  
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data)
  }
  
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data)
  }
  
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data)
  }
  
  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (level > this.level) return
    
    const context: LogContext = {
      timestamp: new Date(),
      level,
      message: `[${this.name}] ${message}`,
      data,
      error
    }
    
    this.writeLog(context)
  }
  
  private writeLog(context: LogContext): void {
    // In development, use console
    // In production, could write to file or service
    const levelName = LogLevel[context.level]
    const method = context.level === LogLevel.ERROR ? 'error' : 'log'
    
    console[method](`[${levelName}]`, context.message, context.data || '')
    if (context.error) {
      console.error(context.error)
    }
  }
}
```

#### Testing
- Logging at different levels works
- Log level filtering works
- Structured data is included
- Errors are logged with stack traces

## Deliverables

1. **Monorepo Structure**: Complete pnpm workspace setup
2. **Type Definitions**: All core types defined and documented
3. **Browser Playground**: Working component testing environment
4. **Development Tools**: ESLint, Prettier, git hooks configured
5. **Error Handling**: Base error classes and utilities
6. **Logging**: Structured logging system

## Success Criteria

- [ ] All packages build without errors
- [ ] TypeScript strict mode passes
- [ ] Playground can render a sample component
- [ ] ESLint and Prettier are working
- [ ] Error handling patterns established
- [ ] Logging system operational

## Next Phase

With the foundation in place, Phase 2 will implement the core git operations and data extraction layer.