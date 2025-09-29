/**
 * Environment-Specific Test Configuration
 *
 * Provides configuration management for different test environments
 * including development, CI/CD, staging, and production scenarios.
 * Ensures consistent test behavior across different deployment contexts.
 *
 * Features:
 * - Environment-aware configuration
 * - Conditional feature flags
 * - Resource management per environment
 * - Security and privacy settings
 * - Performance tuning
 * - Debug and logging levels
 */

const path = require('path');

class EnvironmentConfig {
  constructor(environment = process.env.NODE_ENV || 'development') {
    this.environment = environment;
    this.config = this.loadEnvironmentConfig(environment);
  }

  /**
   * Load configuration for specific environment
   */
  loadEnvironmentConfig(env) {
    const baseConfig = this.getBaseConfig();
    const envConfig = this.getEnvironmentSpecificConfig(env);

    return {
      ...baseConfig,
      ...envConfig,
      environment: env,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get base configuration (common to all environments)
   */
  getBaseConfig() {
    return {
      // Test timeouts
      timeouts: {
        default: 5000,
        element: 3000,
        navigation: 10000,
        screenshot: 8000,
        accessibility: 15000,
        global: 30000
      },

      // Retry configuration
      retries: {
        default: 0,
        flaky: 2,
        network: 3,
        visual: 1
      },

      // Viewport configurations
      viewports: [
        { name: 'desktop', width: 1280, height: 720 },
        { name: 'tablet', width: 1024, height: 768 },
        { name: 'mobile', width: 375, height: 667 }
      ],

      // Theme configurations
      themes: {
        modes: ['light', 'dark'],
        default: 'light',
        selectors: {
          light: '[data-theme="light"]',
          dark: '[data-theme="dark"]'
        }
      },

      // Screenshot configuration
      screenshots: {
        directory: 'test-results/screenshots',
        baselineDirectory: 'tests/ui/visual/baseline',
        currentDirectory: 'tests/ui/visual/current',
        format: 'png',
        quality: 90,
        animations: 'disabled',
        fullPage: false
      },

      // Accessibility configuration
      accessibility: {
        standard: 'WCAG2AA',
        impactLevels: ['critical', 'serious', 'moderate', 'minor'],
        enabled: true,
        runOnly: null,
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-order': { enabled: true },
          'label': { enabled: true }
        }
      },

      // Reporting configuration
      reporting: {
        formats: ['json', 'html'],
        outputDirectory: 'test-results',
        aiOptimized: true,
        includeScreenshots: false,
        verbosity: 'normal',
        detailedErrors: true,
        performanceMetrics: true
      },

      // Browser configuration
      browser: {
        type: 'chromium',
        headless: true,
        slowMo: 0,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        acceptDownloads: true
      },

      // Performance configuration
      performance: {
        enabled: true,
        metrics: [
          'firstContentfulPaint',
          'largestContentfulPaint',
          'cumulativeLayoutShift',
          'timeToInteractive'
        ],
        thresholds: {
          firstContentfulPaint: 2000,
          largestContentfulPaint: 4000,
          cumulativeLayoutShift: 0.1,
          timeToInteractive: 3000
        }
      },

      // Security and privacy
      security: {
        maskPersonalData: true,
        excludeUrls: [
          'localhost',
          '127.0.0.1',
          '/ui/main_popup.html
        ],
        sensitiveDataPatterns: [
          /password/i,
          /token/i,
          /key/i,
          /secret/i
        ]
      },

      // Feature flags
      features: {
        enableVisualTesting: true,
        enableAccessibilityTesting: true,
        enableInteractionTesting: true,
        enablePerformanceTesting: false,
        enableParallelExecution: true,
        enableRetryMechanism: true,
        enableDetailedLogging: false,
        enableScreenshotCapture: true,
        enableVideoRecording: false
      },

      // Resource limits
      resources: {
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        maxCpuUsage: 80, // 80%
        maxExecutionTime: 300000, // 5 minutes
        maxWorkers: 4,
        maxConcurrentTests: 10
      }
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentSpecificConfig(env) {
    switch (env) {
      case 'development':
        return this.getDevelopmentConfig();
      case 'test':
        return this.getTestConfig();
      case 'ci':
        return this.getCiConfig();
      case 'staging':
        return this.getStagingConfig();
      case 'production':
        return this.getProductionConfig();
      default:
        return this.getDevelopmentConfig();
    }
  }

  /**
   * Development environment configuration
   */
  getDevelopmentConfig() {
    return {
      // Development-friendly settings
      browser: {
        type: 'chromium',
        headless: false,
        slowMo: 100,
        devtools: true
      },

      // Development logging
      logging: {
        level: 'debug',
        enableConsole: true,
        enableFile: true,
        verbose: true
      },

      // Development features
      features: {
        enableDetailedLogging: true,
        enableVideoRecording: false,
        enableScreenshotCapture: true,
        enableInteractiveDebugging: true
      },

      // Development timeouts (more lenient)
      timeouts: {
        default: 10000,
        element: 5000,
        navigation: 20000,
        global: 60000
      },

      // Development resources
      resources: {
        maxWorkers: 2,
        maxConcurrentTests: 5
      }
    };
  }

  /**
   * Test environment configuration
   */
  getTestConfig() {
    return {
      // Test environment settings
      browser: {
        type: 'chromium',
        headless: true,
        slowMo: 0
      },

      // Test logging
      logging: {
        level: 'info',
        enableConsole: true,
        enableFile: true,
        verbose: false
      },

      // Test features
      features: {
        enablePerformanceTesting: true,
        enableParallelExecution: true,
        enableRetryMechanism: true
      },

      // Test timeouts
      timeouts: {
        default: 5000,
        element: 3000,
        navigation: 10000,
        global: 30000
      }
    };
  }

  /**
   * CI/CD environment configuration
   */
  getCiConfig() {
    return {
      // CI environment settings
      browser: {
        type: 'chromium',
        headless: true,
        slowMo: 0
      },

      // CI logging
      logging: {
        level: 'warn',
        enableConsole: true,
        enableFile: false,
        verbose: false
      },

      // CI features
      features: {
        enablePerformanceTesting: true,
        enableParallelExecution: true,
        enableRetryMechanism: false,
        enableVideoRecording: true,
        enableDetailedLogging: false
      },

      // CI timeouts (stricter)
      timeouts: {
        default: 3000,
        element: 2000,
        navigation: 8000,
        global: 20000
      },

      // CI resources
      resources: {
        maxMemoryUsage: 256 * 1024 * 1024, // 256MB
        maxCpuUsage: 90,
        maxWorkers: 4,
        maxConcurrentTests: 10
      },

      // CI reporting
      reporting: {
        formats: ['json', 'junit'],
        aiOptimized: true,
        includeScreenshots: true,
        verbosity: 'minimal'
      }
    };
  }

  /**
   * Staging environment configuration
   */
  getStagingConfig() {
    return {
      // Staging environment settings
      browser: {
        type: 'chromium',
        headless: true,
        slowMo: 0
      },

      // Staging logging
      logging: {
        level: 'info',
        enableConsole: true,
        enableFile: true,
        verbose: false
      },

      // Staging features
      features: {
        enablePerformanceTesting: true,
        enableParallelExecution: true,
        enableRetryMechanism: true,
        enableVideoRecording: true
      },

      // Staging timeouts
      timeouts: {
        default: 5000,
        element: 3000,
        navigation: 10000,
        global: 30000
      },

      // Staging resources
      resources: {
        maxMemoryUsage: 384 * 1024 * 1024, // 384MB
        maxCpuUsage: 85,
        maxWorkers: 3,
        maxConcurrentTests: 8
      }
    };
  }

  /**
   * Production environment configuration
   */
  getProductionConfig() {
    return {
      // Production environment settings
      browser: {
        type: 'chromium',
        headless: true,
        slowMo: 0
      },

      // Production logging
      logging: {
        level: 'error',
        enableConsole: false,
        enableFile: true,
        verbose: false
      },

      // Production features (minimal)
      features: {
        enableVisualTesting: true,
        enableAccessibilityTesting: true,
        enablePerformanceTesting: false,
        enableParallelExecution: false,
        enableRetryMechanism: false,
        enableDetailedLogging: false,
        enableScreenshotCapture: true,
        enableVideoRecording: false
      },

      // Production timeouts (strict)
      timeouts: {
        default: 3000,
        element: 2000,
        navigation: 8000,
        global: 15000
      },

      // Production resources (conservative)
      resources: {
        maxMemoryUsage: 128 * 1024 * 1024, // 128MB
        maxCpuUsage: 70,
        maxWorkers: 1,
        maxConcurrentTests: 3
      },

      // Production reporting
      reporting: {
        formats: ['json'],
        aiOptimized: true,
        includeScreenshots: false,
        verbosity: 'minimal'
      }
    };
  }

  /**
   * Get configuration value by path
   */
  get(configPath) {
    const keys = configPath.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set configuration value
   */
  set(configPath, value) {
    const keys = configPath.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get environment-specific test configuration
   */
  getTestConfigForType(testType) {
    const baseConfig = { ...this.config };

    switch (testType) {
      case 'visual':
        return {
          ...baseConfig,
          timeouts: {
            ...baseConfig.timeouts,
            default: 8000,
            screenshot: 5000
          },
          features: {
            ...baseConfig.features,
            enableScreenshotCapture: true
          }
        };

      case 'accessibility':
        return {
          ...baseConfig,
          timeouts: {
            ...baseConfig.timeouts,
            default: 15000,
            accessibility: 12000
          },
          features: {
            ...baseConfig.features,
            enableAccessibilityTesting: true
          }
        };

      case 'interaction':
        return {
          ...baseConfig,
          timeouts: {
            ...baseConfig.timeouts,
            default: 6000,
            element: 4000
          },
          features: {
            ...baseConfig.features,
            enableInteractionTesting: true
          }
        };

      case 'performance':
        return {
          ...baseConfig,
          timeouts: {
            ...baseConfig.timeouts,
            default: 20000,
            global: 45000
          },
          features: {
            ...baseConfig.features,
            enablePerformanceTesting: true
          }
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    // Validate timeouts
    if (this.config.timeouts.default <= 0) {
      errors.push('Default timeout must be positive');
    }

    // Validate resources
    if (this.config.resources.maxMemoryUsage <= 0) {
      errors.push('Max memory usage must be positive');
    }

    if (this.config.resources.maxCpuUsage <= 0 || this.config.resources.maxCpuUsage > 100) {
      errors.push('Max CPU usage must be between 1 and 100');
    }

    // Validate viewports
    this.config.viewports.forEach(viewport => {
      if (viewport.width <= 0 || viewport.height <= 0) {
        errors.push(`Viewport ${viewport.name} has invalid dimensions`);
      }
    });

    // Validate themes
    if (!this.config.themes.modes.includes(this.config.themes.default)) {
      errors.push('Default theme must be in themes.modes array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration
   */
  export() {
    return {
      environment: this.environment,
      config: this.config,
      validation: this.validate(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create configuration for specific test scenario
   */
  createScenarioConfig(scenario) {
    const scenarioConfigs = {
      'quick-smoke': {
        timeouts: { default: 3000, global: 10000 },
        features: {
          enableParallelExecution: false,
          enableRetryMechanism: false,
          enableDetailedLogging: false
        },
        reporting: { verbosity: 'minimal' }
      },

      'full-regression': {
        timeouts: { default: 5000, global: 30000 },
        features: {
          enableParallelExecution: true,
          enableRetryMechanism: true,
          enablePerformanceTesting: true
        },
        reporting: { verbosity: 'detailed' }
      },

      'accessibility-audit': {
        timeouts: { default: 15000, accessibility: 20000 },
        features: {
          enableAccessibilityTesting: true,
          enableParallelExecution: false
        },
        accessibility: {
          impactLevels: ['critical', 'serious']
        }
      },

      'performance-benchmark': {
        timeouts: { default: 20000, global: 60000 },
        features: {
          enablePerformanceTesting: true,
          enableParallelExecution: false
        },
        performance: {
          enabled: true,
          detailedMetrics: true
        }
      }
    };

    const baseConfig = { ...this.config };
    const scenarioConfig = scenarioConfigs[scenario] || {};

    return this.mergeDeep(baseConfig, scenarioConfig);
  }

  /**
   * Deep merge objects
   */
  mergeDeep(target, source) {
    const output = Object.assign({}, target);

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  /**
   * Check if value is object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

/**
 * Create environment-specific instances
 */
const developmentConfig = new EnvironmentConfig('development');
const testConfig = new EnvironmentConfig('test');
const ciConfig = new EnvironmentConfig('ci');
const stagingConfig = new EnvironmentConfig('staging');
const productionConfig = new EnvironmentConfig('production');

/**
 * Export utilities for different use cases
 */
module.exports = {
  EnvironmentConfig,
  developmentConfig,
  testConfig,
  ciConfig,
  stagingConfig,
  productionConfig,

  /**
   * Get config for current environment
   */
  getCurrentConfig: () => new EnvironmentConfig(),

  /**
   * Get config by environment name
   */
  getConfig: (env) => new EnvironmentConfig(env),

  /**
   * Quick access methods
   */
  get: (configPath, env) => {
    const config = env ? new EnvironmentConfig(env) : new EnvironmentConfig();
    return config.get(configPath);
  },

  validate: (env) => {
    const config = env ? new EnvironmentConfig(env) : new EnvironmentConfig();
    return config.validate();
  }
};