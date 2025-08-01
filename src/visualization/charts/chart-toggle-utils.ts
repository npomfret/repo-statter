export interface ChartToggleConfig {
  chartId: string
  storageKey: string
  elementPrefix: string // e.g., 'growth', 'category', 'userChart0'
  renderFunction: (...args: any[]) => void | Promise<void>
  renderArgs: any[]
  updateButtonMethod?: 'classList' | 'checked' // default: 'checked'
  chartRefKey?: string // Override key for chartRefs lookup (e.g., 'category-lines-chart')
}

export function createChartToggleHTML(
  namePrefix: string, 
  defaultMode: 'date' | 'commit' = 'commit'
): string {
  const isDate = defaultMode === 'date'
  // Generate proper IDs: namePrefix + "Date" / namePrefix + "Commit"
  // For user charts: "userXAxis0" => "userXAxisDate0" / "userXAxisCommit0"
  return `
    <div class="btn-group btn-group-sm mb-3" role="group">
      <input type="radio" class="btn-check" name="${namePrefix}" 
             id="${namePrefix}Date" value="date" ${isDate ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="${namePrefix}Date">By Date</label>
      <input type="radio" class="btn-check" name="${namePrefix}" 
             id="${namePrefix}Commit" value="commit" ${!isDate ? 'checked' : ''}>
      <label class="btn btn-outline-primary" for="${namePrefix}Commit">By Commit</label>
    </div>
  `
}

export function updateChartAxis(
  config: ChartToggleConfig, 
  mode: 'date' | 'commit',
  chartRefs: Record<string, any>,
  chartData: Record<string, any>
): void {
  const chartRefKey = config.chartRefKey || config.chartId
  const chart = chartRefs[chartRefKey]
  const data = chartData[config.chartId]
  if (!chart || !data) return

  // Save preference
  localStorage.setItem(config.storageKey, mode)

  // Update button states
  const dateBtn = document.getElementById(`${config.elementPrefix}Date`)
  const commitBtn = document.getElementById(`${config.elementPrefix}Commit`)

  if (config.updateButtonMethod === 'classList') {
    // Growth chart style
    if (mode === 'date') {
      dateBtn?.classList.add('active')
      commitBtn?.classList.remove('active')
    } else {
      commitBtn?.classList.add('active')
      dateBtn?.classList.remove('active')
    }
  } else {
    // Category and user chart style
    const dateBtnInput = dateBtn as HTMLInputElement
    const commitBtnInput = commitBtn as HTMLInputElement
    if (dateBtnInput && commitBtnInput) {
      dateBtnInput.checked = mode === 'date'
      commitBtnInput.checked = mode === 'commit'
    }
  }

  // Destroy and cleanup
  chart.destroy()
  // Delete the chart reference - use chartRefKey if provided, otherwise use chartId
  const refKey = config.chartRefKey || config.chartId
  delete chartRefs[refKey]

  // Rebuild chart
  if (config.renderFunction.constructor.name === 'AsyncFunction') {
    (config.renderFunction as (...args: any[]) => Promise<void>)(...config.renderArgs)
  } else {
    config.renderFunction(...config.renderArgs)
  }
}

export function setupChartToggleListeners(
  config: ChartToggleConfig,
  chartRefs: Record<string, any>,
  chartData: Record<string, any>
): void {
  const dateBtn = document.getElementById(`${config.elementPrefix}Date`)
  const commitBtn = document.getElementById(`${config.elementPrefix}Commit`)

  dateBtn?.addEventListener('change', () => {
    if ((dateBtn as HTMLInputElement).checked) {
      updateChartAxis(config, 'date', chartRefs, chartData)
    }
  })

  commitBtn?.addEventListener('change', () => {
    if ((commitBtn as HTMLInputElement).checked) {
      updateChartAxis(config, 'commit', chartRefs, chartData)
    }
  })
}