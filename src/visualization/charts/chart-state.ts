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