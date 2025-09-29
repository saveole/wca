/**
 * Test Data Utilities for Chrome Extension UI Testing
 *
 * Provides consistent test setup, data generation, and fixture management
 * for all UI testing scenarios. Ensures standardized test data and
 * reliable test execution across different test types.
 *
 * Features:
 * - Test data generation for all test types
 * - Fixture management and loading
 * - Configuration management for test environments
 * - Performance data generation and validation
 * - Theme and viewport management
 * - Mock API response generation
 * - Test environment setup and cleanup
 */

const path = require('path');
const fs = require('fs');
const { mockResponses } = require('./mock-responses');

class TestDataUtils {
  constructor(options = {}) {
    this.options = {
      fixturesDir: path.join(__dirname, 'fixtures'),
      testDataDir: path.join(__dirname, 'data'),
      screenshotsDir: path.join(__dirname, 'screenshots'),
      baselinesDir: path.join(__dirname, 'baselines'),
      environment: options.environment || 'development',
      ...options
    };

    this.ensureDirectoriesExist();
    this.loadTestConfiguration();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectoriesExist() {
    const directories = [
      this.options.fixturesDir,
      this.options.testDataDir,
      this.options.screenshotsDir,
      this.options.baselinesDir
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load test configuration based on environment
   */
  loadTestConfiguration() {
    const configPath = path.join(this.options.testDataDir, 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.warn(`Failed to load config: ${error.message}`);
        this.config = this.getDefaultConfig();
      }
    } else {
      this.config = this.getDefaultConfig();
      this.saveConfiguration();
    }
  }

  /**
   * Get default test configuration
   */
  getDefaultConfig() {
    return {
      environment: this.options.environment,
      timeouts: {
        default: 5000,
        screenshot: 3000,
        accessibility: 10000,
        interaction: 8000,
        api: 15000
      },
      thresholds: {
        pixelDifference: 0.1,
        accessibilityCompliance: 0.9,
        performanceTime: 2000,
        successRate: 0.8
      },
      viewports: [
        { name: 'mobile', width: 360, height: 600 },
        { name: 'desktop', width: 1280, height: 720 }
      ],
      themes: ['light', 'dark'],
      testTypes: ['visual', 'accessibility', 'interaction', 'performance'],
      features: {
        enableScreenshots: true,
        enableAccessibility: true,
        enablePerformance: true,
        enableRetry: true,
        debug: this.options.environment === 'development'
      }
    };
  }

  /**
   * Save current configuration
   */
  saveConfiguration() {
    const configPath = path.join(this.options.testDataDir, 'config.json');
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Load HTML fixture by name
   */
  loadFixture(fixtureName) {
    const fixturePath = path.join(this.options.fixturesDir, `${fixtureName}.html`);

    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Fixture not found: ${fixturePath}`);
    }

    return fs.readFileSync(fixturePath, 'utf8');
  }

  /**
   * Generate test data for visual regression tests
   */
  generateVisualTestData(options = {}) {
    const defaults = {
      component: 'popup',
      viewport: { width: 360, height: 600 },
      theme: 'light',
      threshold: 0.1,
      timestamp: Date.now()
    };

    const config = { ...defaults, ...options };

    return {
      id: this.generateTestId('visual'),
      type: 'visual',
      config,
      expected: {
        baselinePath: path.join(this.options.baselinesDir,
          `${config.component}-${config.theme}-${config.viewport.width}x${config.viewport.height}.png`),
        screenshotPath: path.join(this.options.screenshotsDir,
          `${config.component}-${config.theme}-${config.viewport.width}x${config.viewport.height}-${Date.now()}.png`),
        diffPath: path.join(this.options.screenshotsDir,
          `${config.component}-${config.theme}-${config.viewport.width}x${config.viewport.height}-diff.png`)
      },
      metadata: {
        createdAt: new Date().toISOString(),
        testRunner: 'playwright',
        environment: this.options.environment
      }
    };
  }

  /**
   * Generate test data for accessibility tests
   */
  generateAccessibilityTestData(options = {}) {
    const defaults = {
      url: 'popup.html',
      standards: ['WCAG 2.1 Level AA'],
      includeBestPractices: true,
      runOnly: null
    };

    const config = { ...defaults, ...options };

    return {
      id: this.generateTestId('accessibility'),
      type: 'accessibility',
      config,
      expected: {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: []
      },
      metadata: {
        createdAt: new Date().toISOString(),
        testRunner: 'axe-core',
        version: '4.4.3',
        environment: this.options.environment
      }
    };
  }

  /**
   * Generate test data for interaction tests
   */
  generateInteractionTestData(options = {}) {
    const defaults = {
      feature: 'form-validation',
      interactions: [],
      timeout: this.config.timeouts.interaction,
      retries: this.config.features.enableRetry ? 3 : 0
    };

    const config = { ...defaults, ...options };

    return {
      id: this.generateTestId('interaction'),
      type: 'interaction',
      config,
      interactions: config.interactions.length > 0 ? config.interactions :
        this.generateDefaultInteractions(config.feature),
      expected: {
        successRate: this.config.thresholds.successRate,
        maxExecutionTime: this.config.thresholds.performanceTime
      },
      metadata: {
        createdAt: new Date().toISOString(),
        testRunner: 'playwright',
        environment: this.options.environment
      }
    };
  }

  /**
   * Generate default interaction steps for common features
   */
  generateDefaultInteractions(feature) {
    const interactionTemplates = {
      'form-validation': [
        { type: 'click', selector: '#submit-btn', action: 'click submit button' },
        { type: 'type', selector: '#email', value: 'test@example.com', action: 'enter email' },
        { type: 'verify', selector: '.error-message', expected: 'visible', action: 'verify error message' }
      ],
      'theme-toggle': [
        { type: 'click', selector: '#theme-toggle', action: 'click theme toggle' },
        { type: 'verify', selector: 'body', attribute: 'data-theme', expected: 'dark', action: 'verify theme change' }
      ],
      'tag-management': [
        { type: 'type', selector: '.tag-input input', value: 'new-tag', action: 'add tag' },
        { type: 'keyPress', selector: '.tag-input input', key: 'Enter', action: 'submit tag' },
        { type: 'verify', selector: '.tag', expected: 'contains new-tag', action: 'verify tag added' }
      ],
      'popup-navigation': [
        { type: 'click', selector: '.nav-item', index: 0, action: 'click first navigation item' },
        { type: 'verify', selector: '.content-section', expected: 'visible', action: 'verify content displayed' }
      ]
    };

    return interactionTemplates[feature] || [];
  }

  /**
   * Generate test data for performance tests
   */
  generatePerformanceTestData(options = {}) {
    const defaults = {
      metric: 'screenshot-capture',
      target: this.config.thresholds.performanceTime,
      iterations: 5,
      warmup: true
    };

    const config = { ...defaults, ...options };

    return {
      id: this.generateTestId('performance'),
      type: 'performance',
      config,
      expected: {
        averageTime: config.target,
        maxTime: config.target * 1.5,
        memoryLimit: 50 * 1024 * 1024, // 50MB
        cpuLimit: 80
      },
      metadata: {
        createdAt: new Date().toISOString(),
        iterations: config.iterations,
        warmup: config.warmup,
        environment: this.options.environment
      }
    };
  }

  /**
   * Generate test data for API integration tests
   */
  generateApiTestData(options = {}) {
    const defaults = {
      provider: 'openai',
      endpoint: 'chat/completions',
      method: 'POST',
      mockResponse: 'success'
    };

    const config = { ...defaults, ...options };

    return {
      id: this.generateTestId('api'),
      type: 'api',
      config,
      request: this.generateApiRequest(config),
      expected: this.generateExpectedApiResponse(config),
      metadata: {
        createdAt: new Date().toISOString(),
        provider: config.provider,
        environment: this.options.environment
      }
    };
  }

  /**
   * Generate API request payload
   */
  generateApiRequest(config) {
    const templates = {
      'openai': {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Summarize this web page content' }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      'anthropic': {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 150,
        messages: [
          { role: 'user', content: 'Summarize this web page content' }
        ]
      },
      'notion': {
        parent: { database_id: '12345678-1234-1234-1234-123456789abc' },
        properties: {
          'Name': { title: [{ text: { content: 'Test Page' } }] },
          'URL': { url: 'https://example.com' }
        }
      }
    };

    return templates[config.provider] || {};
  }

  /**
   * Generate expected API response
   */
  generateExpectedApiResponse(config) {
    try {
      return mockResponses.getResponse(config.provider, config.mockResponse);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate comprehensive test suite data
   */
  generateTestSuiteData(options = {}) {
    const defaults = {
      name: 'Chrome Extension UI Test Suite',
      testTypes: this.config.testTypes,
      features: ['popup', 'settings'],
      viewports: this.config.viewports,
      themes: this.config.themes
    };

    const config = { ...defaults, ...options };

    const testSuite = {
      id: this.generateTestId('suite'),
      name: config.name,
      config,
      tests: [],
      createdAt: new Date().toISOString(),
      environment: this.options.environment
    };

    // Generate tests for each combination
    config.testTypes.forEach(testType => {
      config.features.forEach(feature => {
        config.viewports.forEach(viewport => {
          config.themes.forEach(theme => {
            const testData = this.generateTestData(testType, {
              feature,
              viewport,
              theme
            });
            testSuite.tests.push(testData);
          });
        });
      });
    });

    return testSuite;
  }

  /**
   * Generate test data based on type
   */
  generateTestData(type, options = {}) {
    switch (type) {
      case 'visual':
        return this.generateVisualTestData(options);
      case 'accessibility':
        return this.generateAccessibilityTestData(options);
      case 'interaction':
        return this.generateInteractionTestData(options);
      case 'performance':
        return this.generatePerformanceTestData(options);
      case 'api':
        return this.generateApiTestData(options);
      default:
        throw new Error(`Unknown test type: ${type}`);
    }
  }

  /**
   * Create test data file
   */
  createTestDataFile(testData, filename) {
    const dataPath = path.join(this.options.testDataDir, filename);

    try {
      fs.writeFileSync(dataPath, JSON.stringify(testData, null, 2));
      return dataPath;
    } catch (error) {
      throw new Error(`Failed to create test data file: ${error.message}`);
    }
  }

  /**
   * Load test data from file
   */
  loadTestDataFile(filename) {
    const dataPath = path.join(this.options.testDataDir, filename);

    if (!fs.existsSync(dataPath)) {
      throw new Error(`Test data file not found: ${dataPath}`);
    }

    try {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to load test data: ${error.message}`);
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment(options = {}) {
    const setup = {
      cleanScreenshots: options.cleanScreenshots !== false,
      validateFixtures: options.validateFixtures !== false,
      createBaselines: options.createBaselines || false,
      environment: this.options.environment
    };

    // Clean screenshots directory
    if (setup.cleanScreenshots) {
      this.cleanDirectory(this.options.screenshotsDir);
    }

    // Validate fixtures
    if (setup.validateFixtures) {
      this.validateFixtures();
    }

    // Create baseline directories if needed
    if (setup.createBaselines) {
      this.ensureDirectoriesExist();
    }

    return setup;
  }

  /**
   * Clean directory contents
   */
  cleanDirectory(directory) {
    if (fs.existsSync(directory)) {
      const files = fs.readdirSync(directory);
      files.forEach(file => {
        const filePath = path.join(directory, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  }

  /**
   * Validate required fixtures exist
   */
  validateFixtures() {
    const requiredFixtures = ['sample-popup.html', 'sample-settings.html'];

    requiredFixtures.forEach(fixture => {
      const fixturePath = path.join(this.options.fixturesDir, fixture);
      if (!fs.existsSync(fixturePath)) {
        throw new Error(`Required fixture missing: ${fixture}`);
      }
    });
  }

  /**
   * Generate unique test ID
   */
  generateTestId(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get mock response helper
   */
  getMockResponse(type, scenario = 'success') {
    return mockResponses.getResponse(type, scenario);
  }

  /**
   * Get configuration value
   */
  getConfig(path = null) {
    if (!path) {
      return this.config;
    }

    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      value = value[key];
      if (value === undefined) {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Update configuration value
   */
  updateConfig(path, value) {
    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    this.saveConfiguration();
  }

  /**
   * Export all test data for external use
   */
  exportTestData() {
    return {
      config: this.config,
      mockResponses,
      utils: {
        generateTestData: this.generateTestData.bind(this),
        getMockResponse: this.getMockResponse.bind(this),
        generateTestId: this.generateTestId.bind(this)
      },
      paths: {
        fixtures: this.options.fixturesDir,
        testData: this.options.testDataDir,
        screenshots: this.options.screenshotsDir,
        baselines: this.options.baselinesDir
      }
    };
  }

  /**
   * Cleanup test artifacts
   */
  cleanup(options = {}) {
    const cleanupOptions = {
      screenshots: options.screenshots !== false,
      testData: options.testData || false,
      keepConfig: options.keepConfig !== false,
      ...options
    };

    if (cleanupOptions.screenshots) {
      this.cleanDirectory(this.options.screenshotsDir);
    }

    if (cleanupOptions.testData) {
      this.cleanDirectory(this.options.testDataDir);
      if (!cleanupOptions.keepConfig) {
        this.config = this.getDefaultConfig();
      }
    }
  }
}

/**
 * Create singleton instance for easy import
 */
const testDataUtils = new TestDataUtils();

/**
 * Export utilities for different use cases
 */
module.exports = {
  TestDataUtils,
  testDataUtils,

  /**
   * Quick access methods for common operations
   */
  generateVisualTestData: (options) => testDataUtils.generateVisualTestData(options),
  generateAccessibilityTestData: (options) => testDataUtils.generateAccessibilityTestData(options),
  generateInteractionTestData: (options) => testDataUtils.generateInteractionTestData(options),
  generatePerformanceTestData: (options) => testDataUtils.generatePerformanceTestData(options),
  generateApiTestData: (options) => testDataUtils.generateApiTestData(options),
  generateTestSuite: (options) => testDataUtils.generateTestSuiteData(options),

  /**
   * Mock data helpers
   */
  getMockResponse: (type, scenario) => testDataUtils.getMockResponse(type, scenario),
  loadFixture: (name) => testDataUtils.loadFixture(name),

  /**
   * Configuration helpers
   */
  getConfig: (path) => testDataUtils.getConfig(path),
  updateConfig: (path, value) => testDataUtils.updateConfig(path, value),

  /**
   * Environment setup
   */
  setupTestEnvironment: (options) => testDataUtils.setupTestEnvironment(options),
  cleanup: (options) => testDataUtils.cleanup(options)
};