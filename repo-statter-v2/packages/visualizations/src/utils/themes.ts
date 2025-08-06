// Theme management utilities

import { CHART_THEMES } from './colors.js'

export type Theme = 'light' | 'dark' | 'auto'

export function detectSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function getTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return detectSystemTheme()
  }
  return theme
}

export function getThemeColors(theme: Theme) {
  const resolvedTheme = getTheme(theme)
  return CHART_THEMES[resolvedTheme]
}

export function watchThemeChanges(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') {
    return () => {} // No-op for server-side
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light')
  }
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }
  
  // Legacy browsers
  // @ts-ignore - for older browser compatibility
  mediaQuery.addListener(handler)
  // @ts-ignore
  return () => mediaQuery.removeListener(handler)
}