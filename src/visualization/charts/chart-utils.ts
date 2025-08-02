/**
 * Shared chart utilities used across all chart modules
 */

export function formatBytes(bytes: number): string {
  if (bytes >= 1000000000) {
    return (bytes / 1000000000).toFixed(2) + ' GB'
  } else if (bytes >= 1000000) {
    return (bytes / 1000000).toFixed(2) + ' MB'
  } else if (bytes >= 1000) {
    return (bytes / 1000).toFixed(2) + ' KB'
  } else {
    return bytes.toFixed(0) + ' bytes'
  }
}

export function showChartError(containerId: string, message: string): void {
  const container = document.getElementById(containerId)
  if (container) {
    container.innerHTML = `
      <div class="d-flex align-items-center justify-content-center h-100 text-muted">
        <div class="text-center">
          <i class="bi bi-exclamation-circle fs-4 mb-2"></i>
          <p class="mb-0">${message}</p>
        </div>
      </div>
    `
  }
}

export interface WordCloudData {
  text: string
  size: number
  frequency: number
  x?: number
  y?: number
  rotate?: number
}

export function getTimezoneAbbreviation(date: Date): string {
  const timeZoneName = date.toLocaleDateString(undefined, { timeZoneName: 'short' }).split(', ')[1]
  return timeZoneName || 'Local'
}

export function formatShortDateTime(date: Date): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return date.toLocaleString(undefined, dateOptions)
}