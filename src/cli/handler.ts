import { existsSync } from 'fs'
import { generateReport } from '../report/generator.js'

export function handleCLI(args: string[]): void {
  if (args.includes('--repo')) {
    const repoIndex = args.indexOf('--repo')
    const repoPath = args[repoIndex + 1]
    
    if (!repoPath) {
      console.error('Error: --repo requires a path argument')
      console.error('Usage: npm run analyse -- --repo /path/to/repository')
      process.exit(1)
    }
    
    if (!existsSync(repoPath)) {
      console.error(`Error: Repository path does not exist: ${repoPath}`)
      process.exit(1)
    }
    
    generateReport(repoPath, 'analysis').catch(error => {
      console.error('Error generating report:', error)
      process.exit(1)
    })
  } else if (args.length > 0 && args[0]) {
    generateReport(args[0], 'dist').catch(error => {
      console.error('Error generating report:', error)
      process.exit(1)
    })
  } else {
    console.error('Usage:')
    console.error('  npm run build <repo-path>')
    console.error('  npm run analyse -- --repo <repo-path>')
    process.exit(1)
  }
}