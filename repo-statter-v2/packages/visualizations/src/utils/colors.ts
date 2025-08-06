// Color palette and utilities

export const DEFAULT_COLORS = [
  '#008FFB', // blue
  '#00E396', // green
  '#FEB019', // yellow
  '#FF4560', // red
  '#775DD0', // purple
  '#00D9FF', // cyan
  '#FF66C3', // pink
  '#FFB800', // orange
  '#A5978B', // brown
  '#2E93FA', // light blue
] as const

export const CHART_THEMES = {
  light: {
    background: '#ffffff',
    text: '#373d3f',
    grid: '#e0e0e0',
    tooltip: {
      background: '#ffffff',
      text: '#373d3f',
      border: '#e0e0e0'
    }
  },
  dark: {
    background: '#1a1a1a',
    text: '#e0e0e0',
    grid: '#404040',
    tooltip: {
      background: '#2a2a2a',
      text: '#e0e0e0',
      border: '#404040'
    }
  }
} as const

export function getColorForIndex(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? DEFAULT_COLORS[0]
}

export function generateGradient(startColor: string, endColor: string, steps: number): string[] {
  const colors: string[] = []
  
  // Simple linear interpolation
  const start = hexToRgb(startColor)
  const end = hexToRgb(endColor)
  
  if (!start || !end) return [startColor, endColor]
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1)
    const r = Math.round(start.r + (end.r - start.r) * ratio)
    const g = Math.round(start.g + (end.g - start.g) * ratio)
    const b = Math.round(start.b + (end.b - start.b) * ratio)
    colors.push(rgbToHex(r, g, b))
  }
  
  return colors
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1] ?? '0', 16),
    g: parseInt(result[2] ?? '0', 16),
    b: parseInt(result[3] ?? '0', 16)
  } : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}