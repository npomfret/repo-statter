/**
 * Global chart state management
 * Maintains chart references and data for cross-chart interactions
 */

// Global references to charts that need to be controlled by other charts
export const chartRefs: { [key: string]: any } = {}

// Store chart data for rebuilding charts when options change
export const chartData: { [key: string]: any } = {}

// Global state for file type filtering
export let selectedFileType: string | null = null

export function setSelectedFileType(fileType: string | null): void {
  selectedFileType = fileType
}

export function getSelectedFileType(): string | null {
  return selectedFileType
}

// File type filtering functions that update all charts
export function setFileTypeFilter(fileType: string): void {
  setSelectedFileType(fileType)
  // Import the update function dynamically to avoid circular deps for now
  const updateFunction = (globalThis as any).updateChartsWithFileTypeFilter
  if (typeof updateFunction === 'function') {
    updateFunction()
  }
}

export function clearFileTypeFilter(): void {
  setSelectedFileType(null)
  // Import the update function dynamically to avoid circular deps for now
  const updateFunction = (globalThis as any).updateChartsWithFileTypeFilter
  if (typeof updateFunction === 'function') {
    updateFunction()
  }
}