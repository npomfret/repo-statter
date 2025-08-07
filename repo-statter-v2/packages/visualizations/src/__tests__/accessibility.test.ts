/**
 * Accessibility tests for visualization components
 * Tests WCAG 2.1 AA compliance, keyboard navigation, and screen reader support
 */

import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PLAYGROUND_URL = 'http://localhost:5173'

test.describe('Accessibility Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1200, height: 800 })
  })

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('Growth Chart should meet accessibility standards', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('File Types Pie Chart should meet accessibility standards', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=file-types-pie`)
      await page.waitForSelector('.file-types-chart')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('Metric Cards should meet accessibility standards', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('Top Files Table should meet accessibility standards', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('Time Range Slider should meet accessibility standards', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('Chart Toggle should meet accessibility standards', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=chart-toggle`)
      await page.waitForSelector('.chart-toggle')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('Top Files Table should support keyboard navigation', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      // Focus first tab
      await page.keyboard.press('Tab')
      const firstTab = page.locator('.tab-button:first-child')
      await expect(firstTab).toBeFocused()
      
      // Navigate to second tab with arrow keys
      await page.keyboard.press('ArrowRight')
      const secondTab = page.locator('.tab-button:nth-child(2)')
      await expect(secondTab).toBeFocused()
      
      // Activate tab with Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      
      // Verify tab is active
      await expect(secondTab).toHaveAttribute('aria-selected', 'true')
      
      // Navigate to table
      await page.keyboard.press('Tab')
      const firstSortable = page.locator('th.sortable:first-child')
      await expect(firstSortable).toBeFocused()
      
      // Sort with Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      
      // Verify sort indicator changed
      await expect(firstSortable).toHaveClass(/sort-(asc|desc)/)
    })

    test('Time Range Slider should support keyboard navigation', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Focus start handle
      await page.click('.slider-handle.start')
      const startHandle = page.locator('.slider-handle.start')
      await expect(startHandle).toBeFocused()
      
      // Move with arrow keys
      const initialStart = await startHandle.getAttribute('aria-valuenow')
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(100)
      
      const newStart = await startHandle.getAttribute('aria-valuenow')
      expect(parseInt(newStart!)).toBeGreaterThan(parseInt(initialStart!))
      
      // Move to end handle
      await page.keyboard.press('Tab')
      const endHandle = page.locator('.slider-handle.end')
      await expect(endHandle).toBeFocused()
      
      // Test large jumps with Page keys
      const initialEnd = await endHandle.getAttribute('aria-valuenow')
      await page.keyboard.press('PageDown')
      await page.waitForTimeout(100)
      
      const newEnd = await endHandle.getAttribute('aria-valuenow')
      expect(parseInt(newEnd!)).toBeLessThan(parseInt(initialEnd!))
    })

    test('Chart Toggle should support keyboard navigation', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=chart-toggle`)
      await page.waitForSelector('.chart-toggle')
      
      // Focus first option
      await page.keyboard.press('Tab')
      const firstOption = page.locator('.toggle-option:first-child')
      await expect(firstOption).toBeFocused()
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight')
      const secondOption = page.locator('.toggle-option:nth-child(2)')
      await expect(secondOption).toBeFocused()
      
      // Activate with Space
      await page.keyboard.press('Space')
      await page.waitForTimeout(300)
      
      // Verify selection
      await expect(secondOption).toHaveAttribute('aria-checked', 'true')
    })

    test('Preset buttons should be keyboard accessible', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Navigate to preset buttons
      await page.keyboard.press('Tab') // Start handle
      await page.keyboard.press('Tab') // End handle
      await page.keyboard.press('Tab') // First preset
      
      const oneMonthBtn = page.locator('[data-range="1m"]')
      await expect(oneMonthBtn).toBeFocused()
      
      // Activate with Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      
      // Verify range changed
      const startLabel = page.locator('.start-label')
      const labelText = await startLabel.textContent()
      
      // Should show a date from approximately 1 month ago
      expect(labelText).toBeTruthy()
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should provide meaningful ARIA labels', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Check slider handles have proper labels
      const startHandle = page.locator('.slider-handle.start')
      const endHandle = page.locator('.slider-handle.end')
      
      await expect(startHandle).toHaveAttribute('aria-label', 'Start date')
      await expect(endHandle).toHaveAttribute('aria-label', 'End date')
      
      // Check value attributes
      await expect(startHandle).toHaveAttribute('aria-valuemin')
      await expect(startHandle).toHaveAttribute('aria-valuemax')
      await expect(startHandle).toHaveAttribute('aria-valuenow')
    })

    test('should announce table sorting to screen readers', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      // Click sort header
      await page.click('th.sortable[data-sort="metric"]')
      await page.waitForTimeout(300)
      
      // Check for aria-live region
      const liveRegion = page.locator('[aria-live]')
      await expect(liveRegion).toBeVisible()
      
      // Verify sort announcement
      const announcement = await liveRegion.textContent()
      expect(announcement).toContain('sorted')
    })

    test('should provide table captions and headers', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      // Check table structure
      const table = page.locator('table.files-table')
      const caption = table.locator('caption')
      const headers = table.locator('th')
      
      await expect(caption).toBeVisible()
      await expect(headers).toHaveCount(3) // Path, Metric, Secondary
      
      // Check header scope attributes
      for (const header of await headers.all()) {
        await expect(header).toHaveAttribute('scope', 'col')
      }
    })

    test('should announce chart data to screen readers', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=growth-chart`)
      await page.waitForSelector('.growth-chart')
      
      // Check for fallback data table
      const dataTable = page.locator('noscript table, .chart-data-table')
      await expect(dataTable).toBeVisible()
      
      // Verify table has proper structure
      const caption = dataTable.locator('caption')
      const headers = dataTable.locator('th')
      
      await expect(caption).toBeVisible()
      await expect(headers.first()).toHaveText('Date')
    })
  })

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should meet color contrast requirements', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Use axe-core to check color contrast
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['color-contrast'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should maintain contrast in dark theme', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Switch to dark theme
      await page.click('[data-theme="dark"]')
      await page.waitForTimeout(500)
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['color-contrast'])
        .analyze()
        
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should not rely solely on color for information', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Check trend indicators have text/icons, not just color
      const trendUp = page.locator('.metric-trend.trend-up')
      const trendDown = page.locator('.metric-trend.trend-down')
      
      // Should have arrow icons or text indicators
      if (await trendUp.count() > 0) {
        const hasIcon = await trendUp.locator('.trend-arrow, svg').count() > 0
        const hasText = (await trendUp.textContent())?.includes('%')
        expect(hasIcon || hasText).toBe(true)
      }
      
      if (await trendDown.count() > 0) {
        const hasIcon = await trendDown.locator('.trend-arrow, svg').count() > 0
        const hasText = (await trendDown.textContent())?.includes('%')
        expect(hasIcon || hasText).toBe(true)
      }
    })
  })

  test.describe('Focus Management', () => {
    test('should trap focus in modal-like components', async () => {
      // This test would be relevant if we had modal components
      // For now, test focus order in complex components
      await page.goto(`${PLAYGROUND_URL}?component=top-files-table`)
      await page.waitForSelector('.top-files-table')
      
      // Get all focusable elements
      const focusableElements = await page.locator([
        'button', 'input', 'select', 'textarea', 'a[href]',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ')).all()
      
      expect(focusableElements.length).toBeGreaterThan(0)
      
      // Test logical tab order
      await page.keyboard.press('Tab')
      await expect(focusableElements[0]).toBeFocused()
    })

    test('should restore focus after interactions', async () => {
      await page.goto(`${PLAYGROUND_URL}?component=chart-toggle`)
      await page.waitForSelector('.chart-toggle')
      
      const firstOption = page.locator('.toggle-option:first-child')
      const secondOption = page.locator('.toggle-option:nth-child(2)')
      
      // Focus first option
      await firstOption.focus()
      await expect(firstOption).toBeFocused()
      
      // Click second option
      await secondOption.click()
      
      // Focus should move to activated option
      await expect(secondOption).toBeFocused()
    })
  })

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async () => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })
      
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Animations should be disabled or minimal
      const card = page.locator('.metric-card:first-child')
      
      // Check for reduced animation classes or inline styles
      const hasReducedMotion = await page.evaluate(() => {
        const cards = document.querySelectorAll('.metric-card')
        return Array.from(cards).some(card => {
          const styles = window.getComputedStyle(card)
          return styles.animationDuration === '0s' || 
                 styles.transitionDuration === '0s' ||
                 card.classList.contains('reduced-motion')
        })
      })
      
      // Should either have reduced motion or no problematic animations
      expect(hasReducedMotion).toBe(true)
    })
  })

  test.describe('Alternative Input Methods', () => {
    test('should support touch interactions', async () => {
      // Simulate touch device
      await page.emulate({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      })
      
      await page.goto(`${PLAYGROUND_URL}?component=time-range-slider`)
      await page.waitForSelector('.time-range-slider')
      
      // Test touch drag on slider handle
      const startHandle = page.locator('.slider-handle.start')
      await startHandle.tap()
      
      // Should be able to drag with touch
      await startHandle.dragTo(page.locator('.slider-track'), {
        targetPosition: { x: 100, y: 0 }
      })
      
      await page.waitForTimeout(300)
      
      // Verify range changed
      const rangeInfo = page.locator('.range-info')
      await expect(rangeInfo).toBeVisible()
    })

    test('should work with high contrast mode', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
      
      await page.goto(`${PLAYGROUND_URL}?component=metric-card`)
      await page.waitForSelector('.metric-card')
      
      // Components should still be visible and functional
      const cards = page.locator('.metric-card')
      await expect(cards.first()).toBeVisible()
      
      // Text should be readable
      const label = page.locator('.metric-label').first()
      await expect(label).toBeVisible()
    })
  })
})