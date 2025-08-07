/**
 * Global teardown for Playwright tests
 * Cleans up test environment and stops services
 */

import { FullConfig } from '@playwright/test'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')
  
  try {
    // Kill any remaining processes
    console.log('🔄 Cleaning up processes...')
    
    try {
      // Kill any Vite dev servers
      await execAsync('pkill -f "vite.*dev"').catch(() => {
        // Ignore errors if no processes found
      })
      
      // Kill any Node processes running on port 5173
      await execAsync('lsof -ti:5173 | xargs kill -9').catch(() => {
        // Ignore errors if port is not in use
      })
    } catch (error) {
      // Ignore cleanup errors on different platforms
      console.log('⚠️ Process cleanup completed (some processes may not have been running)')
    }
    
    // Generate test report summary
    console.log('📊 Generating test report summary...')
    
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        ci: !!process.env.CI
      },
      testResults: {
        // This would be populated by the test runner
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    }
    
    // Write report summary
    await execAsync(`echo '${JSON.stringify(reportData, null, 2)}' > test-results/summary.json`)
    
    console.log('✅ Global teardown completed successfully')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't exit with error for teardown failures
  }
}

export default globalTeardown