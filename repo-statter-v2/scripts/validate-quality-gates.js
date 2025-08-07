#!/usr/bin/env node

/**
 * Quality Gates Validation Script
 * Ensures all quality criteria are met before release
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

class QualityGateValidator {
  constructor() {
    this.results = []
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`)
  }

  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { stdio: 'pipe' })
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => stdout += data.toString())
      proc.stderr.on('data', (data) => stderr += data.toString())

      proc.on('close', (code) => {
        resolve({ code, stdout, stderr })
      })

      proc.on('error', reject)
    })
  }

  async validateGate(name, command, args = []) {
    this.log(`🔍 Checking ${name}...`, YELLOW)
    
    try {
      const result = await this.runCommand(command, args)
      const passed = result.code === 0
      
      this.results.push({
        name,
        passed,
        output: result.stdout,
        error: result.stderr
      })

      if (passed) {
        this.log(`✅ ${name} passed`, GREEN)
      } else {
        this.log(`❌ ${name} failed`, RED)
        if (result.stderr) {
          console.log(result.stderr)
        }
      }

      return passed
    } catch (error) {
      this.log(`❌ ${name} failed: ${error.message}`, RED)
      this.results.push({
        name,
        passed: false,
        error: error.message
      })
      return false
    }
  }

  async validatePackageVersions() {
    this.log('🔍 Checking package versions...', YELLOW)
    
    try {
      const workspacePackages = [
        'packages/core/package.json',
        'packages/visualizations/package.json', 
        'packages/report-builder/package.json',
        'packages/cli/package.json'
      ]

      const versions = new Set()
      
      for (const pkgPath of workspacePackages) {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
        versions.add(pkg.version)
      }

      const passed = versions.size === 1
      
      this.results.push({
        name: 'Package Version Consistency',
        passed,
        output: `Found ${versions.size} unique versions: ${Array.from(versions).join(', ')}`
      })

      if (passed) {
        this.log('✅ Package versions are consistent', GREEN)
      } else {
        this.log('❌ Package versions are inconsistent', RED)
      }

      return passed
    } catch (error) {
      this.log(`❌ Package version check failed: ${error.message}`, RED)
      return false
    }
  }

  async run() {
    this.log('🚀 Running Quality Gates Validation', GREEN)
    this.log('=====================================')

    const gates = [
      ['TypeScript Compilation', 'pnpm', ['typecheck']],
      ['ESLint Code Quality', 'pnpm', ['lint']],
      ['Unit Tests', 'pnpm', ['test']],
      ['Build Process', 'pnpm', ['build']]
    ]

    let allPassed = true

    // Run standard quality gates
    for (const [name, command, args] of gates) {
      const passed = await this.validateGate(name, command, args)
      if (!passed) allPassed = false
    }

    // Run custom validations
    const versionConsistency = await this.validatePackageVersions()
    if (!versionConsistency) allPassed = false

    // Summary
    this.log('\n📊 Quality Gates Summary', GREEN)
    this.log('=========================')
    
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌'
      this.log(`${status} ${result.name}`)
    }

    this.log('\n' + '='.repeat(40))
    
    if (allPassed) {
      this.log('🎉 All quality gates passed! Ready for release.', GREEN)
      process.exit(0)
    } else {
      this.log('❌ Quality gates failed. Please fix issues before release.', RED)
      process.exit(1)
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new QualityGateValidator()
  validator.run().catch(console.error)
}