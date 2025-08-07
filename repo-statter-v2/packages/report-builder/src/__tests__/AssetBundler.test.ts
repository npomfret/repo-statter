import { describe, it, expect } from 'vitest'
import { AssetBundler } from '../AssetBundler.js'

describe('AssetBundler', () => {
  let bundler: AssetBundler
  
  beforeEach(() => {
    bundler = new AssetBundler()
  })
  
  it('should bundle assets with default options', async () => {
    const result = await bundler.bundle({})
    
    expect(result).toHaveProperty('styles')
    expect(result).toHaveProperty('scripts')
    expect(result).toHaveProperty('icons')
    
    expect(typeof result.styles).toBe('string')
    expect(typeof result.scripts).toBe('string')
    expect(typeof result.icons).toBe('object')
  })
  
  it('should include theme styles', async () => {
    const lightResult = await bundler.bundle({ theme: 'light' })
    const darkResult = await bundler.bundle({ theme: 'dark' })
    const autoResult = await bundler.bundle({ theme: 'auto' })
    
    expect(lightResult.styles).toContain('--bg-primary:#ffffff')
    expect(darkResult.styles).toContain('--bg-primary:#1a1a1a')
    expect(autoResult.styles).toContain('@media (prefers-color-scheme:dark)')
  })
  
  it('should include component styles', async () => {
    const result = await bundler.bundle({})
    
    expect(result.styles).toContain('.chart-container')
    expect(result.styles).toContain('.metric-card')
    expect(result.styles).toContain('.time-range-slider')
  })
  
  it('should include hydration scripts', async () => {
    const result = await bundler.bundle({})
    
    expect(result.scripts).toContain('DOMContentLoaded')
    expect(result.scripts).toContain('theme-toggle')
    expect(result.scripts).toContain('initTimeSlider')
  })
  
  it('should include icons', async () => {
    const result = await bundler.bundle({})
    
    expect(result.icons).toHaveProperty('download')
    expect(result.icons).toHaveProperty('theme')
    expect(result.icons).toHaveProperty('github')
    
    expect(result.icons.download).toContain('<svg')
    expect(result.icons.theme).toContain('<path')
  })
  
  it('should add custom CSS when provided', async () => {
    const customCSS = '.custom-class { color: red; }'
    const result = await bundler.bundle({ customCSS })
    
    expect(result.styles).toContain('.custom-class{color:red')
  })
  
  it('should add custom JS when provided', async () => {
    const customJS = 'console.log("custom script");'
    const result = await bundler.bundle({ customJS })
    
    expect(result.scripts).toContain(customJS)
  })
})