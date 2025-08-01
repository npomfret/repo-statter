import { ChartManager } from './chart-manager.js'
import { CHART_DEFINITIONS } from './chart-definitions.js'

export interface ToggleConfig {
  chartId: string
  togglePrefix: string
  defaultMode?: 'date' | 'commit'
}

export function setupChartToggle(
  manager: ChartManager,
  config: ToggleConfig
): void {
  const { chartId, togglePrefix, defaultMode = 'commit' } = config
  const definition = CHART_DEFINITIONS[chartId]
  
  if (!definition?.hasAxisToggle) {
    console.warn(`Chart ${chartId} does not support axis toggle`)
    return
  }
  
  // Get toggle buttons
  const dateBtn = document.getElementById(`${togglePrefix}Date`) as HTMLInputElement
  const commitBtn = document.getElementById(`${togglePrefix}Commit`) as HTMLInputElement
  
  if (!dateBtn || !commitBtn) {
    console.error(`Toggle buttons not found for ${chartId} with prefix ${togglePrefix}`)
    return
  }
  
  // Load saved preference or use default
  const savedMode = localStorage.getItem(`${chartId}XAxis`) as 'date' | 'commit' | null
  const initialMode = savedMode || defaultMode
  
  // Set initial button state
  if (initialMode === 'date') {
    dateBtn.checked = true
    commitBtn.checked = false
  } else {
    dateBtn.checked = false
    commitBtn.checked = true
  }
  
  // Handler for axis change
  const handleAxisChange = (mode: 'date' | 'commit') => {
    // Save preference
    localStorage.setItem(`${chartId}XAxis`, mode)
    
    // Get current chart data
    const chartData = manager.get(chartId)
    if (!chartData) {
      console.error(`No chart data found for ${chartId}`)
      return
    }
    
    // Recreate chart with new axis mode
    manager.recreate(chartId, { 
      ...chartData.options,
      axisMode: mode 
    })
  }
  
  // Add event listeners
  dateBtn.addEventListener('change', () => {
    if (dateBtn.checked) {
      handleAxisChange('date')
    }
  })
  
  commitBtn.addEventListener('change', () => {
    if (commitBtn.checked) {
      handleAxisChange('commit')
    }
  })
}

export function setupAllChartToggles(manager: ChartManager): void {
  // Setup toggles for charts that support them
  const toggleConfigs: ToggleConfig[] = [
    { chartId: 'growth', togglePrefix: 'growthXAxis', defaultMode: 'commit' },
    { chartId: 'categoryLines', togglePrefix: 'categoryXAxis', defaultMode: 'commit' }
  ]
  
  toggleConfigs.forEach(config => {
    setupChartToggle(manager, config)
  })
}