/**
 * Time Range Slider Widget - Interactive time range selection
 * @module @repo-statter/visualizations/widgets
 */

export interface TimeRangeData {
  min: Date
  max: Date
  current: {
    start: Date
    end: Date
  }
}

export interface TimeRangeSliderOptions {
  onChange?: (range: { start: Date; end: Date }) => void
  onChangeDebounced?: (range: { start: Date; end: Date }) => void
  debounceMs?: number
  showPresets?: boolean
  presets?: Array<{
    label: string
    value: string
  }>
  dateFormat?: (date: Date) => string
  theme?: 'light' | 'dark' | 'auto'
}

export class TimeRangeSlider {
  private data: TimeRangeData
  private options: TimeRangeSliderOptions
  private sliderId: string
  private isDragging: 'start' | 'end' | null = null
  private debounceTimer?: NodeJS.Timeout
  private container?: HTMLElement
  
  constructor(data: TimeRangeData, options: TimeRangeSliderOptions = {}) {
    this.data = data
    this.options = {
      showPresets: true,
      debounceMs: 300,
      presets: [
        { label: '1 Week', value: '1w' },
        { label: '1 Month', value: '1m' },
        { label: '3 Months', value: '3m' },
        { label: '6 Months', value: '6m' },
        { label: '1 Year', value: '1y' },
        { label: 'All Time', value: 'all' }
      ],
      ...options
    }
    this.sliderId = `slider-${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Render the slider HTML
   */
  render(): string {
    const minTime = this.data.min.getTime()
    const maxTime = this.data.max.getTime()
    const startTime = this.data.current.start.getTime()
    const endTime = this.data.current.end.getTime()
    const theme = this.detectTheme()
    const colors = this.getThemeColors(theme)
    
    const startPercent = ((startTime - minTime) / (maxTime - minTime)) * 100
    const endPercent = ((endTime - minTime) / (maxTime - minTime)) * 100
    
    return `
      <div id="${this.sliderId}" 
           class="time-range-slider ${theme}-theme"
           data-slider-id="${this.sliderId}"
           data-min="${minTime}" 
           data-max="${maxTime}"
           data-start="${startTime}"
           data-end="${endTime}"
           style="padding: 16px; background: ${colors.background}; border-radius: 8px;">
        
        <div class="slider-header" style="margin-bottom: 16px;">
          <div class="slider-labels" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span class="start-label" style="color: ${colors.text}; font-size: 14px;">
              ${this.formatDate(this.data.current.start)}
            </span>
            <span class="range-duration" style="color: ${colors.textSecondary}; font-size: 12px;">
              ${this.calculateDuration(this.data.current.start, this.data.current.end)}
            </span>
            <span class="end-label" style="color: ${colors.text}; font-size: 14px;">
              ${this.formatDate(this.data.current.end)}
            </span>
          </div>
        </div>
        
        <div class="slider-container" style="position: relative; height: 48px; margin: 16px 0;">
          <div class="slider-track" 
               style="position: absolute; top: 50%; transform: translateY(-50%); width: 100%; height: 4px; background: ${colors.track}; border-radius: 2px;">
            <div class="slider-range" 
                 style="position: absolute; top: 0; left: ${startPercent}%; width: ${endPercent - startPercent}%; height: 100%; background: ${colors.accent}; border-radius: 2px;"></div>
          </div>
          
          <button class="slider-handle start" 
                  role="slider" 
                  aria-label="Start date"
                  aria-valuemin="${minTime}"
                  aria-valuemax="${maxTime}"
                  aria-valuenow="${startTime}"
                  style="position: absolute; top: 50%; transform: translate(-50%, -50%); left: ${startPercent}%; width: 20px; height: 20px; border-radius: 50%; background: ${colors.accent}; border: 2px solid ${colors.background}; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: grab; transition: transform 0.2s;">
          </button>
          
          <button class="slider-handle end" 
                  role="slider" 
                  aria-label="End date"
                  aria-valuemin="${minTime}"
                  aria-valuemax="${maxTime}"
                  aria-valuenow="${endTime}"
                  style="position: absolute; top: 50%; transform: translate(-50%, -50%); left: ${endPercent}%; width: 20px; height: 20px; border-radius: 50%; background: ${colors.accent}; border: 2px solid ${colors.background}; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: grab; transition: transform 0.2s;">
          </button>
        </div>
        
        ${this.options.showPresets ? `
          <div class="preset-buttons" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
            ${(this.options.presets || []).map(preset => `
              <button data-range="${preset.value}" 
                      class="preset-button"
                      style="padding: 6px 12px; background: ${colors.buttonBg}; color: ${colors.text}; border: 1px solid ${colors.border}; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s;"
                      onmouseover="this.style.background='${colors.buttonHover}'"
                      onmouseout="this.style.background='${colors.buttonBg}'">
                ${preset.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `
  }
  
  /**
   * Hydrate the slider with interactivity
   */
  hydrate(container: HTMLElement): void {
    const slider = container.querySelector(`[data-slider-id="${this.sliderId}"]`) as HTMLElement
    if (!slider) return
    
    this.container = slider
    
    const startHandle = slider.querySelector('.slider-handle.start') as HTMLElement
    const endHandle = slider.querySelector('.slider-handle.end') as HTMLElement
    const range = slider.querySelector('.slider-range') as HTMLElement
    const startLabel = slider.querySelector('.start-label') as HTMLElement
    const endLabel = slider.querySelector('.end-label') as HTMLElement
    const durationLabel = slider.querySelector('.range-duration') as HTMLElement
    
    // Add drag functionality
    this.addDragHandlers(slider, startHandle, endHandle, range, startLabel, endLabel, durationLabel)
    
    // Add preset button handlers
    if (this.options.showPresets) {
      this.addPresetHandlers(slider)
    }
    
    // Add keyboard navigation
    this.addKeyboardHandlers(slider, startHandle, endHandle)
  }
  
  /**
   * Add drag handlers for the slider handles
   */
  private addDragHandlers(
    slider: HTMLElement,
    startHandle: HTMLElement,
    endHandle: HTMLElement,
    range: HTMLElement,
    startLabel: HTMLElement,
    endLabel: HTMLElement,
    durationLabel: HTMLElement
  ): void {
    const handleMouseDown = (handle: 'start' | 'end') => (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      this.isDragging = handle
      document.body.style.cursor = 'grabbing'
      
      // Update handle style
      const handleEl = handle === 'start' ? startHandle : endHandle
      handleEl.style.transform = 'translate(-50%, -50%) scale(1.2)'
    }
    
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const rect = slider.getBoundingClientRect()
      const trackRect = slider.querySelector('.slider-track')!.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width))
      
      const minTime = parseInt(slider.getAttribute('data-min')!)
      const maxTime = parseInt(slider.getAttribute('data-max')!)
      const newTime = minTime + (maxTime - minTime) * percentage
      
      if (this.isDragging === 'start') {
        const endTime = parseInt(slider.getAttribute('data-end')!)
        if (newTime < endTime) {
          slider.setAttribute('data-start', newTime.toString())
          this.updateSliderPositions(slider, startHandle, endHandle, range)
          startLabel.textContent = this.formatDate(new Date(newTime))
          durationLabel.textContent = this.calculateDuration(new Date(newTime), new Date(endTime))
          this.notifyChange(slider)
        }
      } else {
        const startTime = parseInt(slider.getAttribute('data-start')!)
        if (newTime > startTime) {
          slider.setAttribute('data-end', newTime.toString())
          this.updateSliderPositions(slider, startHandle, endHandle, range)
          endLabel.textContent = this.formatDate(new Date(newTime))
          durationLabel.textContent = this.calculateDuration(new Date(startTime), new Date(newTime))
          this.notifyChange(slider)
        }
      }
    }
    
    const handleMouseUp = () => {
      if (this.isDragging) {
        const handle = this.isDragging === 'start' ? startHandle : endHandle
        handle.style.transform = 'translate(-50%, -50%)'
      }
      this.isDragging = null
      document.body.style.cursor = ''
    }
    
    // Mouse events
    startHandle.addEventListener('mousedown', handleMouseDown('start'))
    endHandle.addEventListener('mousedown', handleMouseDown('end'))
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    // Touch events
    startHandle.addEventListener('touchstart', handleMouseDown('start'))
    endHandle.addEventListener('touchstart', handleMouseDown('end'))
    document.addEventListener('touchmove', handleMouseMove)
    document.addEventListener('touchend', handleMouseUp)
  }
  
  /**
   * Add preset button handlers
   */
  private addPresetHandlers(slider: HTMLElement): void {
    const buttons = slider.querySelectorAll('.preset-button')
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const range = button.getAttribute('data-range')!
        const maxTime = parseInt(slider.getAttribute('data-max')!)
        const minTime = parseInt(slider.getAttribute('data-min')!)
        
        let startTime: number
        let endTime = maxTime
        
        switch (range) {
          case '1w':
            startTime = maxTime - 7 * 24 * 60 * 60 * 1000
            break
          case '1m':
            startTime = maxTime - 30 * 24 * 60 * 60 * 1000
            break
          case '3m':
            startTime = maxTime - 90 * 24 * 60 * 60 * 1000
            break
          case '6m':
            startTime = maxTime - 180 * 24 * 60 * 60 * 1000
            break
          case '1y':
            startTime = maxTime - 365 * 24 * 60 * 60 * 1000
            break
          case 'all':
          default:
            startTime = minTime
            break
        }
        
        startTime = Math.max(minTime, startTime)
        
        slider.setAttribute('data-start', startTime.toString())
        slider.setAttribute('data-end', endTime.toString())
        
        // Update UI
        const startHandle = slider.querySelector('.slider-handle.start') as HTMLElement
        const endHandle = slider.querySelector('.slider-handle.end') as HTMLElement
        const rangeEl = slider.querySelector('.slider-range') as HTMLElement
        const startLabel = slider.querySelector('.start-label') as HTMLElement
        const endLabel = slider.querySelector('.end-label') as HTMLElement
        const durationLabel = slider.querySelector('.range-duration') as HTMLElement
        
        this.updateSliderPositions(slider, startHandle, endHandle, rangeEl)
        startLabel.textContent = this.formatDate(new Date(startTime))
        endLabel.textContent = this.formatDate(new Date(endTime))
        durationLabel.textContent = this.calculateDuration(new Date(startTime), new Date(endTime))
        
        this.notifyChange(slider)
      })
    })
  }
  
  /**
   * Add keyboard navigation
   */
  private addKeyboardHandlers(
    slider: HTMLElement,
    startHandle: HTMLElement,
    endHandle: HTMLElement
  ): void {
    const handleKeyDown = (handle: 'start' | 'end') => (e: KeyboardEvent) => {
      const minTime = parseInt(slider.getAttribute('data-min')!)
      const maxTime = parseInt(slider.getAttribute('data-max')!)
      const currentTime = parseInt(slider.getAttribute(`data-${handle}`)!)
      const step = (maxTime - minTime) / 100 // 1% step
      
      let newTime = currentTime
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newTime = Math.max(minTime, currentTime - step)
          break
        case 'ArrowRight':
        case 'ArrowUp':
          newTime = Math.min(maxTime, currentTime + step)
          break
        case 'Home':
          newTime = minTime
          break
        case 'End':
          newTime = maxTime
          break
        default:
          return
      }
      
      e.preventDefault()
      
      // Validate range
      if (handle === 'start') {
        const endTime = parseInt(slider.getAttribute('data-end')!)
        if (newTime >= endTime) return
      } else {
        const startTime = parseInt(slider.getAttribute('data-start')!)
        if (newTime <= startTime) return
      }
      
      // Update slider
      slider.setAttribute(`data-${handle}`, newTime.toString())
      
      const rangeEl = slider.querySelector('.slider-range') as HTMLElement
      const label = slider.querySelector(`.${handle}-label`) as HTMLElement
      const durationLabel = slider.querySelector('.range-duration') as HTMLElement
      
      this.updateSliderPositions(slider, startHandle, endHandle, rangeEl)
      label.textContent = this.formatDate(new Date(newTime))
      
      const startTime = parseInt(slider.getAttribute('data-start')!)
      const endTime = parseInt(slider.getAttribute('data-end')!)
      durationLabel.textContent = this.calculateDuration(new Date(startTime), new Date(endTime))
      
      this.notifyChange(slider)
    }
    
    startHandle.addEventListener('keydown', handleKeyDown('start'))
    endHandle.addEventListener('keydown', handleKeyDown('end'))
  }
  
  /**
   * Update slider visual positions
   */
  private updateSliderPositions(
    slider: HTMLElement,
    startHandle: HTMLElement,
    endHandle: HTMLElement,
    range: HTMLElement
  ): void {
    const minTime = parseInt(slider.getAttribute('data-min')!)
    const maxTime = parseInt(slider.getAttribute('data-max')!)
    const startTime = parseInt(slider.getAttribute('data-start')!)
    const endTime = parseInt(slider.getAttribute('data-end')!)
    
    const startPercentage = ((startTime - minTime) / (maxTime - minTime)) * 100
    const endPercentage = ((endTime - minTime) / (maxTime - minTime)) * 100
    
    startHandle.style.left = `${startPercentage}%`
    endHandle.style.left = `${endPercentage}%`
    range.style.left = `${startPercentage}%`
    range.style.width = `${endPercentage - startPercentage}%`
    
    // Update ARIA attributes
    startHandle.setAttribute('aria-valuenow', startTime.toString())
    endHandle.setAttribute('aria-valuenow', endTime.toString())
  }
  
  /**
   * Notify change handlers
   */
  private notifyChange(slider: HTMLElement): void {
    const startTime = parseInt(slider.getAttribute('data-start')!)
    const endTime = parseInt(slider.getAttribute('data-end')!)
    
    const range = {
      start: new Date(startTime),
      end: new Date(endTime)
    }
    
    // Immediate callback
    if (this.options.onChange) {
      this.options.onChange(range)
    }
    
    // Debounced callback
    if (this.options.onChangeDebounced) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      
      this.debounceTimer = setTimeout(() => {
        this.options.onChangeDebounced!(range)
      }, this.options.debounceMs)
    }
  }
  
  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    if (this.options.dateFormat) {
      return this.options.dateFormat(date)
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  /**
   * Calculate duration between two dates
   */
  private calculateDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    
    if (diffDays < 7) {
      return `${diffDays} days`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''}`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months > 1 ? 's' : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} year${years > 1 ? 's' : ''}`
    }
  }
  
  /**
   * Detect theme preference
   */
  private detectTheme(): 'light' | 'dark' {
    if (this.options.theme === 'light' || this.options.theme === 'dark') {
      return this.options.theme
    }
    
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    }
    
    return 'light'
  }
  
  /**
   * Get theme colors
   */
  private getThemeColors(theme: 'light' | 'dark') {
    if (theme === 'dark') {
      return {
        background: '#1a1a1a',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        track: '#333333',
        accent: '#66b3ff',
        border: '#444444',
        buttonBg: '#2a2a2a',
        buttonHover: '#3a3a3a'
      }
    }
    
    return {
      background: '#ffffff',
      text: '#333333',
      textSecondary: '#666666',
      track: '#e0e0e0',
      accent: '#0066cc',
      border: '#d0d0d0',
      buttonBg: '#f5f5f5',
      buttonHover: '#e8e8e8'
    }
  }
  
  /**
   * Update the time range
   */
  updateRange(start: Date, end: Date): void {
    this.data.current.start = start
    this.data.current.end = end
    
    if (this.container) {
      this.container.setAttribute('data-start', start.getTime().toString())
      this.container.setAttribute('data-end', end.getTime().toString())
      
      const startHandle = this.container.querySelector('.slider-handle.start') as HTMLElement
      const endHandle = this.container.querySelector('.slider-handle.end') as HTMLElement
      const range = this.container.querySelector('.slider-range') as HTMLElement
      const startLabel = this.container.querySelector('.start-label') as HTMLElement
      const endLabel = this.container.querySelector('.end-label') as HTMLElement
      const durationLabel = this.container.querySelector('.range-duration') as HTMLElement
      
      this.updateSliderPositions(this.container, startHandle, endHandle, range)
      startLabel.textContent = this.formatDate(start)
      endLabel.textContent = this.formatDate(end)
      durationLabel.textContent = this.calculateDuration(start, end)
    }
  }
  
  /**
   * Get current range
   */
  getRange(): { start: Date; end: Date } {
    if (this.container) {
      const startTime = parseInt(this.container.getAttribute('data-start')!)
      const endTime = parseInt(this.container.getAttribute('data-end')!)
      
      return {
        start: new Date(startTime),
        end: new Date(endTime)
      }
    }
    
    return this.data.current
  }
  
  /**
   * Destroy the slider
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    if (this.container) {
      // Remove event listeners
      const startHandle = this.container.querySelector('.slider-handle.start') as HTMLElement
      const endHandle = this.container.querySelector('.slider-handle.end') as HTMLElement
      
      if (startHandle) {
        startHandle.replaceWith(startHandle.cloneNode(true))
      }
      if (endHandle) {
        endHandle.replaceWith(endHandle.cloneNode(true))
      }
    }
  }
}