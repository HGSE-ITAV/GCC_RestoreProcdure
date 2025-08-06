// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuration for testing against GitHub Pages deployment
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'github-pages-report' }],
    ['json', { outputFile: 'github-pages-results.json' }],
  ],
  
  use: {
    /* Base URL for GitHub Pages */
    baseURL: 'https://hgse-itav.github.io/GCC_RestoreProcdure',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  // Don't start local server for GitHub Pages testing
  // webServer: undefined,
});