import { program } from 'commander'
import { generateReport } from '../report/generator.js'
import { validateGitRepository } from '../utils/git-validation.js'
import { ConsoleProgressReporter } from '../utils/progress-reporter.js'
import { ThrottledProgressReporter } from '../utils/throttled-progress-reporter.js'
import { isRepoStatError, formatError } from '../utils/errors.js'
import { loadConfiguration, validateConfiguration } from '../config/loader.js'
import type { ConfigOverrides } from '../config/loader.js'

export async function handleCLI(args: string[]): Promise<void> {
  program
    .name('repo-statter')
    .description('Generate repository statistics and reports')
    .version('1.0.0')
    
  program
    .argument('[repo-path]', 'Repository path (defaults to current directory)')
    .option('-r, --repo <path>', 'Repository path (alternative to positional argument)')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .option('--output-file <filename>', 'Custom output filename (overrides default naming)')
    .option('--max-commits <number>', 'Maximum number of recent commits to analyze')
    .option('--no-cache', 'Disable caching (always do full scan)')
    .option('--clear-cache', 'Clear existing cache before running')
    .option('--config <path>', 'Path to configuration file')
    .action(async (repoPath, options) => {
      const finalRepoPath = options.repo || repoPath || process.cwd()
      const outputDir = options.output
      const outputFile = options.outputFile
      
      try {
        await validateGitRepository(finalRepoPath)
        
        // Load configuration with CLI overrides
        const configOverrides: ConfigOverrides = {
          maxCommits: options.maxCommits ? parseInt(options.maxCommits, 10) : null,
          output: outputDir,
          outputFile: outputFile,
          noCache: options.noCache,
          clearCache: options.clearCache,
          configPath: options.config
        }
        
        const config = loadConfiguration(finalRepoPath, configOverrides)
        validateConfiguration(config)
        
        const consoleReporter = new ConsoleProgressReporter()
        const progressReporter = new ThrottledProgressReporter(consoleReporter, config.performance.progressThrottleMs)
        const cacheOptions = {
          useCache: config.performance.cacheEnabled,
          clearCache: options.clearCache || false
        }
        const reportPath = await generateReport(finalRepoPath, outputDir, progressReporter, config.analysis.maxCommits || undefined, outputFile, cacheOptions, config)
        console.log(`\nReport generated: ${reportPath}`)
      } catch (error) {
        if (isRepoStatError(error)) {
          console.error(`Error: ${error.message}`)
          if (error.code) {
            console.error(`Error code: ${error.code}`)
          }
        } else {
          console.error(`Unexpected error: ${formatError(error)}`, error)
        }
        process.exit(1)
      }
    })
    
  program.parse(args, { from: 'user' })
}