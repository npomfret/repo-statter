import { program } from 'commander'
import { generateReport } from '../report/generator.js'
import { validateGitRepository } from '../utils/git-validation.js'
import { ConsoleProgressReporter } from '../utils/progress-reporter.js'
import { ThrottledProgressReporter } from '../utils/throttled-progress-reporter.js'
import { isRepoStatError, formatError } from '../utils/errors.js'

export async function handleCLI(args: string[]): Promise<void> {
  program
    .name('repo-statter')
    .description('Generate repository statistics and reports')
    .version('1.0.0')
    
  program
    .argument('[repo-path]', 'Repository path (defaults to current directory)')
    .option('-r, --repo <path>', 'Repository path (alternative to positional argument)')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .option('--max-commits <number>', 'Maximum number of recent commits to analyze', '1000')
    .action(async (repoPath, options) => {
      const finalRepoPath = options.repo || repoPath || process.cwd()
      const outputDir = options.output
      
      try {
        await validateGitRepository(finalRepoPath)
        const consoleReporter = new ConsoleProgressReporter()
        const progressReporter = new ThrottledProgressReporter(consoleReporter, 200)
        const maxCommits = parseInt(options.maxCommits, 10)
        const reportPath = await generateReport(finalRepoPath, outputDir, progressReporter, maxCommits)
        console.log(`\nReport generated: ${reportPath}`)
      } catch (error) {
        if (isRepoStatError(error)) {
          console.error(`Error: ${error.message}`)
          if (error.code) {
            console.error(`Error code: ${error.code}`)
          }
        } else {
          console.error(`Unexpected error: ${formatError(error)}`)
        }
        process.exit(1)
      }
    })
    
  program.parse(args, { from: 'user' })
}