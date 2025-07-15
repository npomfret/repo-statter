import { access } from 'fs/promises'
import { generateReport } from '../report/generator.js'

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
      await access(repoPath)
    } catch {
      console.error(`Error: Repository path does not exist: ${repoPath}`)
      process.exit(1)
    }
    
    await generateReport(repoPath, 'analysis')
  } else if (args.length > 0 && args[0]) {
    await generateReport(args[0], 'dist')
  } else {
    console.error('Usage:')
    console.error('  npm run start <repo-path>')
    console.error('  npm run analyse -- --repo <repo-path>')
    process.exit(1)
  }
}