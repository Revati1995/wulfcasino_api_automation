import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Playwright configuration for API testing
 * @see https://playwright.dev/docs/test-configuration
 *
 * Rate limiting: the backend throttles login endpoints at 5 requests/min per IP.
 * global-setup.ts logs in once per role and caches the tokens; tests reuse them.
 * Keep workers low so unauthenticated auth specs cannot burst the login limit.
 */
export default defineConfig({
  testDir: './tests',

  // Logs in once per role and caches tokens in .auth/tokens.json
  globalSetup: require.resolve('./global-setup'),

  // Maximum time one test can run. Must exceed the longest 429 back-off in
  // utils/api-client.ts (up to 65 s) so a throttled login can recover in-test.
  timeout: 120 * 1000,

  // Test execution settings
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    ['allure-playwright'],
  ],

  // Global test configuration
  use: {
    // Base URL from environment
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // API testing specific settings
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },

    // Collect trace on first retry
    trace: 'on-first-retry',
  },

  // One project per API surface. testMatch is anchored to the tests/<area>/
  // folder so e.g. tests/agent/player-management.spec.ts only runs under agent-api.
  projects: [
    {
      name: 'admin-api',
      testMatch: /[\\/]tests[\\/]admin[\\/].+\.spec\.ts$/,
      use: {
        baseURL: process.env.ADMIN_API_URL || 'http://localhost:3000',
      },
    },

    {
      name: 'player-api',
      testMatch: /[\\/]tests[\\/]player[\\/].+\.spec\.ts$/,
      use: {
        baseURL: process.env.PLAYER_API_URL || 'http://localhost:3000',
      },
    },

    {
      name: 'agent-api',
      testMatch: /[\\/]tests[\\/]agent[\\/].+\.spec\.ts$/,
      use: {
        baseURL: process.env.AGENT_API_URL || 'http://localhost:3000',
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
