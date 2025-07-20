export function clearChartPlaceholder(containerId: string): HTMLElement {
  const container = document.querySelector('#' + containerId) as HTMLElement
  if (!container) {
    throw new Error(`Container with id ${containerId} not found`)
  }
  
  // Clear loading placeholder
  container.innerHTML = ''
  container.classList.remove('chart-placeholder')
  container.classList.add('chart-rendered')
  
  return container
}

export function showChartError(containerId: string, message: string = 'Failed to load chart'): void {
  const container = document.querySelector('#' + containerId) as HTMLElement
  if (!container) {
    return
  }
  
  container.innerHTML = `
    <div class="d-flex align-items-center justify-content-center h-100 text-muted">
      <div class="text-center">
        <i class="bi bi-exclamation-circle fs-4 mb-2"></i>
        <p class="mb-0">${message}</p>
      </div>
    </div>
  `
  container.classList.remove('chart-placeholder')
  container.classList.add('chart-rendered')
}