/**
 * Global setup for Playwright tests
 * Prepares test environment and starts services
 */

import { chromium, FullConfig } from '@playwright/test'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  try {
    // Build visualization components if needed
    console.log('📦 Building visualization components...')
    await execAsync('pnpm build', {
      cwd: process.cwd(),
      timeout: 120000
    })
    
    // Start the playground dev server if not already running
    console.log('🌐 Checking playground server...')
    
    const browser = await chromium.launch()
    const page = await browser.newPage()
    
    try {
      // Try to access the playground
      await page.goto('http://localhost:5173', { timeout: 5000 })
      console.log('✅ Playground server is already running')
    } catch (error) {
      console.log('⚡ Starting playground server...')
      
      // Start the playground server
      const playgroundProcess = exec('pnpm dev:playground', {
        cwd: process.cwd()
      })
      
      // Wait for server to be ready
      let retries = 0
      const maxRetries = 30
      
      while (retries < maxRetries) {
        try {
          await page.goto('http://localhost:5173', { timeout: 5000 })
          console.log('✅ Playground server started successfully')
          break
        } catch {
          await new Promise(resolve => setTimeout(resolve, 2000))
          retries++
          console.log(`⏳ Waiting for server... (${retries}/${maxRetries})`)
        }
      }
      
      if (retries >= maxRetries) {
        throw new Error('Failed to start playground server')
      }
    }
    
    await browser.close()
    
    // Setup test data
    console.log('🗃️ Setting up test data...')
    
    // Create test screenshots directory
    await execAsync('mkdir -p test-results/screenshots')
    
    // Setup accessibility testing
    console.log('♿ Setting up accessibility testing...')
    
    // Install axe-core if not present
    try {
      await execAsync('npm list @axe-core/playwright', { stdio: 'ignore' })
    } catch {
      console.log('📥 Installing axe-core for accessibility testing...')
      await execAsync('npm install --save-dev @axe-core/playwright')
    }
    
    console.log('✅ Global setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    process.exit(1)
  }
}

export default globalSetup