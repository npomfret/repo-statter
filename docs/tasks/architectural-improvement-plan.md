# Architectural Improvement Plan: Model-View-Controller Separation

## Overview

This document outlines a comprehensive plan to refactor the repo-statter codebase from its current "unified pipeline" architecture to a properly layered Model-View-Controller (MVC) architecture with clear separation of concerns.

## Current Architecture Problems

### Root Issues
- **Mixed Concerns**: `src/report/generator.ts:341` combines data processing with HTML generation
- **Tight Coupling**: Chart management (`src/visualization/charts.ts:22`) tightly coupled to data structures
- **Scattered Logic**: Template engine logic spread across utility functions
- **Configuration Pollution**: UI properties mixed with data processing configuration

### Data Flow Issues
```
Current: Git Parser → Unified Pipeline → Report Generator → HTML Template
                           ↓               ↓
                    Chart Factory ←── Chart Manager
```

**Problems:**
- Model logic (data processing) mixed with View logic (chart rendering)
- Controller logic (coordination) scattered throughout
- No clear boundaries between layers
- Difficult to test components independently
- Hard to reuse data logic in different contexts

## Target Architecture

### Clean Layer Separation
```
┌─────────────────────────────────────────────────────────────┐
│                     VIEW LAYER                              │
│  - Chart rendering (ApexCharts creation)                   │
│  - HTML template generation                                 │
│  - DOM manipulation                                         │
│  - Asset management (SVGs, CSS)                           │
└─────────────────────────────────────────────────────────────┘
                                ↑
┌─────────────────────────────────────────────────────────────┐
│                   CONTROLLER LAYER                          │
│  - Data flow coordination                                   │
│  - Model ↔ View data transformation                        │
│  - Configuration management                                 │
│  - Error handling and validation                           │
└─────────────────────────────────────────────────────────────┘
                                ↑
┌─────────────────────────────────────────────────────────────┐
│                     MODEL LAYER                             │
│  - Git data parsing                                         │
│  - Statistical calculations                                 │
│  - Business logic                                           │
│  - Pure data structures                                     │
└─────────────────────────────────────────────────────────────┘
```

### Benefits
- **Independent Testing**: Each layer can be tested in isolation
- **Reusability**: Model layer can be used in different contexts (CLI, web, API)
- **Maintainability**: Clear responsibilities reduce complexity
- **Extensibility**: Easy to add new chart types or export formats

## Implementation Plan

### Phase 1: Foundation Setup (Week 1)
**Goal**: Create new directory structure and base interfaces

#### 1.1 Create Model Layer Structure
```typescript
// src/model/
├── index.ts                    // Public model API exports
├── repository-analyzer.ts      // Core repository analysis logic
├── statistics-calculator.ts    // Statistical computations
├── data-aggregator.ts         // Data aggregation and transformation
├── types.ts                   // Pure data types (no UI concerns)
└── interfaces.ts              // Model layer contracts
```

#### 1.2 Create View Layer Structure
```typescript
// src/view/
├── index.ts                   // Public view API exports  
├── chart-renderer.ts          // Chart creation & rendering logic
├── html-generator.ts          // HTML template processing
├── asset-manager.ts           // Static asset handling (SVGs, CSS)
├── types.ts                   // View-specific types
└── interfaces.ts              // View layer contracts
```

#### 1.3 Create Controller Layer Structure
```typescript
// src/controller/
├── index.ts                   // Public controller API exports
├── report-controller.ts       // Main report generation orchestration
├── data-formatter.ts          // Model→View data transformation
├── config-manager.ts          // Configuration handling
└── interfaces.ts              // Controller layer contracts
```

#### 1.4 Define Layer Interfaces
```typescript
// src/model/interfaces.ts
export interface IRepositoryAnalyzer {
  analyzeRepository(path: string): Promise<RepositoryStats>
  calculateMetrics(commits: CommitData[]): RepositoryMetrics
}

// src/view/interfaces.ts  
export interface IChartRenderer {
  renderChart(type: string, data: any, options: ChartOptions): ApexCharts
  renderAllCharts(data: FormattedChartData): void
}

// src/controller/interfaces.ts
export interface IReportController {
  generateReport(options: ReportOptions): Promise<string>
}
```

### Phase 2: Extract Model Layer (Week 2)
**Goal**: Move pure data processing logic to model layer

#### 2.1 Extract Repository Analysis Logic
**Source**: `src/report/generator.ts` lines 190-260
**Target**: `src/model/repository-analyzer.ts`

```typescript
// src/model/repository-analyzer.ts
export class RepositoryAnalyzer implements IRepositoryAnalyzer {
  async analyzeRepository(repoPath: string): Promise<RepositoryStats> {
    // Extract pure analysis logic from generator.ts
    // Calculate: totalCommits, totalLinesOfCode, totalContributors, activeDays
    // NO HTML generation, NO chart formatting
  }
  
  calculateMetrics(commits: CommitData[]): RepositoryMetrics {
    // Extract statistical calculations
    // Return pure data structures
  }
}
```

