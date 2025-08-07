#!/usr/bin/env node

/**
 * Bundle Size Monitor
 * Checks bundle sizes and ensures they stay within acceptable limits
 */

import { promises as fs } from 'fs'
import path from 'path'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

const SIZE_LIMITS = {
  '@repo-statter/core': 50, // KB
  '@repo-statter/visualizations': 100, // KB  
  '@repo-statter/report-builder': 75, // KB
  '@repo-statter/cli': 25 // KB
}

class BundleSizeChecker {
  constructor() {
    this.results = []
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`)
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.size / 1024 // Convert to KB
    } catch (error) {
      return 0
    }
  }

  async checkPackageSize(packageName) {
    const packagePath = `packages/${packageName.split('/')[1]}`
    const distPath = path.join(packagePath, 'dist')
    
    try {
      const files = await fs.readdir(distPath, { recursive: true })
      let totalSize = 0

      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.mjs')) {
          const filePath = path.join(distPath, file)
          const size = await this.getFileSize(filePath)
          totalSize += size
        }
      }

      const limit = SIZE_LIMITS[packageName]
      const passed = totalSize <= limit
      const percentage = ((totalSize / limit) * 100).toFixed(1)

      this.results.push({
        package: packageName,
        size: totalSize.toFixed(2),
        limit,
        passed,
        percentage
      })

      const status = passed ? '✅' : '❌'
      const color = passed ? GREEN : RED
      
      this.log(`${status} ${packageName}: ${totalSize.toFixed(2)}KB / ${limit}KB (${percentage}%)`, color)
      
      return passed
    } catch (error) {
      this.log(`❌ Could not check ${packageName}: ${error.message}`, RED)
      return false
    }
  }

  async run() {
    this.log('📦 Checking Bundle Sizes', GREEN)
    this.log('========================')

    let allPassed = true

    for (const packageName of Object.keys(SIZE_LIMITS)) {
      const passed = await this.checkPackageSize(packageName)
      if (!passed) allPassed = false
    }

    this.log('\n📊 Bundle Size Summary', GREEN)
    this.log('======================')
    
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌'
      const trend = result.percentage > 80 ? '⚠️ ' : ''
      this.log(`${status} ${trend}${result.package}: ${result.size}KB`)
    }

    if (allPassed) {
      this.log('\n🎉 All bundle sizes within limits!', GREEN)
      process.exit(0)
    } else {
      this.log('\n❌ Bundle size limits exceeded. Consider optimizing.', RED)
      process.exit(1)
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new BundleSizeChecker()
  checker.run().catch(console.error)
}