/**
 * Theme management for the playground
 */
export type Theme = 'light' | 'dark' | 'auto'

export class ThemeManager {
  private currentTheme: Theme = 'auto'
  private mediaQuery: MediaQueryList | null = null

  init(): void {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('playground-theme') as Theme
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      this.currentTheme = savedTheme
    }

    // Set up media query listener for auto theme
    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this.mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme()
        }
      })
    }

    // Apply initial theme
    this.applyTheme()
  }

  toggle(): void {
    switch (this.currentTheme) {
      case 'light':
        this.setTheme('dark')
        break
      case 'dark':
        this.setTheme('auto')
        break
      case 'auto':
        this.setTheme('light')
        break
    }
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme
    localStorage.setItem('playground-theme', theme)
    this.applyTheme()
    this.updateToggleButton()
  }

  getCurrentTheme(): Theme {
    return this.currentTheme
  }

  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'auto') {
      return this.getSystemTheme()
    }
    return this.currentTheme
  }

  private applyTheme(): void {
    const effectiveTheme = this.getEffectiveTheme()
    
    if (effectiveTheme === 'dark') {
      document.body.classList.add('dark-theme')
    } else {
      document.body.classList.remove('dark-theme')
    }

    // Update CSS custom properties for components
    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.style.setProperty('--theme-bg', '#1a1a1a')
      root.style.setProperty('--theme-fg', '#e0e0e0')
      root.style.setProperty('--theme-border', '#404040')
      root.style.setProperty('--theme-accent', '#66b3ff')
    } else {
      root.style.setProperty('--theme-bg', '#ffffff')
      root.style.setProperty('--theme-fg', '#333333')
      root.style.setProperty('--theme-border', '#e0e0e0')
      root.style.setProperty('--theme-accent', '#0066cc')
    }
  }

  private getSystemTheme(): 'light' | 'dark' {
    if (this.mediaQuery?.matches) {
      return 'dark'
    }
    return 'light'
  }

  private updateToggleButton(): void {
    const button = document.getElementById('themeToggle')
    if (!button) return

    const icons = {
      light: '☀️',
      dark: '🌙',
      auto: '🌓'
    }

    const labels = {
      light: 'Light Theme',
      dark: 'Dark Theme', 
      auto: 'Auto Theme'
    }

    button.innerHTML = `${icons[this.currentTheme]} ${labels[this.currentTheme]}`
    button.title = `Current: ${labels[this.currentTheme]} (click to cycle)`
  }

  /**
   * Listen for theme changes
   */
  onChange(callback: (theme: 'light' | 'dark') => void): () => void {
    const handler = () => callback(this.getEffectiveTheme())
    
    // Listen for manual theme changes
    document.addEventListener('themechange', handler)
    
    // Listen for system theme changes (if auto)
    if (this.mediaQuery) {
      this.mediaQuery.addEventListener('change', handler)
    }

    // Return cleanup function
    return () => {
      document.removeEventListener('themechange', handler)
      if (this.mediaQuery) {
        this.mediaQuery.removeEventListener('change', handler)
      }
    }
  }

  private notifyThemeChange(): void {
    document.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: this.getEffectiveTheme() }
    }))
  }
}