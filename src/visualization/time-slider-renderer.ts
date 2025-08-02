import type { TimeSeriesPoint, LinearSeriesPoint } from '../data/types.js'
import type { CommitData } from '../git/parser.js'
import { getTimezoneAbbreviation, formatShortDateTime } from './charts/chart-utils.js'
import type { ChartManager } from './charts/index.js'

export interface TimeSliderCallbacks {
  onRangeChange: (startDate: number, endDate: number, minDate: number, maxDate: number, totalCommits: number) => void
}

export function renderTimeSlider(
  timeSeries: TimeSeriesPoint[], 
  linearSeries: LinearSeriesPoint[],
  callbacks: TimeSliderCallbacks
): void {
  const container = document.getElementById('timeSliderChart')
  if (!container) return

  // Get date range from the data
  const dates = timeSeries.map(point => new Date(point.date).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  
  // Store total commits for commit mode calculations
  const totalCommits = linearSeries.length
  
  // Get user's timezone information
  const timezoneAbbr = getTimezoneAbbreviation(new Date())
  
  // Helper function to format date with timezone
  const formatDateWithTimezone = (date: Date): string => {
    return `${formatShortDateTime(date)} <span style="font-weight: 300; opacity: 0.7; font-size: 0.85em;">${timezoneAbbr}</span>`
  }
  
  // Helper function to format UTC date
  const formatUTCDate = (date: Date): string => {
    const utcOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    }
    return `UTC: ${date.toLocaleString('en-US', utcOptions)}`
  }

  // Create HTML for the range slider
  container.innerHTML = `
    <div class="time-range-slider" style="padding: 15px 10px;">
      <div class="row mb-3">
        <div class="col-6">
          <div class="text-start">
            <span class="text-muted me-2">Start:</span>
            <span class="fw-semibold text-primary" id="selectedStartLabel" style="font-size: 0.95rem;">${formatDateWithTimezone(new Date(minDate))}</span>
            <br>
            <small class="text-muted" id="selectedStartUTC" style="font-size: 0.75rem; font-weight: 300;">${formatUTCDate(new Date(minDate))}</small>
          </div>
        </div>
        <div class="col-6">
          <div class="text-end">
            <span class="text-muted me-2">End:</span>
            <span class="fw-semibold text-primary" id="selectedEndLabel" style="font-size: 0.95rem;">${formatDateWithTimezone(new Date(maxDate))}</span>
            <br>
            <small class="text-muted" id="selectedEndUTC" style="font-size: 0.75rem; font-weight: 300;">${formatUTCDate(new Date(maxDate))}</small>
          </div>
        </div>
      </div>
      <div class="row align-items-center">
        <div class="col-auto">
          <small class="text-muted" id="minDateLabel" style="font-size: 0.75rem;">${new Date(minDate).toLocaleDateString()}</small>
        </div>
        <div class="col">
          <div class="range-slider-container" style="position: relative; height: 40px;">
            <input type="range" class="form-range" id="startRange" 
              min="0" max="100" value="0" 
              style="position: absolute; pointer-events: none; background: transparent;">
            <input type="range" class="form-range" id="endRange" 
              min="0" max="100" value="100" 
              style="position: absolute; pointer-events: none; background: transparent;">
            <div class="slider-track" style="position: absolute; top: 18px; left: 0; right: 0; height: 4px; background: #e1e4e8; border-radius: 2px;"></div>
            <div class="slider-range" id="sliderRange" style="position: absolute; top: 18px; height: 4px; background: #27aeef; border-radius: 2px;"></div>
          </div>
        </div>
        <div class="col-auto">
          <small class="text-muted" id="maxDateLabel" style="font-size: 0.75rem;">${new Date(maxDate).toLocaleDateString()}</small>
        </div>
      </div>
    </div>
    <style>
      .range-slider-container input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        outline: none;
        margin: 0;
      }
      
      .range-slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #27aeef;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: all;
        position: relative;
        z-index: 1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      
      .range-slider-container input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #27aeef;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: all;
        position: relative;
        z-index: 1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        border: none;
      }
      
      #startRange::-webkit-slider-thumb {
        z-index: 2;
      }
      
      #endRange::-webkit-slider-thumb {
        z-index: 3;
      }
    </style>
  `

  // Get references to the sliders
  const startSlider = container.querySelector('#startRange') as HTMLInputElement
  const endSlider = container.querySelector('#endRange') as HTMLInputElement

  const updateSliderRange = () => {
    const sliderRange = document.querySelector('#sliderRange') as HTMLElement
    if (sliderRange && startSlider && endSlider) {
      const startPercent = parseFloat(startSlider.value)
      const endPercent = parseFloat(endSlider.value)
      sliderRange.style.left = startPercent + '%'
      sliderRange.style.width = (endPercent - startPercent) + '%'
    }
  }

  const updateDateRange = () => {
    const selectedStartLabel = document.querySelector('#selectedStartLabel') as HTMLElement
    const selectedEndLabel = document.querySelector('#selectedEndLabel') as HTMLElement
    const selectedStartUTC = document.querySelector('#selectedStartUTC') as HTMLElement
    const selectedEndUTC = document.querySelector('#selectedEndUTC') as HTMLElement

    if (startSlider && endSlider && selectedStartLabel && selectedEndLabel && selectedStartUTC && selectedEndUTC) {
      const startPercent = parseFloat(startSlider.value) / 100
      const endPercent = parseFloat(endSlider.value) / 100

      const startDate = minDate + (maxDate - minDate) * startPercent
      const endDate = minDate + (maxDate - minDate) * endPercent
      
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)

      selectedStartLabel.innerHTML = formatDateWithTimezone(startDateObj)
      selectedEndLabel.innerHTML = formatDateWithTimezone(endDateObj)
      selectedStartUTC.textContent = formatUTCDate(startDateObj)
      selectedEndUTC.textContent = formatUTCDate(endDateObj)

      // Call the callback with the new range
      callbacks.onRangeChange(startDate, endDate, minDate, maxDate, totalCommits)
    }
  }

  // Handle slider input
  startSlider.addEventListener('input', () => {
    if (parseFloat(startSlider.value) > parseFloat(endSlider.value)) {
      startSlider.value = endSlider.value
    }
    updateSliderRange()
    updateDateRange()
  })

  endSlider.addEventListener('input', () => {
    if (parseFloat(endSlider.value) < parseFloat(startSlider.value)) {
      endSlider.value = startSlider.value
    }
    updateSliderRange()
    updateDateRange()
  })

  // Initialize the visual range without triggering date update
  updateSliderRange()
}

