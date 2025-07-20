/**
 * Core initializer for non-chart functionality
 * This module handles theme, navigation, and other UI features that don't depend on chart libraries
 */
export class CoreInitializer {
  constructor() {
    // Core initializer doesn't need data for now
  }

  public initialize(): void {
    // Initialize core features immediately
    this.initializeTheme()
    this.initializeNavigation()
    this.initializeAccordions()
    
    // Setup theme toggle listener
    this.setupThemeToggle()
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    let theme = savedTheme || (systemPrefersDark ? 'dark' : 'light')
    
    document.documentElement.setAttribute('data-bs-theme', theme)
    
    // Update theme toggle button state
    const themeToggle = document.getElementById('theme-toggle')
    if (themeToggle) {
      const icon = themeToggle.querySelector('i')
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'
      }
    }
    
    // Save theme preference
    localStorage.setItem('theme', theme)
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-bs-theme', newTheme)
        // Note: Charts will update theme when they're loaded
      }
    })
  }

  private setupThemeToggle(): void {
    const themeToggle = document.getElementById('themeToggle')
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme')
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-bs-theme', newTheme)
        localStorage.setItem('theme', newTheme)
        
        // Update button icon
        const icon = themeToggle.querySelector('i')
        if (icon) {
          icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'
        }
        
        // Dispatch custom event for charts to listen to (when loaded)
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }))
      })
    }
  }

  private initializeNavigation(): void {
    const navLinks = document.querySelectorAll('.sticky-nav a')
    const sections = document.querySelectorAll('section[id]')
    
    // Smooth scroll behavior for navigation links
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const targetId = link.getAttribute('href')?.substring(1)
        if (targetId) {
          const targetSection = document.getElementById(targetId)
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }
      })
    })
    
    // Intersection Observer for active section highlighting
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Remove active class from all links
          navLinks.forEach(link => link.classList.remove('active'))
          
          // Add active class to corresponding link
          const activeLink = document.querySelector(`.sticky-nav a[href="#${entry.target.id}"]`)
          if (activeLink) {
            activeLink.classList.add('active')
          }
        }
      })
    }, observerOptions)
    
    // Observe all sections
    sections.forEach(section => {
      observer.observe(section)
    })
  }

  private initializeAccordions(): void {
    // Get saved accordion states from localStorage
    const savedStates = localStorage.getItem('accordionStates')
    const accordionStates = savedStates ? JSON.parse(savedStates) : {}
    
    // Get all accordion items
    const accordionItems = document.querySelectorAll('.accordion-collapse')
    
    accordionItems.forEach(item => {
      const itemId = item.id
      
      // Apply saved state if it exists
      if (accordionStates[itemId] !== undefined) {
        if (accordionStates[itemId]) {
          item.classList.add('show')
          const button = item.previousElementSibling?.querySelector('.accordion-button')
          if (button) {
            button.classList.remove('collapsed')
            button.setAttribute('aria-expanded', 'true')
          }
        } else {
          item.classList.remove('show')
          const button = item.previousElementSibling?.querySelector('.accordion-button')
          if (button) {
            button.classList.add('collapsed')
            button.setAttribute('aria-expanded', 'false')
          }
        }
      }
      
      // Listen for accordion state changes
      item.addEventListener('shown.bs.collapse', () => {
        this.saveAccordionState(itemId, true)
      })
      
      item.addEventListener('hidden.bs.collapse', () => {
        this.saveAccordionState(itemId, false)
      })
    })
  }
  
  private saveAccordionState(itemId: string, isOpen: boolean): void {
    const savedStates = localStorage.getItem('accordionStates')
    const accordionStates = savedStates ? JSON.parse(savedStates) : {}
    
    accordionStates[itemId] = isOpen
    localStorage.setItem('accordionStates', JSON.stringify(accordionStates))
  }
}