#!/usr/bin/env node

/**
 * Release Notes Generator
 * Generates changelog and release notes from git commits
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

class ReleaseNotesGenerator {
  constructor() {
    this.version = process.env.npm_package_version || '2.0.0-alpha.0'
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

  async getCommitsSinceLastTag() {
    const result = await this.runCommand('git', ['log', '--oneline', '--pretty=format:%h|%s|%an|%ad', '--date=short'])
    
    if (result.code !== 0) {
      throw new Error('Failed to get git log')
    }

    return result.stdout
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 20) // Last 20 commits
      .map(line => {
        const [hash, subject, author, date] = line.split('|')
        return { hash, subject, author, date }
      })
  }

  categorizeCommits(commits) {
    const categories = {
      features: [],
      fixes: [],
      improvements: [],
      docs: [],
      tests: [],
      chore: []
    }

    commits.forEach(commit => {
      const subject = commit.subject.toLowerCase()
      
      if (subject.startsWith('feat') || subject.includes('add') || subject.includes('implement')) {
        categories.features.push(commit)
      } else if (subject.startsWith('fix') || subject.includes('bug')) {
        categories.fixes.push(commit)
      } else if (subject.startsWith('improve') || subject.includes('enhance') || subject.includes('update')) {
        categories.improvements.push(commit)
      } else if (subject.startsWith('docs') || subject.includes('documentation')) {
        categories.docs.push(commit)
      } else if (subject.startsWith('test') || subject.includes('test')) {
        categories.tests.push(commit)
      } else {
        categories.chore.push(commit)
      }
    })

    return categories
  }

  formatReleaseNotes(categories) {
    const date = new Date().toISOString().split('T')[0]
    
    let notes = `# Release Notes - v${this.version}\n`
    notes += `*Released: ${date}*\n\n`

    if (categories.features.length > 0) {
      notes += '## ✨ New Features\n'
      categories.features.forEach(commit => {
        notes += `- ${commit.subject} (${commit.hash})\n`
      })
      notes += '\n'
    }

    if (categories.fixes.length > 0) {
      notes += '## 🐛 Bug Fixes\n'
      categories.fixes.forEach(commit => {
        notes += `- ${commit.subject} (${commit.hash})\n`
      })
      notes += '\n'
    }

    if (categories.improvements.length > 0) {
      notes += '## 📈 Improvements\n'
      categories.improvements.forEach(commit => {
        notes += `- ${commit.subject} (${commit.hash})\n`
      })
      notes += '\n'
    }

    if (categories.docs.length > 0) {
      notes += '## 📚 Documentation\n'
      categories.docs.forEach(commit => {
        notes += `- ${commit.subject} (${commit.hash})\n`
      })
      notes += '\n'
    }

    if (categories.tests.length > 0) {
      notes += '## 🧪 Testing\n'
      categories.tests.forEach(commit => {
        notes += `- ${commit.subject} (${commit.hash})\n`
      })
      notes += '\n'
    }

    return notes
  }

  async run() {
    this.log('📝 Generating Release Notes', GREEN)
    this.log('============================')

    try {
      const commits = await this.getCommitsSinceLastTag()
      this.log(`Found ${commits.length} commits to analyze`)

      const categories = this.categorizeCommits(commits)
      const releaseNotes = this.formatReleaseNotes(categories)

      // Write to CHANGELOG.md
      await fs.writeFile('CHANGELOG.md', releaseNotes)
      this.log('✅ Release notes written to CHANGELOG.md', GREEN)

      // Write to GitHub release format
      const githubNotes = releaseNotes.replace(/^# Release Notes - v\d+\.\d+\.\d+.*$/m, '')
      await fs.writeFile('.release-notes.md', githubNotes.trim())
      this.log('✅ GitHub release notes written to .release-notes.md', GREEN)

      console.log('\n' + releaseNotes)

    } catch (error) {
      this.log(`❌ Failed to generate release notes: ${error.message}`, RED)
      process.exit(1)
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ReleaseNotesGenerator()
  generator.run().catch(console.error)
}