import { program } from 'commander'
import { generateReport } from '../report/generator.js'
import { validateGitRepository } from '../utils/git-validation.js'

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
        await generateReport(finalRepoPath, outputDir)
      } catch (error: any) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
      }
    })
    
  program.parse(args, { from: 'user' })
}