import { performanceMonitor } from '../utils/performance-monitor.js'

/**
 * Core initializer for non-chart functionality
 * This module handles theme, navigation, and other UI features that don't depend on chart libraries
 */
export class CoreInitializer {
  constructor() {
    // Mark core initialization start
    performanceMonitor.mark('coreInitStart')
  }

  public initialize(): void {
    // Initialize core features immediately
    this.initializeNavigation()
    this.initializeAccordions()
    
    // Mark core initialization complete
    performanceMonitor.mark('coreInitEnd')
    performanceMonitor.measure('coreInitialization', 'coreInitStart', 'coreInitEnd')
    
    // Setup performance reporting when page fully loads
    this.setupPerformanceReporting()
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
  
  private setupPerformanceReporting(): void {
    // Report performance metrics when page fully loads
    window.addEventListener('load', () => {
      // Wait a bit to ensure all metrics are collected
      setTimeout(() => {
        performanceMonitor.logReport()
        performanceMonitor.sendAnalytics()
      }, 100)
    })
    
    // Also log performance in dev mode when requested
    if (typeof window !== 'undefined') {
      (window as any).logPerformance = () => performanceMonitor.logReport()
    }
  }
}