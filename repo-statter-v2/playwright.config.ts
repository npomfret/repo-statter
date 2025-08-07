import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for visualization component testing
 * Supports visual regression tests, accessibility testing, and cross-browser testing
 */

export default defineConfig({
  testDir: './packages/visualizations/src/__tests__',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
    ['line'],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Capture screenshot after each test failure */
    screenshot: 'only-on-failure',
    
    /* Record video on test failure */
    video: 'retain-on-failure',
    
    /* Global test timeout */
    actionTimeout: 15000,
    navigationTimeout: 30000
  },
  
  /* Configure global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.test\.ts$/
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /visual-regression\.test\.ts$/
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /visual-regression\.test\.ts$/
    },
    
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /accessibility\.test\.ts$/
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /accessibility\.test\.ts$/
    },
    
    /* Accessibility-focused testing with specific settings */
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force colors for high contrast testing
        colorScheme: 'dark',
        reducedMotion: 'reduce'
      },
      testMatch: /accessibility\.test\.ts$/
    },
    
    /* Integration testing with full feature set */
    {
      name: 'integration',
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        trace: 'on'
      },
      testMatch: /integration\.test\.ts$/
    }
  ],
  
  /* Configure local dev server */
  webServer: {
    command: 'pnpm dev:playground',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe'
  },
  
  /* Test output directories */
  outputDir: 'test-results/',
  
  /* Visual comparison settings */
  expect: {
    // Threshold for visual comparisons
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict',
      // Update snapshots on CI
      updateSnapshots: process.env.CI ? 'none' : 'missing'
    },
    
    // Accessibility scan settings
    toPass: {
      timeout: 30000
    }
  },
  
  /* Global test timeout */
  timeout: 60000,
  
  /* Maximum time for the whole test run */
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : undefined,
  
  /* Metadata for test reports */
  metadata: {
    testType: 'visualization-components',
    framework: 'playwright',
    platform: process.platform,
    ci: !!process.env.CI
  }
})