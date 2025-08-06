/**
 * Chart Toggle Component - Toggle between different chart views
 * @module @repo-statter/visualizations/widgets
 */

export interface ToggleOption {
  value: string
  label: string
  icon?: string
  description?: string
  disabled?: boolean
}

export interface ChartToggleOptions {
  defaultValue?: string
  onChange?: (value: string) => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'small' | 'medium' | 'large'
  variant?: 'buttons' | 'tabs' | 'pills'
  orientation?: 'horizontal' | 'vertical'
  allowDeselect?: boolean
}

export class ChartToggle {
  private toggleId: string
  private currentValue: string

  constructor(
    private options: ToggleOption[],
    private config: ChartToggleOptions = {}
  ) {
    this.toggleId = `toggle-${Math.random().toString(36).substr(2, 9)}`
    this.currentValue = this.config.defaultValue || this.options[0]?.value || ''
    
    this.config = {
      size: 'medium',
      variant: 'buttons',
      orientation: 'horizontal',
      theme: 'auto',
      allowDeselect: false,
      ...config
    }
  }

  render(): string {
    const theme = this.detectTheme()
    const colors = this.getThemeColors(theme)
    const size = this.getSizeConfig()
    
    const containerStyle = this.getContainerStyle(colors, size)
    const isVertical = this.config.orientation === 'vertical'
    
    return `
      <div id="${this.toggleId}" 
           class="chart-toggle ${theme}-theme ${this.config.variant}-variant ${this.config.size}-size ${this.config.orientation}"
           role="radiogroup" 
           aria-label="Chart view options"
           style="${containerStyle}">
        
        ${this.config.variant === 'tabs' ? `
          <div class="toggle-tabs-border" 
               style="
                 position: absolute;
                 bottom: 0;
                 left: 0;
                 right: 0;
                 height: 1px;
                 background: ${colors.border};
               "></div>
        ` : ''}
        
        ${this.options.map((option, index) => {
          const isActive = option.value === this.currentValue
          const isDisabled = option.disabled || false
          const buttonStyle = this.getButtonStyle(colors, size, isActive, isDisabled)
          
          return `
            <button 
              type="button"
              role="radio"
              aria-checked="${isActive}"
              aria-disabled="${isDisabled}"
              data-value="${option.value}"
              data-index="${index}"
              class="toggle-option ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
              style="${buttonStyle}"
              title="${option.description || option.label}"
              ${isDisabled ? 'disabled' : ''}>
              
              <div class="toggle-content" 
                   style="
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: ${size.iconSpacing};
                     ${isVertical ? 'flex-direction: column;' : ''}
                   ">
                
                ${option.icon ? `
                  <span class="toggle-icon" 
                        style="
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          width: ${size.iconSize};
                          height: ${size.iconSize};
                          flex-shrink: 0;
                        ">
                    ${this.renderIcon(option.icon, size.iconSize)}
                  </span>
                ` : ''}
                
                <span class="toggle-label" 
                      style="
                        font-size: ${size.fontSize};
                        font-weight: ${isActive ? '600' : '500'};
                        line-height: 1;
                        text-align: center;
                        ${isVertical && option.icon ? `font-size: ${size.verticalLabelSize};` : ''}
                      ">
                  ${option.label}
                </span>
              </div>
              
              ${this.config.variant === 'tabs' && isActive ? `
                <div class="active-indicator" 
                     style="
                       position: absolute;
                       bottom: -1px;
                       left: 0;
                       right: 0;
                       height: 2px;
                       background: ${colors.accent};
                       border-radius: 1px 1px 0 0;
                     "></div>
              ` : ''}
            </button>
          `
        }).join('')}
      </div>
    `
  }

  hydrate(container: HTMLElement): void {
    const toggle = container.querySelector(`#${this.toggleId}`) as HTMLElement
    if (!toggle) return

    const buttons = toggle.querySelectorAll('.toggle-option')
    
    buttons.forEach(button => {
      button.addEventListener('click', this.handleClick.bind(this))
      button.addEventListener('keydown', (e) => this.handleKeydown(e as KeyboardEvent))
      button.addEventListener('focus', this.handleFocus.bind(this))
      button.addEventListener('blur', this.handleBlur.bind(this))
    })

    // Set initial focus
    const activeButton = toggle.querySelector('.toggle-option.active') as HTMLElement
    if (activeButton) {
      activeButton.setAttribute('tabindex', '0')
    }
    
    // Set tabindex for other buttons
    buttons.forEach((button, index) => {
      if (!button.classList.contains('active')) {
        button.setAttribute('tabindex', '-1')
      }
    })
  }

