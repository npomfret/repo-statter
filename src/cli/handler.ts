import { program } from 'commander'
import { generateReport } from '../report/generator.js'
import { validateGitRepository } from '../utils/git-validation.js'
import { ConsoleProgressReporter } from '../utils/progress-reporter.js'
import { ThrottledProgressReporter } from '../utils/throttled-progress-reporter.js'
import { isRepoStatError, formatError } from '../utils/errors.js'
import { loadConfiguration, exportConfiguration } from '../config/unified-loader.js'
import { getGitHubUrl, getRepositoryName } from '../git/parser.js'
import { basename, resolve, join } from 'path'
import { tmpdir } from 'os'
import type { ConfigOverrides } from '../config/unified-loader.js'

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
    .option('--max-commits <number>', 'Analyze only the N most recent commits (improves performance for large repos)')
    .option('--no-cache', 'Disable caching (always do full scan)')
    .option('--clear-cache', 'Clear existing cache before running')
    .option('--config-file <path>', 'Path to configuration file')
    .option('--export-config <path>', 'Export default configuration to specified file')
    .option('--force', 'Force overwrite existing files when exporting configuration')
    .action(async (repoPath, options) => {
      const finalRepoPath = options.repo || repoPath || process.cwd()
      const outputDir = options.output
      const outputFile = options.outputFile
      
      try {
        await validateGitRepository(finalRepoPath)
        
        // Handle config export first
        if (options.exportConfig) {
          await exportConfiguration(options.exportConfig, options.force || false);
          console.log(`Configuration exported to: ${options.exportConfig}`);
          console.log(`\nNext steps:`);
          console.log(`1. Edit ${options.exportConfig} to customize settings`);
          console.log(`2. Use --config-file ${options.exportConfig} to apply your configuration`);
          return;
        }

        // Load configuration with CLI overrides
        const configOverrides: ConfigOverrides = {
          maxCommits: options.maxCommits ? parseInt(options.maxCommits, 10) : null,
          output: outputDir,
          outputFile: outputFile,
          noCache: options.noCache,
          clearCache: options.clearCache,
          configPath: options.configFile
        }
        
        const config = loadConfiguration(configOverrides)
        
        // Display repository information
        let repoName = await getRepositoryName(finalRepoPath)
        if (!repoName) {
          repoName = basename(resolve(finalRepoPath))
        }
        const outputPath = resolve(outputDir)
        const cacheDir = join(tmpdir(), config.performance.cacheDirName)
        
        console.log(`\nAnalyzing repository: ${repoName}`)
        console.log(`Repository path: ${finalRepoPath}`)
        console.log(`Output directory: ${outputPath}`)
        console.log(`Cache directory: ${cacheDir}`)
        
        try {
          const githubUrl = await getGitHubUrl(finalRepoPath)
          if (githubUrl) {
            console.log(`Repository URL: ${githubUrl}`)
          }
        } catch {
          // Silently ignore if we can't get the URL
        }
        console.log('')
        
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