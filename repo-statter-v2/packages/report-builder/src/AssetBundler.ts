import { Logger } from '@repo-statter/core'

export interface BundleOptions {
  inlineAssets?: boolean
  theme?: 'light' | 'dark' | 'auto'
  customCSS?: string
  customJS?: string
}

export class AssetBundler {
  private logger = new Logger('AssetBundler')
  
  async bundle(options: BundleOptions): Promise<{
    styles: string
    scripts: string
    icons: Record<string, string>
  }> {
    this.logger.info('Bundling assets')
    
    const [styles, scripts, icons] = await Promise.all([
      this.bundleStyles(options),
      this.bundleScripts(options),
      this.loadIcons()
    ])
    
    return { styles, scripts, icons }
  }
  
  private async bundleStyles(options: BundleOptions): Promise<string> {
    // Load theme styles
    const themeCSS = this.loadThemeStyles(options.theme)
    
    // Load component styles
    const componentCSS = this.loadComponentStyles()
    
    // Combine all styles
    const combinedCSS = [
      themeCSS,
      componentCSS,
      options.customCSS || ''
    ].join('\n')
    
    return this.minifyCSS(combinedCSS)
  }
  
  private async bundleScripts(options: BundleOptions): Promise<string> {
    // Load hydration scripts
    const hydrationJS = this.loadHydrationScripts()
    
    // Combine scripts
    const combinedJS = [
      '(function() {',
      '"use strict";',
      hydrationJS,
      options.customJS || '',
      '})();'
    ].join('\n')
    
    return combinedJS
  }
  
  private loadThemeStyles(theme?: string): string {
    const themes = {
      light: `
        :root {
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --text-primary: #212529;
          --text-secondary: #6c757d;
          --border-color: #dee2e6;
          --accent-color: #0066cc;
        }
      `,
      dark: `
        :root {
          --bg-primary: #1a1a1a;
          --bg-secondary: #2d2d2d;
          --text-primary: #ffffff;
          --text-secondary: #a0a0a0;
          --border-color: #404040;
          --accent-color: #4db8ff;
        }
      `,
      auto: ''
    }
    
    const baseTheme = themes[theme as keyof typeof themes] || themes.light
    
    if (theme === 'auto') {
      return `
        ${themes.light}
        
        @media (prefers-color-scheme: dark) {
          ${themes.dark}
        }
        
        [data-theme="dark"] {
          ${themes.dark}
        }
      `
    }
    
    return baseTheme
  }
  
  private loadComponentStyles(): string {
    return `
      /* Chart containers */
      .chart-container {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }
      
      /* Metric cards */
      .metric-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      /* Time slider */
      .time-range-slider {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1rem;
      }
      
      .slider-track {
        height: 6px;
        background: var(--border-color);
        border-radius: 3px;
        position: relative;
      }
      
      .slider-handle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--accent-color);
        border: 2px solid var(--bg-primary);
        position: absolute;
        top: -7px;
        cursor: grab;
      }
      
      /* Responsive grid */
      .chart-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
      }
      
      .full-width {
        grid-column: 1 / -1;
      }
      
      @media (min-width: 768px) {
        .half-width {
          grid-column: span 1;
        }
      }
      
      /* Base report styles */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: var(--text-primary);
        background: var(--bg-primary);
        margin: 0;
        padding: 0;
      }
      
      .report-header {
        background: var(--bg-secondary);
        padding: 2rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .report-content {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      .section-title {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
        color: var(--text-primary);
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .report-header {
          flex-direction: column;
          gap: 1rem;
        }
        
        .chart-grid {
          grid-template-columns: 1fr;
        }
        
        .report-content {
          padding: 1rem;
        }
      }
    `
  }
  
  private loadHydrationScripts(): string {
    return `
      // Component hydration
      document.addEventListener('DOMContentLoaded', function() {
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
          themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
          });
        }
        
        // Export functionality
        const exportButton = document.querySelector('.export-button');
        if (exportButton) {
          exportButton.addEventListener('click', () => {
            // Export logic here
            // Export functionality would be implemented here
          });
        }
        
        // Initialize interactive components
        const interactiveElements = document.querySelectorAll('[data-interactive]');
        interactiveElements.forEach(element => {
          // Add interaction handlers based on component type
          const componentType = element.getAttribute('data-component');
          if (componentType === 'time-slider') {
            initTimeSlider(element);
          }
        });
      });
      
      function initTimeSlider(element) {
        const handles = element.querySelectorAll('.slider-handle');
        handles.forEach(handle => {
          let isDragging = false;
          
          handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
          });
          
          document.addEventListener('mousemove', (e) => {
            if (isDragging) {
              // Update slider position
              const rect = element.getBoundingClientRect();
              const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
              const percentage = x / rect.width * 100;
              handle.style.left = percentage + '%';
            }
          });
          
          document.addEventListener('mouseup', () => {
            isDragging = false;
          });
        });
      }
    `
  }
  
  private loadIcons(): Record<string, string> {
    return {
      download: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
      theme: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>',
      github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.02 10.02 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>'
    }
  }
  
  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, '}')
      .replace(/\s*{\s*/g, '{')
      .replace(/:\s*/g, ':')
      .replace(/;\s*/g, ';')
      .trim()
  }
}