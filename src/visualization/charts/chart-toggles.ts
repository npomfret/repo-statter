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
  
  // For user charts, we need to check the base chart type
  const chartType = chartId.startsWith('userChart') ? 'userChart' : chartId
  const definition = CHART_DEFINITIONS[chartType]
  
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
  // For user charts, use the old localStorage key format for backwards compatibility
  const storageKey = chartId.startsWith('userChart') 
    ? `userChartXAxis${chartId.replace('userChart', '')}`
    : `${chartId}XAxis`
  const savedMode = localStorage.getItem(storageKey) as 'date' | 'commit' | null
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
    localStorage.setItem(storageKey, mode)
    
    // Get current chart data
    const chartData = manager.get(chartId)
    if (!chartData) {
      console.error(`No chart data found for ${chartId}`)
      return
    }
    
    // For user charts, we need to update the data object with xAxisMode
    if (chartId.startsWith('userChart')) {
      // Update the xAxisMode in the data object
      const updatedData = {
        ...chartData.data,
        xAxisMode: mode
      }
      // Destroy and recreate with new data
      manager.destroy(chartId)
      manager.create(chartType, updatedData, {
        ...chartData.options,
        xAxisMode: mode
      })
    } else {
      // For other charts, use the standard recreate method
      manager.recreate(chartId, { 
        ...chartData.options,
        axisMode: mode 
      })
    }
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

export function setupUserChartToggles(manager: ChartManager): void {
  // Find all user chart divs (not activity charts)
  const userCharts = document.querySelectorAll('[id^="userChart"]:not([id*="Activity"])')
  
  userCharts.forEach((chartElement) => {
    const match = chartElement.id.match(/userChart(\d+)/)
    if (match) {
      const index = match[1]
      const chartId = `userChart${index}`
      const togglePrefix = `userXAxis${index}`
      
      // Set up toggle for this user chart
      setupChartToggle(manager, {
        chartId,
        togglePrefix,
        defaultMode: 'commit'
      })
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
  
  // Setup user chart toggles
  setupUserChartToggles(manager)
}