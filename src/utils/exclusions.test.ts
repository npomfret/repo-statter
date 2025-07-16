import { describe, it, expect } from 'vitest'
import { isFileExcluded } from './exclusions.js'

describe('isFileExcluded', () => {
  describe('lock files', () => {
    it('excludes package-lock.json in any directory', () => {
      expect(isFileExcluded('package-lock.json')).toBe(true)
      expect(isFileExcluded('frontend/package-lock.json')).toBe(true)
      expect(isFileExcluded('apps/web/package-lock.json')).toBe(true)
      expect(isFileExcluded('packages/ui/node_modules/some-pkg/package-lock.json')).toBe(true)
    })

    it('excludes other lock files in any directory', () => {
      expect(isFileExcluded('yarn.lock')).toBe(true)
      expect(isFileExcluded('backend/yarn.lock')).toBe(true)
      expect(isFileExcluded('apps/api/pnpm-lock.yaml')).toBe(true)
      expect(isFileExcluded('services/auth/composer.lock')).toBe(true)
    })

    it('does not exclude files with similar names', () => {
      expect(isFileExcluded('package-lock.json.backup')).toBe(false)
      expect(isFileExcluded('my-package-lock.json')).toBe(false)
      expect(isFileExcluded('yarn.lock.old')).toBe(false)
    })
  })

  describe('node_modules and build directories', () => {
    it('excludes node_modules in any location', () => {
      expect(isFileExcluded('node_modules/react/index.js')).toBe(true)
      expect(isFileExcluded('frontend/node_modules/react/index.js')).toBe(true)
      expect(isFileExcluded('packages/ui/node_modules/@types/node/index.d.ts')).toBe(true)
    })

    it('excludes dist and build directories in any location', () => {
      expect(isFileExcluded('dist/index.js')).toBe(true)
      expect(isFileExcluded('apps/web/dist/bundle.js')).toBe(true)
      expect(isFileExcluded('packages/core/build/main.js')).toBe(true)
      expect(isFileExcluded('backend/target/classes/Main.class')).toBe(true)
    })

    it('does not exclude similarly named files outside these directories', () => {
      expect(isFileExcluded('src/node_modules_helper.js')).toBe(false)
      expect(isFileExcluded('src/dist_component.ts')).toBe(false)
      expect(isFileExcluded('scripts/build.js')).toBe(false)
    })
  })

  describe('git and IDE files', () => {
    it('excludes .gitignore and .gitattributes in any directory', () => {
      expect(isFileExcluded('.gitignore')).toBe(true)
      expect(isFileExcluded('frontend/.gitignore')).toBe(true)
      expect(isFileExcluded('packages/ui/.gitattributes')).toBe(true)
    })

    it('excludes .vscode and .idea directories', () => {
      expect(isFileExcluded('.vscode/settings.json')).toBe(true)
      expect(isFileExcluded('frontend/.vscode/launch.json')).toBe(true)
      expect(isFileExcluded('.idea/workspace.xml')).toBe(true)
      expect(isFileExcluded('backend/.idea/modules.xml')).toBe(true)
    })

    it('only excludes root .git directory', () => {
      expect(isFileExcluded('.git/config')).toBe(true)
      expect(isFileExcluded('.git/objects/abc123')).toBe(true)
      // Submodules or other .git directories should not be excluded
      expect(isFileExcluded('submodule/.git/config')).toBe(false)
    })
  })

  describe('environment files', () => {
    it('excludes .env files in any directory', () => {
      expect(isFileExcluded('.env')).toBe(true)
      expect(isFileExcluded('backend/.env')).toBe(true)
      expect(isFileExcluded('apps/web/.env.local')).toBe(true)
      expect(isFileExcluded('services/api/.env.production')).toBe(true)
    })

    it('does not exclude files that just contain .env', () => {
      expect(isFileExcluded('setup.env.sh')).toBe(false)
      expect(isFileExcluded('docs/.env-example')).toBe(false)
    })
  })

  describe('system files', () => {
    it('excludes .DS_Store in any directory', () => {
      expect(isFileExcluded('.DS_Store')).toBe(true)
      expect(isFileExcluded('src/.DS_Store')).toBe(true)
      expect(isFileExcluded('packages/ui/components/.DS_Store')).toBe(true)
    })

    it('excludes Thumbs.db in any directory', () => {
      expect(isFileExcluded('Thumbs.db')).toBe(true)
      expect(isFileExcluded('images/Thumbs.db')).toBe(true)
      expect(isFileExcluded('assets/photos/Thumbs.db')).toBe(true)
    })
  })

  describe('file extensions', () => {
    it('excludes image files in any directory', () => {
      expect(isFileExcluded('logo.jpg')).toBe(true)
      expect(isFileExcluded('assets/images/banner.png')).toBe(true)
      expect(isFileExcluded('src/components/icons/arrow.svg')).toBe(true)
    })

    it('excludes document files in any directory', () => {
      expect(isFileExcluded('README.md')).toBe(true)
      expect(isFileExcluded('docs/guide.pdf')).toBe(true)
      expect(isFileExcluded('reports/quarterly.xlsx')).toBe(true)
    })

    it('excludes log and temp files in any directory', () => {
      expect(isFileExcluded('error.log')).toBe(true)
      expect(isFileExcluded('logs/access.log')).toBe(true)
      expect(isFileExcluded('temp/data.tmp')).toBe(true)
      expect(isFileExcluded('build/cache.cache')).toBe(true)
    })

    it('excludes compiled language artifacts', () => {
      expect(isFileExcluded('Main.class')).toBe(true)
      expect(isFileExcluded('src/utils/__pycache__/helper.pyc')).toBe(true)
      expect(isFileExcluded('lib/app.jar')).toBe(true)
      expect(isFileExcluded('target/myapp.war')).toBe(true)
    })
  })

  describe('Python cache directories', () => {
    it('excludes __pycache__ in any location', () => {
      expect(isFileExcluded('__pycache__/module.pyc')).toBe(true)
      expect(isFileExcluded('src/__pycache__/utils.pyc')).toBe(true)
      expect(isFileExcluded('apps/backend/lib/__pycache__/config.pyo')).toBe(true)
    })
  })

  describe('editor swap files', () => {
    it('excludes vim swap files in any directory', () => {
      expect(isFileExcluded('.index.js.swp')).toBe(true)
      expect(isFileExcluded('src/.main.py.swo')).toBe(true)
      expect(isFileExcluded('README.md~')).toBe(true)
      expect(isFileExcluded('backend/src/.config.json.swp')).toBe(true)
    })
  })

  describe('custom patterns', () => {
    it('allows custom exclusion patterns', () => {
      const customPatterns = ['*.custom', 'special-file.txt']
      expect(isFileExcluded('test.custom', customPatterns)).toBe(true)
      expect(isFileExcluded('special-file.txt', customPatterns)).toBe(true)
      expect(isFileExcluded('other-file.txt', customPatterns)).toBe(false)
    })
  })
})