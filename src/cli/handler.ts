import { generateReport } from '../report/generator.js'
import { validateGitRepository } from '../utils/git-validation.js'

export async function handleCLI(args: string[]): Promise<void> {
  if (args.includes('--repo')) {
    const repoIndex = args.indexOf('--repo')
    const repoPath = args[repoIndex + 1]
    
    if (!repoPath) {
      console.error('Error: --repo requires a path argument')
      console.error('Usage: npm run analyse -- --repo /path/to/repository')
      process.exit(1)
    }
    
    try {
      await validateGitRepository(repoPath)
    } catch (error: any) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }
    
    await generateReport(repoPath, 'analysis')
  } else if (args.length > 0 && args[0]) {
    try {
      await validateGitRepository(args[0])
    } catch (error: any) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }
    await generateReport(args[0], 'dist')
  } else {
    console.error('Usage:')
    console.error('  npm run start <repo-path>')
    console.error('  npm run analyse -- --repo <repo-path>')
    process.exit(1)
  }
}