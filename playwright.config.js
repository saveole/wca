// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Default timeout */
    timeout: 10000,

    /* Viewport size */
    viewport: { width: 1280, height: 720 },

    /* Ignore HTTPS errors for external requests */
    ignoreHTTPSErrors: true,

    /* Launch options for component testing */
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  },

  /* Configure projects for different test types */
  projects: [
    {
      name: 'component-tests',
      use: {
        ...devices['Desktop Chrome'],
        // Component testing configuration
        headless: true,
        viewport: { width: 360, height: 600 }
      },
      testMatch: [
        'tests/components/**/*.test.js',
        'tests/unit/**/*.test.js'
      ]
    },
    {
      name: 'visual-tests',
      use: {
        ...devices['Desktop Chrome'],
        // Visual testing configuration
        headless: true,
        viewport: { width: 360, height: 600 }
      },
      testMatch: [
        'tests/visual/**/*.test.js'
      ]
    },
    {
      name: 'accessibility-tests',
      use: {
        ...devices['Desktop Chrome'],
        // Accessibility testing configuration
        headless: true
      },
      testMatch: [
        'tests/accessibility/**/*.test.js'
      ]
    },
    {
      name: 'integration-tests',
      use: {
        ...devices['Desktop Chrome'],
        // Integration testing configuration
        headless: true
      },
      testMatch: [
        'tests/integration/**/*.test.js'
      ]
    }
  ],

  /* Global setup for Chrome API mocking */
  globalSetup: './tests/setup/global-setup.js',

  /* Global teardown for cleanup */
  globalTeardown: './tests/setup/global-teardown.js',

  /* Expect configuration */
  expect: {
    timeout: 5000,
  },

  /* Metadata */
  metadata: {
    project: 'WebClip Assistant Component Tests',
    version: '1.0.0',
    strategy: 'Component Isolation with Mocked APIs'
  }
});