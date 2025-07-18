import { program } from 'commander'
import { generateReport } from '../report/generator.js'
import { validateGitRepository } from '../utils/git-validation.js'
import { ConsoleProgressReporter } from '../utils/progress-reporter.js'
import { ThrottledProgressReporter } from '../utils/throttled-progress-reporter.js'

export async function handleCLI(args: string[]): Promise<void> {
  program
    .name('repo-statter')
    .description('Generate repository statistics and reports')
    .version('1.0.0')
    
  program
    .argument('[repo-path]', 'Repository path (defaults to current directory)')
    .option('-r, --repo <path>', 'Repository path (alternative to positional argument)')
    .option('-o, --output <dir>', 'Output directory', 'dist')
    .action(async (repoPath, options) => {
      const finalRepoPath = options.repo || repoPath || process.cwd()
      const outputDir = options.repo ? 'analysis' : options.output
      
      try {
        await validateGitRepository(finalRepoPath)
        const consoleReporter = new ConsoleProgressReporter()
        const progressReporter = new ThrottledProgressReporter(consoleReporter, 200)
        await generateReport(finalRepoPath, outputDir, progressReporter)
      } catch (error: any) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
      }
    })
    
  program.parse(args, { from: 'user' })
}