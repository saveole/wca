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
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'chrome-extension://__MSG_@@extension_id__/',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Default timeout */
    timeout: 5000,

    /* Viewport size */
    viewport: { width: 1280, height: 720 },

    /* Ignore HTTPS errors for extension pages */
    ignoreHTTPSErrors: true,

    /* Launch options for Chrome extension testing */
    launchOptions: {
      args: [
        '--load-extension=./',
        '--disable-extensions-except=./',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Custom browser channel for extension testing
        channel: 'chrome'
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'echo "Extension testing - no web server needed"',
    url: 'chrome-extension://__MSG_@@extension_id__/ui/main_popup.html',
    reuseExistingServer: true,
    timeout: 5000,
  },

  /* Test match patterns */
  testMatch: [
    'tests/ui/**/*.test.js',
    'tests/accessibility/**/*.test.js',
    'tests/interactions/**/*.test.js'
  ],

  /* Expect configuration */
  expect: {
    timeout: 5000,
  },

  /* Metadata */
  metadata: {
    project: 'WebClip Assistant UI Tests',
    version: '1.0.0',
    browser: 'Chrome Extension'
  }
});