#### 2.2 Move Data Pipeline to Model
**Action**: Rename `src/data/unified-pipeline.ts` → `src/model/data-pipeline.ts`
**Rationale**: Already contains mostly pure data processing logic

#### 2.3 Clean Model Types
**Source**: `src/data/types.ts`
**Target**: `src/model/types.ts`

```typescript
// Remove any UI-specific properties
export interface RepositoryStats {
  totalCommits: number
  totalLinesOfCode: number
  totalContributors: number  
  activeDays: number
  // NO chart configuration
  // NO rendering options
}
```

### Phase 3: Extract View Layer (Week 3)
**Goal**: Move presentation logic to view layer

#### 3.1 Extract Chart Rendering Logic
**Source**: `src/visualization/charts/chart-factory.ts`
**Target**: `src/view/chart-renderer.ts`

```typescript
// src/view/chart-renderer.ts
export class ChartRenderer implements IChartRenderer {
  renderChart(type: string, data: any, options: ChartOptions): ApexCharts {
    // Pure chart creation logic
    // Focus on ApexCharts instantiation
    // NO data processing
  }
  
  renderAllCharts(data: FormattedChartData): void {
    // Chart orchestration logic
    // Extract from charts.ts renderAllCharts()
  }
}
```

#### 3.2 Extract HTML Generation
**Source**: `src/report/generator.ts` `injectDataIntoTemplate()`
**Target**: `src/view/html-generator.ts`

```typescript
// src/view/html-generator.ts
export class HtmlGenerator {
  generateReport(templateData: TemplateData): string {
    // Pure template processing
    // HTML string manipulation
    // Asset injection
  }
  
  loadTemplate(): string {
    // Template file loading
  }
}
```

#### 3.3 Refactor Chart Manager
**Action**: Clean `src/visualization/charts/chart-manager.ts`
- Remove data processing logic
- Focus on chart lifecycle management  
- Remove file type filtering (move to controller)

### Phase 4: Create Controller Layer (Week 4)
**Goal**: Implement coordination between model and view

#### 4.1 Main Report Controller
```typescript
// src/controller/report-controller.ts
export class ReportController implements IReportController {
  constructor(
    private analyzer: IRepositoryAnalyzer,
    private renderer: IChartRenderer,
    private htmlGenerator: IHtmlGenerator
  ) {}
  
  async generateReport(options: ReportOptions): Promise<string> {
    // 1. Use model layer to analyze repository
    const stats = await this.analyzer.analyzeRepository(options.repoPath)
    
    // 2. Format data for view layer
    const formatter = new DataFormatter()
    const viewData = formatter.formatForCharts(stats)
    
    // 3. Use view layer to generate output
    const html = this.htmlGenerator.generateReport(viewData)
    
    return html
  }
}
```

#### 4.2 Data Formatting Bridge
```typescript
// src/controller/data-formatter.ts
export class DataFormatter {
  formatForCharts(stats: RepositoryStats): FormattedChartData {
    // Transform model data → view-friendly format
    // Handle null/empty cases
    // Apply view-specific transformations
    // NO business logic
  }
  
  formatForTemplate(stats: RepositoryStats): TemplateData {
    // Format data for HTML template variables
  }
}
```

#### 4.3 Configuration Management
**Action**: Split configuration by layer
```typescript
// src/model/config.ts - Analysis configuration
export interface ModelConfig {
  exclusions: ExclusionConfig
  maxCommits?: number
  // Data processing only
}

// src/view/config.ts - Rendering configuration  
export interface ViewConfig {
  charts: ChartConfig
  fileTypes: FileTypeConfig
  // UI/presentation only
}

// src/controller/config.ts - Orchestration
export interface ControllerConfig {
  outputPath: string
  cacheOptions: CacheOptions
  // Flow control only
}
```

### Phase 5: Migration & Integration (Week 5)
**Goal**: Integrate new architecture while maintaining backward compatibility

#### 5.1 Update Main Entry Point
```typescript
// src/report/generator.ts (refactored)
import { ReportController } from '../controller/report-controller.js'
import { RepositoryAnalyzer } from '../model/repository-analyzer.js'
import { ChartRenderer } from '../view/chart-renderer.js'

export async function generateReport(...args): Promise<string> {
  // Feature flag for gradual migration
  if (process.env.USE_NEW_ARCHITECTURE === 'true') {
    const analyzer = new RepositoryAnalyzer()
    const renderer = new ChartRenderer()  
    const htmlGenerator = new HtmlGenerator()
    const controller = new ReportController(analyzer, renderer, htmlGenerator)
    
    return controller.generateReport({ /* map args */ })
  } else {
    // Legacy implementation (preserve during migration)
    return legacyGenerateReport(...args)
  }
}
```

