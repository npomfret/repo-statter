import type { TimeSeriesPoint, LinearSeriesPoint } from '../data/types.js'
import { getTimezoneAbbreviation, formatShortDateTime } from './charts/chart-utils.js'

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