import { formatError } from './errors.js'

export function renderWithErrorBoundary(
  containerId: string,
  chartName: string,
  renderFunction: () => void
): boolean {
  try {
    renderFunction()
    return true
  } catch (error) {
    // Client-side error logging - this is acceptable for debugging UI issues
    console.error(`Failed to render ${chartName}:`, formatError(error))
    
    const container = document.querySelector(`#${containerId}`)
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div>
            <h6 class="alert-heading mb-1">Chart Unavailable</h6>
            <small>${chartName} could not be rendered. Please check the console for details.</small>
          </div>
        </div>
      `
    }
    
    return false
  }
}