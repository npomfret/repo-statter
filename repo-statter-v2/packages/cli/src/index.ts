#!/usr/bin/env node
import { Command } from 'commander'
import { analyzeCommand } from './commands/analyze.js'
// import { Logger } from '@repo-statter/core' // Will be used for logging configuration

// Read version from package.json (this would be handled by build process)
const version = '2.0.0-alpha.0'

const program = new Command()

program
  .name('repo-statter')
  .description('Analyze git repositories and generate beautiful reports')
  .version(version)

program
  .command('analyze [path]')
  .description('Analyze a git repository')
  .option('-o, --output <path>', 'Output file path', 'repo-analysis.html')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--theme <theme>', 'Report theme (light/dark/auto)', 'auto')
  .option('--no-cache', 'Disable caching')
  .option('--max-commits <number>', 'Maximum commits to analyze', parseInt)
  .option('--include <pattern>', 'File patterns to include')
  .option('--exclude <pattern>', 'File patterns to exclude')
  .option('--verbose', 'Enable verbose logging')
  .option('--json', 'Also output raw JSON data')
  .option('--inline-assets', 'Inline all assets in HTML')
  .option('--minify', 'Minify HTML output')
  .action(analyzeCommand)

program
  .command('cache')
  .description('Manage analysis cache')
  .option('--clear', 'Clear all cache')
  .option('--size', 'Show cache size')
  .action(async (options) => {
    try {
      // This would use the actual CacheManager when available
      console.log('Cache management not yet implemented')
      
      if (options.clear) {
        console.log('Cache cleared')
      } else if (options.size) {
        console.log('Cache size: 0.00 MB')
      }
    } catch (error) {
      console.error('Cache operation failed:', error)
      process.exit(1)
    }
  })

// Parse arguments
program.parse(process.argv)