#### 5.2 Gradual Feature Flag Migration
```typescript
// src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_MODEL_LAYER: process.env.NODE_ENV === 'development',
  USE_NEW_VIEW_LAYER: false,
  USE_NEW_CONTROLLER_LAYER: false,
  ENABLE_LAYERED_ARCHITECTURE: false
}
```

#### 5.3 Update Import Paths
- Update all internal imports to use new layer structure
- Maintain backward compatibility for public APIs
- Use TypeScript path mapping for clean imports

### Phase 6: Testing & Cleanup (Week 6)
**Goal**: Validate new architecture and remove legacy code

#### 6.1 Layer-Specific Testing
```typescript
// tests/model/repository-analyzer.test.ts
describe('RepositoryAnalyzer', () => {
  it('should calculate repository stats without side effects', () => {
    // Pure unit tests for model logic
  })
})

// tests/view/chart-renderer.test.ts  
describe('ChartRenderer', () => {
  it('should render charts without data processing', () => {
    // DOM/rendering tests
  })
})

// tests/controller/report-controller.test.ts
describe('ReportController', () => {
  it('should coordinate between model and view layers', () => {
    // Integration tests
  })
})
```

#### 6.2 Migration Validation
- Run full test suite to ensure no regressions
- Compare generated reports byte-for-byte with legacy version
- Performance benchmarking
- Memory usage analysis

#### 6.3 Legacy Code Removal
- Remove feature flags once migration is complete
- Delete old mixed-concern functions
- Clean up unused dependencies
- Update documentation

## Migration Strategy

### Backward Compatibility
- Maintain existing `generateReport()` function signature
- Use feature flags for gradual activation
- Keep legacy implementation during transition
- Provide migration path for custom configurations

### Risk Mitigation
- **Rollback Plan**: Feature flags allow instant rollback to legacy architecture
- **Incremental Migration**: Each phase can be tested independently
- **Parallel Implementation**: New architecture runs alongside old during transition
- **Comprehensive Testing**: Layer-specific tests plus end-to-end validation

### Deployment Strategy
1. **Development**: Enable new architecture with feature flags
2. **Testing**: Run both architectures in parallel, compare outputs
3. **Staging**: Gradually enable new layers with monitoring
4. **Production**: Full migration with instant rollback capability

## Success Metrics

### Code Quality
- [ ] Model layer has 0 DOM dependencies
- [ ] View layer has 0 business logic
- [ ] Controller layer has clear, single responsibilities
- [ ] 100% test coverage for each layer

### Maintainability
- [ ] New chart types can be added without touching model layer
- [ ] Data processing logic can be reused in different contexts
- [ ] Configuration changes don't require code changes
- [ ] Independent deployment of layer improvements

### Performance
- [ ] No performance regression in report generation
- [ ] Improved memory usage through better separation
- [ ] Faster development through independent layer testing
- [ ] Reduced bundle size through better tree-shaking

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create model layer directory structure
- [ ] Create view layer directory structure  
- [ ] Create controller layer directory structure
- [ ] Define layer interfaces and contracts
- [ ] Set up feature flags system

### Phase 2: Model Layer
- [ ] Extract RepositoryAnalyzer from generator.ts
- [ ] Move unified-pipeline to model layer
- [ ] Clean model types (remove UI concerns)
- [ ] Create model layer tests
- [ ] Validate model layer isolation

### Phase 3: View Layer
- [ ] Extract ChartRenderer from chart-factory
- [ ] Extract HtmlGenerator from generator.ts
- [ ] Refactor ChartManager (remove data processing)
- [ ] Create view layer tests
- [ ] Validate view layer isolation

### Phase 4: Controller Layer
- [ ] Implement ReportController
- [ ] Create DataFormatter bridge
- [ ] Split configuration by layer
- [ ] Create controller tests
- [ ] Validate layer coordination

### Phase 5: Integration
- [ ] Update main entry points
- [ ] Implement feature flag migration
- [ ] Update import paths
- [ ] Run integration tests
- [ ] Performance validation

### Phase 6: Cleanup
- [ ] Complete test coverage
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Production deployment
- [ ] Monitor and validate

## Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1 | Week 1 | Foundation structure and interfaces |
| 2 | Week 2 | Model layer extraction and testing |
| 3 | Week 3 | View layer extraction and testing |
| 4 | Week 4 | Controller layer implementation |
| 5 | Week 5 | Integration and migration |
| 6 | Week 6 | Testing, cleanup, and deployment |

**Total Estimated Time**: 6 weeks

## Expected Outcomes

### Short-term Benefits
- Clear separation of concerns
- Independent testing of components
- Easier debugging and maintenance
- Better code organization

### Long-term Benefits
- Reusable data processing logic
- Easy addition of new export formats
- Pluggable chart rendering system
- Simplified configuration management
- Improved performance through better caching boundaries

This architectural improvement will transform repo-statter from a monolithic pipeline into a maintainable, extensible, and testable system while preserving all existing functionality.