  private handleClick(event: Event): void {
    const button = event.target as HTMLElement
    const clickedButton = button.closest('.toggle-option') as HTMLElement
    if (!clickedButton || clickedButton.classList.contains('disabled')) return

    const value = clickedButton.getAttribute('data-value')!
    
    // Handle deselection if allowed
    if (this.config.allowDeselect && this.currentValue === value) {
      this.setValueInternal('')
      return
    }
    
    this.setValueInternal(value)
  }

  private handleKeydown(event: KeyboardEvent): void {
    const button = event.target as HTMLElement
    const toggle = button.closest('.chart-toggle') as HTMLElement
    const buttons = Array.from(toggle.querySelectorAll('.toggle-option:not(.disabled)')) as HTMLElement[]
    const currentIndex = buttons.indexOf(button)
    
    let nextIndex = currentIndex
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        nextIndex = (currentIndex + 1) % buttons.length
        break
        
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length
        break
        
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
        
      case 'End':
        event.preventDefault()
        nextIndex = buttons.length - 1
        break
        
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.handleClick(event)
        return
        
      default:
        return
    }
    
    if (nextIndex !== currentIndex) {
      const nextButton = buttons[nextIndex]
      if (nextButton) {
        nextButton.focus()
        const value = nextButton.getAttribute('data-value')!
        this.setValueInternal(value)
      }
    }
  }

  private handleFocus(event: Event): void {
    const button = event.target as HTMLElement
    button.setAttribute('tabindex', '0')
    
    // Remove tabindex from other buttons
    const toggle = button.closest('.chart-toggle')
    const otherButtons = toggle?.querySelectorAll('.toggle-option:not(:focus)') || []
    Array.from(otherButtons).forEach(btn => btn.setAttribute('tabindex', '-1'))
  }

  private handleBlur(event: Event): void {
    // Keep tabindex on active button
    const button = event.target as HTMLElement
    if (!button.classList.contains('active')) {
      button.setAttribute('tabindex', '-1')
    }
  }

  private setValueInternal(value: string): void {
    if (this.currentValue === value) return
    
    this.currentValue = value
    
    // Update UI
    this.updateActiveState()
    
    // Notify change
    if (this.config.onChange) {
      this.config.onChange(value)
    }
  }

  private updateActiveState(): void {
    const toggle = document.querySelector(`#${this.toggleId}`)
    if (!toggle) return
    
    const buttons = toggle.querySelectorAll('.toggle-option')
    
    buttons.forEach(button => {
      const buttonValue = button.getAttribute('data-value')
      const isActive = buttonValue === this.currentValue
      
      if (isActive) {
        button.classList.add('active')
        button.setAttribute('aria-checked', 'true')
        button.setAttribute('tabindex', '0')
      } else {
        button.classList.remove('active')
        button.setAttribute('aria-checked', 'false')
        button.setAttribute('tabindex', '-1')
      }
    })
    
    // Update styles
    this.updateButtonStyles()
  }

  private updateButtonStyles(): void {
    const toggle = document.querySelector(`#${this.toggleId}`)
    if (!toggle) return
    
    const theme = this.detectTheme()
    const colors = this.getThemeColors(theme)
    const size = this.getSizeConfig()
    
    const buttons = toggle.querySelectorAll('.toggle-option')
    buttons.forEach(button => {
      const isActive = button.classList.contains('active')
      const isDisabled = button.classList.contains('disabled')
      const buttonStyle = this.getButtonStyle(colors, size, isActive, isDisabled)
      ;(button as HTMLElement).style.cssText += '; ' + buttonStyle
    })
  }

  private detectTheme(): 'light' | 'dark' {
    if (this.config.theme === 'light' || this.config.theme === 'dark') {
      return this.config.theme
    }
    
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    }
    
    return 'light'
  }

  private getThemeColors(theme: 'light' | 'dark') {
    if (theme === 'dark') {
      return {
        background: '#2a2a2a',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        accent: '#66b3ff',
        border: '#444444',
        buttonBg: '#3a3a3a',
        buttonHover: '#4a4a4a',
        buttonActive: '#66b3ff',
        buttonActiveHover: '#5aa3f0',
        buttonDisabled: '#1a1a1a',
        textDisabled: '#666666'
      }
    }
    
    return {
      background: '#ffffff',
      text: '#333333',
      textSecondary: '#666666',
      accent: '#0066cc',
      border: '#e0e0e0',
      buttonBg: '#f8f9fa',
      buttonHover: '#e9ecef',
      buttonActive: '#0066cc',
      buttonActiveHover: '#0052a3',
      buttonDisabled: '#f0f0f0',
      textDisabled: '#999999'
    }
  }

  private getSizeConfig() {
    const sizes = {
      small: {
        padding: '6px 12px',
        fontSize: '12px',
        verticalLabelSize: '10px',
        iconSize: '14px',
        iconSpacing: '4px',
        borderRadius: '4px',
        gap: '4px'
      },
      medium: {
        padding: '8px 16px',
        fontSize: '14px',
        verticalLabelSize: '12px',
        iconSize: '16px',
        iconSpacing: '6px',
        borderRadius: '6px',
        gap: '6px'
      },
      large: {
        padding: '12px 20px',
        fontSize: '16px',
        verticalLabelSize: '14px',
        iconSize: '20px',
        iconSpacing: '8px',
        borderRadius: '8px',
        gap: '8px'
      }
    }
    
    return sizes[this.config.size!] || sizes.medium
  }

  private getContainerStyle(colors: any, size: any): string {
    const isVertical = this.config.orientation === 'vertical'
    
    const baseStyle = `
      display: inline-flex;
      position: relative;
      font-family: system-ui, -apple-system, sans-serif;
      flex-direction: ${isVertical ? 'column' : 'row'};
      gap: ${size.gap};
    `
    
    switch (this.config.variant) {
      case 'tabs':
        return baseStyle + `
          background: transparent;
          border-bottom: 1px solid ${colors.border};
        `
        
      case 'pills':
        return baseStyle + `
          background: ${colors.background};
          padding: 4px;
          border-radius: calc(${size.borderRadius} + 4px);
          border: 1px solid ${colors.border};
        `
        
      case 'buttons':
      default:
        return baseStyle + `
          background: transparent;
        `
    }
  }

  private getButtonStyle(colors: any, size: any, isActive: boolean, isDisabled: boolean): string {
    let backgroundColor = colors.buttonBg
    let textColor = colors.text
    let borderColor = colors.border
    
    if (isDisabled) {
      backgroundColor = colors.buttonDisabled
      textColor = colors.textDisabled
    } else if (isActive) {
      backgroundColor = this.config.variant === 'pills' ? colors.buttonActive : 
                       this.config.variant === 'tabs' ? 'transparent' : colors.buttonActive
      textColor = this.config.variant === 'pills' ? '#ffffff' :
                  this.config.variant === 'tabs' ? colors.accent : '#ffffff'
      borderColor = colors.accent
    }
    
    const baseStyle = `
      padding: ${size.padding};
      border: 1px solid ${borderColor};
      border-radius: ${size.borderRadius};
      background: ${backgroundColor};
      color: ${textColor};
      cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
      transition: all 0.2s ease;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      flex-shrink: 0;
    `
    
    if (this.config.variant === 'tabs') {
      return baseStyle + `
        border: none;
        border-radius: 0;
        background: transparent;
        padding-bottom: calc(${size.padding.split(' ')[0]} + 4px);
      `
    }
    
    if (this.config.variant === 'pills') {
      return baseStyle + `
        border: none;
      `
    }
    
    return baseStyle
  }

  private renderIcon(iconName: string, size: string): string {
    // Map icon names to SVG icons
    const icons: Record<string, string> = {
      chart: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
      </svg>`,
      table: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10H3v9z"/>
      </svg>`,
      line: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
      </svg>`,
      bar: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
      </svg>`,
      pie: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z"/>
      </svg>`,
      calendar: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>`,
      commit: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
        <path d="M12 1v6m0 8v6m11-7h-6m-8 0H1" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>`
    }
    
    return icons[iconName] || `<div style="width: ${size}; height: ${size}; background: currentColor; border-radius: 2px;"></div>`
  }

  getValue(): string {
    return this.currentValue
  }

  setValue(value: string, triggerChange = true): void {
    const oldValue = this.currentValue
    this.currentValue = value
    
    this.updateActiveState()
    
    if (triggerChange && oldValue !== value && this.config.onChange) {
      this.config.onChange(value)
    }
  }

  setOptions(options: ToggleOption[]): void {
    this.options = options
    
    // Update the DOM
    const toggle = document.querySelector(`#${this.toggleId}`)
    if (toggle) {
      const container = toggle.parentElement
      if (container) {
        container.innerHTML = this.render()
        this.hydrate(container)
      }
    }
  }

  disable(value: string): void {
    const option = this.options.find(opt => opt.value === value)
    if (option) {
      option.disabled = true
      this.updateButtonStyles()
    }
  }

  enable(value: string): void {
    const option = this.options.find(opt => opt.value === value)
    if (option) {
      option.disabled = false
      this.updateButtonStyles()
    }
  }

  destroy(): void {
    const toggle = document.querySelector(`#${this.toggleId}`)
    if (toggle) {
      toggle.remove()
    }
  }
}