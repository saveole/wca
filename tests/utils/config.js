/**
 * Test Configuration for WebClip Assistant UI Testing
 *
 * Central configuration for all UI testing including viewports, themes,
 * baselines, accessibility standards, and AI optimization settings.
 */

// Viewport configurations for desktop testing only
export const viewports = [
  {
    width: 1280,
    height: 720,
    name: 'desktop',
    description: 'Standard desktop viewport'
  },
  {
    width: 1024,
    height: 768,
    name: 'tablet',
    description: 'Tablet viewport for responsive testing'
  },
  {
    width: 1920,
    height: 1080,
    name: 'desktop-hd',
    description: 'High definition desktop'
  }
];

// Theme testing configurations
export const themes = ['light', 'dark'];

// Theme detection selectors
export const themeSelectors = {
  light: '[data-theme="light"], html:not([data-theme="dark"])',
  dark: '[data-theme="dark"]'
};

// Test timeout configurations
export const timeouts = {
  default: 5000,
  navigation: 10000,
  element: 5000,
  screenshot: 3000,
  accessibility: 8000,
  interaction: 3000
};

// Baseline management configuration
export const baselines = {
  directory: 'tests/ui/visual/baseline',
  currentDirectory: 'tests/ui/visual/current',
  tolerance: 0.1, // 10% pixel difference tolerance
  approvalRequired: true,
  autoUpdate: false,
  formats: ['png'],
  compressionQuality: 0.9
};

// Accessibility testing configuration
export const accessibility = {
  standard: 'WCAG 2.1 Level AA',
  impactLevels: ['critical', 'serious', 'moderate', 'minor'],
  rules: {
    // Custom rules for Chrome extension testing
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-visible': { enabled: true },
    'aria-labels': { enabled: true },
    'form-labels': { enabled: true }
  },
  // Elements to ignore in accessibility testing
  ignore: [
    '.chromium-custom-elements', // Chrome extension specific elements
    '.dev-tools-elements', // Development elements
    '[aria-hidden="true"]' // Hidden elements
  ]
};

// Performance targets
export const performance = {
  maxTestExecutionTime: 2000, // 2 seconds per test
  maxScreenshotTime: 500, // 500ms for screenshots
  maxAccessibilityScanTime: 1000, // 1 second for accessibility scan
  memoryLimit: 100 * 1024 * 1024, // 100MB memory limit
  parallelTests: 1 // No parallel execution for stability
};

// AI-friendly reporting configuration
export const reporting = {
  format: 'json',
  aiOptimized: true,
  includeScreenshots: false, // Don't include in JSON for AI
  verbosity: 'normal',
  outputDir: 'test-results',
  structure: {
    executionId: 'uuid',
    status: 'string',
    summary: {
      total: 'number',
      passed: 'number',
      failed: 'number',
      skipped: 'number',
      successRate: 'number'
    },
    results: [
      {
        testId: 'uuid',
        name: 'string',
        type: 'string', // visual, accessibility, interaction
        status: 'string', // passed, failed, skipped, error
        duration: 'number',
        errors: [
          {
            message: 'string',
            details: 'string',
            fixSuggestion: 'string',
            screenshot: 'string (optional)'
          }
        ]
      }
    ],
    metadata: {
      browser: 'string',
      viewport: 'object',
      theme: 'string',
      timestamp: 'string',
      performance: {
        totalDuration: 'number',
        memoryUsed: 'number'
      }
    }
  }
};

// Chrome extension specific configuration
export const extension = {
  pages: {
    popup: 'ui/main_popup.html',
    settings: 'ui/settings.html',
    options: 'ui/options.html'
  },
  selectors: {
    // Common selectors used across tests
    popupContainer: '.popup-container',
    settingsContainer: '.settings-container',
    saveButton: '#save-button',
    cancelButton: '#cancel-button',
    titleInput: '#title-input',
    urlInput: '#url-input',
    descriptionInput: '#description-input',
    notesInput: '#notes-input',
    tagsInput: '#tags-input',
    themeToggle: '#theme-toggle',
    loadingIndicator: '.loading-indicator',
    successMessage: '.success-message',
    errorMessage: '.error-message'
  },
  // Test data for consistent testing
  testData: {
    validUrl: 'https://example.com',
    validTitle: 'Test Page Title',
    validDescription: 'This is a test description',
    validNotes: 'Test notes for validation',
    testTags: ['test', 'automation', 'ui']
  }
};

// Retry configuration for flaky tests
export const retry = {
  enabled: true,
  maxRetries: 2,
  retryDelay: 1000,
  retryableErrors: [
    'Timeout',
    'NetworkError',
    'ElementNotFound',
    'StaleElementReference'
  ]
};

// Debug configuration
export const debug = {
  enabled: process.env.NODE_ENV === 'development',
  screenshots: {
    onFail: true,
    onSuccess: false,
    path: 'test-results/screenshots'
  },
  traces: {
    enabled: false,
    path: 'test-results/traces'
  },
  videos: {
    enabled: false,
    path: 'test-results/videos'
  }
};

// Environment-specific configuration
export const environments = {
  development: {
    headless: false,
    slowMo: 100,
    debug: true
  },
  ci: {
    headless: true,
    slowMo: 0,
    debug: false,
    retries: 2
  },
  production: {
    headless: true,
    slowMo: 0,
    debug: false,
    retries: 0
  }
};

// Export default configuration
export default {
  viewports,
  themes,
  themeSelectors,
  timeouts,
  baselines,
  accessibility,
  performance,
  reporting,
  extension,
  retry,
  debug,
  environments
};