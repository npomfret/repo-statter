import type { TimeSeriesPoint } from '../data/time-series-transformer.js'
import type { LinearSeriesPoint } from '../data/linear-transformer.js'
import { assert } from '../utils/errors.js'

export class TimeSliderChart {
  private readonly containerId: string
  private minDate: number = 0
  private maxDate: number = 0
  private totalCommits: number = 0
  private startSlider: HTMLInputElement | null = null
  private endSlider: HTMLInputElement | null = null
  private startDatePicker: HTMLInputElement | null = null
  private endDatePicker: HTMLInputElement | null = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(timeSeries: TimeSeriesPoint[], linearSeries?: LinearSeriesPoint[]): void {
    assert(timeSeries !== undefined, 'Time series data is required')
    assert(Array.isArray(timeSeries), 'Time series must be an array')
    assert(timeSeries.length > 0, 'Time series must not be empty')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Get date range from the data
    const dates = timeSeries.map(point => new Date(point.date).getTime())
    this.minDate = Math.min(...dates)
    this.maxDate = Math.max(...dates)
    
    // Store total commits for commit mode calculations
    this.totalCommits = linearSeries?.length || timeSeries.length
    
    // Create HTML for the range slider
    container.innerHTML = `
      <div class="time-range-slider" style="padding: 15px 10px;">
        <div class="row mb-3">
          <div class="col-6">
            <div class="text-start">
              <span class="text-muted me-2">Start:</span>
              <span class="fw-semibold text-primary" id="selectedStartLabel" style="font-size: 0.95rem;">${this.formatShortDateTime(new Date(this.minDate))}</span>
              <button class="btn btn-sm btn-outline-secondary ms-2" id="startCalendarBtn" style="padding: 2px 6px; font-size: 0.75rem;" title="Pick start date">
                📅
              </button>
              <input type="datetime-local" id="startDatePicker" class="form-control" style="display: none; position: absolute; z-index: 1000; width: 200px; margin-top: 5px;">
            </div>
          </div>
          <div class="col-6">
            <div class="text-end">
              <span class="text-muted me-2">End:</span>
              <span class="fw-semibold text-primary" id="selectedEndLabel" style="font-size: 0.95rem;">${this.formatShortDateTime(new Date(this.maxDate))}</span>
              <button class="btn btn-sm btn-outline-secondary ms-2" id="endCalendarBtn" style="padding: 2px 6px; font-size: 0.75rem;" title="Pick end date">
                📅
              </button>
              <input type="datetime-local" id="endDatePicker" class="form-control" style="display: none; position: absolute; z-index: 1000; width: 200px; margin-top: 5px; right: 0;">
            </div>
          </div>
        </div>
        <div class="row align-items-center">
          <div class="col-auto">
            <small class="text-muted" id="minDateLabel" style="font-size: 0.75rem;">${new Date(this.minDate).toLocaleDateString()}</small>
          </div>
          <div class="col">
            <div class="range-slider-container" style="position: relative; height: 40px;">
              <input type="range" class="form-range" id="startRange" 
                min="0" max="100" value="0" 
                style="position: absolute; pointer-events: none; background: transparent;">
              <input type="range" class="form-range" id="endRange" 
                min="0" max="100" value="100" 
                style="position: absolute; pointer-events: none; background: transparent;">
              <div class="slider-track" style="position: absolute; top: 18px; left: 0; right: 0; height: 4px; background: ${isDark ? '#30363d' : '#e1e4e8'}; border-radius: 2px;"></div>
              <div class="slider-range" id="sliderRange" style="position: absolute; top: 18px; height: 4px; background: ${isDark ? '#58a6ff' : '#27aeef'}; border-radius: 2px;"></div>
            </div>
          </div>
          <div class="col-auto">
            <small class="text-muted" id="maxDateLabel" style="font-size: 0.75rem;">${new Date(this.maxDate).toLocaleDateString()}</small>
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
          background: ${isDark ? '#58a6ff' : '#27aeef'};
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
          background: ${isDark ? '#58a6ff' : '#27aeef'};
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
    
    // Get references to the sliders and date pickers
    this.startSlider = container.querySelector('#startRange') as HTMLInputElement
    this.endSlider = container.querySelector('#endRange') as HTMLInputElement
    this.startDatePicker = container.querySelector('#startDatePicker') as HTMLInputElement
    this.endDatePicker = container.querySelector('#endDatePicker') as HTMLInputElement
    
    // Set min/max values for date pickers
    const minDateString = this.toDateTimeLocalString(new Date(this.minDate))
    const maxDateString = this.toDateTimeLocalString(new Date(this.maxDate))
    this.startDatePicker.min = minDateString
    this.startDatePicker.max = maxDateString
    this.endDatePicker.min = minDateString
    this.endDatePicker.max = maxDateString
    
    // Set initial values for date pickers
    this.startDatePicker.value = minDateString
    this.endDatePicker.value = maxDateString
    
    // Set initial constraints to prevent invalid selections
    this.updateDatePickerConstraints()
    
    // Handle slider input
    this.startSlider.addEventListener('input', this.handleStartInput)
    this.endSlider.addEventListener('input', this.handleEndInput)
    
    // Handle calendar button clicks
    const startCalendarBtn = container.querySelector('#startCalendarBtn') as HTMLButtonElement
    const endCalendarBtn = container.querySelector('#endCalendarBtn') as HTMLButtonElement
    
    startCalendarBtn.addEventListener('click', this.handleStartCalendarClick)
    endCalendarBtn.addEventListener('click', this.handleEndCalendarClick)
    
    // Handle date picker changes
    this.startDatePicker.addEventListener('change', this.handleStartDateChange)
    this.endDatePicker.addEventListener('change', this.handleEndDateChange)
    
    // Hide pickers when clicking outside
    document.addEventListener('click', this.handleDocumentClick)
    
    // Initialize the visual
    this.updateSliderRange()
  }

  private updateTargetCharts(min: number, max: number): void {
    if ((window as any).ApexCharts) {
      // Zoom the commit activity chart (always date-based)
      const commitChart = (window as any).ApexCharts.getChartByID('commit-activity-chart')
      if (commitChart) {
        commitChart.zoomX(min, max)
      }
      
      // Zoom the growth chart
      const growthChart = (window as any).ApexCharts.getChartByID('growth-chart')
      if (growthChart) {
        // Check if growth chart is in date or commit mode
        const xAxisType = growthChart.opts?.xaxis?.type
        
        if (xAxisType === 'datetime') {
          // Date mode - use same date range
          growthChart.zoomX(min, max)
        } else {
          // Commit mode - need to convert date range to commit indices
          // Calculate percentage of date range
          const dateRange = this.maxDate - this.minDate
          const startPercent = (min - this.minDate) / dateRange
          const endPercent = (max - this.minDate) / dateRange
          
          // Convert date range percentage to commit indices
          // The growth chart displays commit indices starting from 1
          // Linear series has indices 0 to N-1, displayed as 1 to N
          // For 13 commits: indices 0-12, displayed as 1-13
          
          // Calculate indices based on the percentage of the date range
          // For 13 commits:
          // - When startPercent = 0, we want startIndex = 1 (first commit)
          // - When endPercent = 1, we want endIndex = 13 (last commit)
          // But we need to ensure proper mapping without off-by-one errors
          
          // Map percentage to commit range [1, totalCommits]
          // When percent = 0: index = 1
          // When percent = 1: index = totalCommits
          const startIndex = Math.max(1, Math.round(startPercent * (this.totalCommits - 1)) + 1)
          const endIndex = Math.min(this.totalCommits, Math.round(endPercent * (this.totalCommits - 1)) + 1)
          
          growthChart.zoomX(startIndex, endIndex)
        }
      }
    }
  }

  destroy(): void {
    // Remove event listeners
    if (this.startSlider) {
      this.startSlider.removeEventListener('input', this.handleStartInput)
    }
    if (this.endSlider) {
      this.endSlider.removeEventListener('input', this.handleEndInput)
    }
    if (this.startDatePicker) {
      this.startDatePicker.removeEventListener('change', this.handleStartDateChange)
    }
    if (this.endDatePicker) {
      this.endDatePicker.removeEventListener('change', this.handleEndDateChange)
    }
    
    document.removeEventListener('click', this.handleDocumentClick)
    
    const container = document.querySelector('#' + this.containerId)
    if (container) {
      container.innerHTML = ''
    }
  }
  
  private handleStartInput = () => {
    if (parseFloat(this.startSlider!.value) > parseFloat(this.endSlider!.value)) {
      this.startSlider!.value = this.endSlider!.value
    }
    this.updateSliderRange()
    this.updateDateRange()
  }
  
  private handleEndInput = () => {
    if (parseFloat(this.endSlider!.value) < parseFloat(this.startSlider!.value)) {
      this.endSlider!.value = this.startSlider!.value
    }
    this.updateSliderRange()
    this.updateDateRange()
  }
  
  private updateSliderRange(): void {
    const sliderRange = document.querySelector('#sliderRange') as HTMLElement
    if (sliderRange && this.startSlider && this.endSlider) {
      const startPercent = parseFloat(this.startSlider.value)
      const endPercent = parseFloat(this.endSlider.value)
      sliderRange.style.left = startPercent + '%'
      sliderRange.style.width = (endPercent - startPercent) + '%'
    }
  }
  
  private updateDateRange(): void {
    const selectedStartLabel = document.querySelector('#selectedStartLabel') as HTMLElement
    const selectedEndLabel = document.querySelector('#selectedEndLabel') as HTMLElement
    
    if (this.startSlider && this.endSlider && selectedStartLabel && selectedEndLabel) {
      const startPercent = parseFloat(this.startSlider.value) / 100
      const endPercent = parseFloat(this.endSlider.value) / 100
      
      const startDate = this.minDate + (this.maxDate - this.minDate) * startPercent
      const endDate = this.minDate + (this.maxDate - this.minDate) * endPercent
      
      selectedStartLabel.textContent = this.formatShortDateTime(new Date(startDate))
      selectedEndLabel.textContent = this.formatShortDateTime(new Date(endDate))
      
      // Update date picker values to stay in sync
      if (this.startDatePicker && this.endDatePicker) {
        const startDateString = this.toDateTimeLocalString(new Date(startDate))
        const endDateString = this.toDateTimeLocalString(new Date(endDate))
        
        this.startDatePicker.value = startDateString
        this.endDatePicker.value = endDateString
        
        // Update constraints based on current selection
        this.updateDatePickerConstraints()
      }
      
      this.updateTargetCharts(startDate, endDate)
    }
  }
  
  private formatShortDateTime(date: Date): string {
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return date.toLocaleString(undefined, dateOptions)
  }
  
  private toDateTimeLocalString(date: Date): string {
    // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }
  
  private handleStartCalendarClick = (event: Event) => {
    event.stopPropagation()
    this.hideDatePicker(this.endDatePicker!)
    this.toggleDatePicker(this.startDatePicker!)
  }
  
  private handleEndCalendarClick = (event: Event) => {
    event.stopPropagation()
    this.hideDatePicker(this.startDatePicker!)
    this.toggleDatePicker(this.endDatePicker!)
  }
  
  private handleStartDateChange = () => {
    const selectedDate = new Date(this.startDatePicker!.value)
    const dateTime = selectedDate.getTime()
    
    // Ensure start date is not after end date
    const endDate = new Date(this.endDatePicker!.value)
    if (dateTime > endDate.getTime()) {
      this.endDatePicker!.value = this.startDatePicker!.value
    }
    
    // Update end date picker's min constraint to selected start date
    this.endDatePicker!.min = this.startDatePicker!.value
    
    // Update slider position
    this.updateSliderFromDate(dateTime, 'start')
    this.hideDatePicker(this.startDatePicker!)
  }
  
  private handleEndDateChange = () => {
    const selectedDate = new Date(this.endDatePicker!.value)
    const dateTime = selectedDate.getTime()
    
    // Ensure end date is not before start date
    const startDate = new Date(this.startDatePicker!.value)
    if (dateTime < startDate.getTime()) {
      this.startDatePicker!.value = this.endDatePicker!.value
    }
    
    // Update start date picker's max constraint to selected end date
    this.startDatePicker!.max = this.endDatePicker!.value
    
    // Update slider position
    this.updateSliderFromDate(dateTime, 'end')
    this.hideDatePicker(this.endDatePicker!)
  }
  
  private handleDocumentClick = (event: Event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.time-range-slider')) {
      this.hideDatePicker(this.startDatePicker!)
      this.hideDatePicker(this.endDatePicker!)
    }
  }
  
  private toggleDatePicker(picker: HTMLInputElement): void {
    if (picker.style.display === 'none') {
      picker.style.display = 'block'
      picker.focus()
    } else {
      picker.style.display = 'none'
    }
  }
  
  private hideDatePicker(picker: HTMLInputElement): void {
    picker.style.display = 'none'
  }
  
  private updateSliderFromDate(dateTime: number, type: 'start' | 'end'): void {
    const percentage = ((dateTime - this.minDate) / (this.maxDate - this.minDate)) * 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage))
    
    if (type === 'start') {
      this.startSlider!.value = clampedPercentage.toString()
    } else {
      this.endSlider!.value = clampedPercentage.toString()
    }
    
    this.updateSliderRange()
    this.updateDateRange()
  }
  
  private updateDatePickerConstraints(): void {
    if (!this.startDatePicker || !this.endDatePicker) return
    
    const minDateString = this.toDateTimeLocalString(new Date(this.minDate))
    const maxDateString = this.toDateTimeLocalString(new Date(this.maxDate))
    
    // Start picker: min is global min, max is current end selection
    this.startDatePicker.min = minDateString
    this.startDatePicker.max = this.endDatePicker.value || maxDateString
    
    // End picker: min is current start selection, max is global max
    this.endDatePicker.min = this.startDatePicker.value || minDateString
    this.endDatePicker.max = maxDateString
  }
}