// Function to reset the time slider to full range
export function resetTimeSlider(): void {
  const startSlider = document.getElementById('startRange') as HTMLInputElement
  const endSlider = document.getElementById('endRange') as HTMLInputElement
  
  if (startSlider && endSlider) {
    startSlider.value = '0'
    endSlider.value = '100'
    startSlider.dispatchEvent(new Event('input'))
  }
}

// Function to update target charts based on time slider changes
export function updateTargetCharts(
  min: number, 
  max: number, 
  minDate: number, 
  maxDate: number, 
  totalCommits: number,
  commits: CommitData[] | null,
  manager: ChartManager | null
): void {
  // Calculate filtered commit count
  let filteredCommitCount = totalCommits
  
  if (commits) {
    // Count commits within the selected date range
    filteredCommitCount = commits.filter((commit: any) => {
      const commitTime = new Date(commit.date).getTime()
      return commitTime >= min && commitTime <= max
    }).length
  }
  
  // Update filter status display
  const filterStatus = document.getElementById('filterStatus')
  if (filterStatus) {
    filterStatus.textContent = `Showing ${filteredCommitCount}/${totalCommits} commits`
  }

  // Only attempt to zoom charts if ApexCharts is loaded and manager is available
  if ((window as any).ApexCharts && manager) {
    // Zoom the commit activity chart (always date-based)
    const commitChart = manager.getChart('commitActivity')
    if (commitChart && typeof commitChart.zoomX === 'function') {
      try {
        commitChart.zoomX(min, max)
      } catch (e) {
        console.warn('Failed to zoom commit activity chart:', e)
      }
    }

    // Zoom the category lines chart (check if it's in date or commit mode)
    const categoryChartData = manager.get('categoryLines')
    if (categoryChartData && categoryChartData.instance) {
      const chart = categoryChartData.instance
      if (typeof chart.zoomX === 'function') {
        try {
          const xAxisType = categoryChartData.options?.axisMode === 'date' ? 'datetime' : 'category'
          
          if (xAxisType === 'datetime') {
            // Date mode - use same date range
            chart.zoomX(min, max)
          } else {
            // Commit mode - need to convert date range to commit indices
            const dateRange = maxDate - minDate
            const startPercent = (min - minDate) / dateRange
            const endPercent = (max - minDate) / dateRange

            const startIndex = Math.max(0, Math.round(startPercent * (totalCommits - 1)))
            const endIndex = Math.min(totalCommits - 1, Math.round(endPercent * (totalCommits - 1)))

            chart.zoomX(startIndex, endIndex)
          }
        } catch (e) {
          console.warn('Failed to zoom category lines chart:', e)
        }
      }
    }

    // Zoom the growth chart
    const growthChartData = manager.get('growth')
    if (growthChartData && growthChartData.instance) {
      const chart = growthChartData.instance
      if (typeof chart.zoomX === 'function') {
        try {
          // Check if growth chart is in date or commit mode
          const xAxisType = growthChartData.options?.axisMode === 'date' ? 'datetime' : 'category'

          if (xAxisType === 'datetime') {
            // Date mode - use same date range
            chart.zoomX(min, max)
          } else {
            // Commit mode - need to convert date range to commit indices
            const dateRange = maxDate - minDate
            const startPercent = (min - minDate) / dateRange
            const endPercent = (max - minDate) / dateRange

            const startIndex = Math.max(1, Math.round(startPercent * (totalCommits - 1)) + 1)
            const endIndex = Math.min(totalCommits, Math.round(endPercent * (totalCommits - 1)) + 1)

            chart.zoomX(startIndex, endIndex)
          }
        } catch (e) {
          console.warn('Failed to zoom growth chart:', e)
        }
      }
    }

    // Zoom user charts (they have axis toggles like growth/category charts)
    if (manager) {
      manager.getAllChartIds().forEach(chartId => {
        if (chartId.startsWith('userChart') && !chartId.includes('Activity')) {
          // Only zoom line charts, not activity bar charts
          const managedChart = manager?.get(chartId)
          if (managedChart && managedChart.instance && typeof managedChart.instance.zoomX === 'function') {
            try {
              // Check if user chart is in date or commit mode
              const xAxisType = managedChart.options?.xAxisMode === 'date' ? 'datetime' : 'category'
              
              if (xAxisType === 'datetime') {
                // Date mode - use same date range
                managedChart.instance.zoomX(min, max)
              } else {
                // Commit mode - need to convert date range to commit indices
                const dateRange = maxDate - minDate
                const startPercent = (min - minDate) / dateRange
                const endPercent = (max - minDate) / dateRange
                
                const startIndex = Math.max(0, Math.round(startPercent * (totalCommits - 1)))
                const endIndex = Math.min(totalCommits - 1, Math.round(endPercent * (totalCommits - 1)))
                
                managedChart.instance.zoomX(startIndex, endIndex)
              }
            } catch (e) {
              console.warn(`Failed to zoom ${chartId}:`, e)
            }
          }
        }
        // Skip userActivityChart zooming as it uses daily aggregation
        // and zooming can cause display issues with bar charts
      })
    }
  }
}