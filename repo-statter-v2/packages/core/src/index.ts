/**
 * @repo-statter/core - Core functionality for repo-statter
 * 
 * This package provides the fundamental types, utilities, and
 * business logic for the repo-statter git analysis tool.
 */

// Export all type definitions
export * from './types/index.js'

// Export error handling utilities
export * from './errors/index.js'

// Export logging utilities
export * from './logging/index.js'

// Export git operations
export { GitRepository } from './git/repository.js'
export { StreamingGitParser } from './git/streaming-parser.js'

// Export analysis functionality
export { AnalysisEngine, AnalysisEngineError } from './analysis/engine.js'

// Version information
export const VERSION = '2.0.0-alpha.0'