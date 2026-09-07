import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Playwright configuration for API testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once on failure (helps with rate limiting)
  workers: process.env.CI ? 1 : 2, // Limit to 2 parallel workers to avoid rate limiting
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    ['allure-playwright']
  ],
  
  // Global test configuration
  use: {
    // Base URL from environment
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // API testing specific settings
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Test projects for different API types
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'admin-api',
      testMatch: /.*admin.*\.spec\.ts/,
      use: {
        baseURL: process.env.ADMIN_API_URL || 'http://localhost:3000',
      },
    },
    
    {
      name: 'player-api',
      testMatch: /.*player.*\.spec\.ts/,
      use: {
        baseURL: process.env.PLAYER_API_URL || 'http://localhost:3000',
      },
    },
    
    {
      name: 'agent-api',
      testMatch: /.*agent.*\.spec\.ts/,
      use: {
        baseURL: process.env.AGENT_API_URL || 'http://localhost:3000',
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
