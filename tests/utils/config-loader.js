/**
 * Test Configuration Loader
 *
 * Provides configuration loading, validation, and management for UI testing
 * with environment-specific settings and comprehensive validation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default configuration
const DEFAULT_CONFIG = {
  // Test execution settings
  timeouts: {
    default: 5000,
    navigation: 10000,
    element: 5000,
    screenshot: 3000,
    accessibility: 8000,
    interaction: 3000
  },

  // Viewport configurations
  viewports: [
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
  ],

  // Theme testing
  themes: ['light', 'dark'],
  themeSelectors: {
    light: '[data-theme="light"], html:not([data-theme="dark"])',
    dark: '[data-theme="dark"]'
  },

  // Baseline management
  baselines: {
    directory: 'tests/ui/visual/baseline',
    currentDirectory: 'tests/ui/visual/current',
    tolerance: 0.1,
    approvalRequired: true,
    autoUpdate: false,
    formats: ['png'],
    compressionQuality: 0.9
  },

  // Accessibility configuration
  accessibility: {
    standard: 'WCAG 2.1 Level AA',
    impactLevels: ['critical', 'serious', 'moderate', 'minor'],
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-visible': { enabled: true },
      'aria-labels': { enabled: true },
      'form-labels': { enabled: true }
    },
    ignore: [
      '.chromium-custom-elements',
      '.dev-tools-elements',
      '[aria-hidden="true"]'
    ]
  },

  // Performance targets
  performance: {
    maxTestExecutionTime: 2000,
    maxScreenshotTime: 500,
    maxAccessibilityScanTime: 1000,
    memoryLimit: 100 * 1024 * 1024,
    parallelTests: 1
  },

  // AI-friendly reporting
  reporting: {
    format: 'json',
    aiOptimized: true,
    includeScreenshots: false,
    verbosity: 'normal',
    outputDir: 'test-results'
  },

  // Chrome extension specific
  extension: {
    pages: {
      popup: 'ui/main_popup.html',
      settings: 'ui/settings.html',
      options: 'ui/options.html'
    },
    selectors: {
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
    testData: {
      validUrl: 'https://example.com',
      validTitle: 'Test Page Title',
      validDescription: 'This is a test description',
      validNotes: 'Test notes for validation',
      testTags: ['test', 'automation', 'ui']
    }
  },

  // Retry configuration
  retry: {
    enabled: true,
    maxRetries: 2,
    retryDelay: 1000,
    retryableErrors: [
      'Timeout',
      'NetworkError',
      'ElementNotFound',
      'StaleElementReference'
    ]
  },

  // Debug configuration
  debug: {
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
  },

  // Environment-specific configurations
  environments: {
    development: {
      headless: false,
      slowMo: 100,
      debug: true,
      retries: 0
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
  }
};

// Configuration schema for validation
const CONFIG_SCHEMA = {
  timeouts: {
    type: 'object',
    required: true,
    properties: {
      default: { type: 'number', min: 1000, max: 30000 },
      navigation: { type: 'number', min: 1000, max: 60000 },
      element: { type: 'number', min: 1000, max: 30000 },
      screenshot: { type: 'number', min: 1000, max: 10000 },
      accessibility: { type: 'number', min: 1000, max: 15000 },
      interaction: { type: 'number', min: 1000, max: 10000 }
    }
  },
  viewports: {
    type: 'array',
    required: true,
    minItems: 1,
    items: {
      type: 'object',
      properties: {
        width: { type: 'number', min: 320, max: 3840 },
        height: { type: 'number', min: 240, max: 2160 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' }
      },
      required: ['width', 'height', 'name']
    }
  },
  themes: {
    type: 'array',
    required: true,
    minItems: 1,
    items: { type: 'string', enum: ['light', 'dark'] }
  },
  baselines: {
    type: 'object',
    required: true,
    properties: {
      directory: { type: 'string' },
      tolerance: { type: 'number', min: 0, max: 1 },
      approvalRequired: { type: 'boolean' }
    }
  },
  performance: {
    type: 'object',
    required: true,
    properties: {
      maxTestExecutionTime: { type: 'number', min: 1000, max: 10000 },
      maxScreenshotTime: { type: 'number', min: 100, max: 2000 },
      memoryLimit: { type: 'number', min: 1024 * 1024 }
    }
  }
};

/**
 * Load configuration with environment-specific settings
 * @param {string} environment - Environment (development, ci, production)
 * @returns {Promise<Object>} Configuration object
 */
export async function loadConfig(environment = null) {
  try {
    // Determine environment
    const env = environment || determineEnvironment();

    // Start with default configuration
    let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // Try to load custom configuration file
    const customConfig = await loadConfigFile('./test.config.json');
    if (customConfig.success) {
      config = mergeConfig(config, customConfig.config);
    }

    // Apply environment-specific overrides
    if (config.environments[env]) {
      config = applyEnvironmentOverrides(config, env);
    }

    // Validate final configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.warn('Configuration validation warnings:', validation.warnings);
    }

    return config;

  } catch (error) {
    console.error('Failed to load configuration:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Load configuration from file
 * @param {string} filePath - Path to configuration file
 * @returns {Promise<Object>} Load result
 */
export async function loadConfigFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'Configuration file not found',
        config: null
      };
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(fileContent);

    return {
      success: true,
      config,
      message: 'Configuration loaded successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      config: null
    };
  }
}

/**
 * Validate configuration against schema
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  // Validate top-level structure
  Object.keys(CONFIG_SCHEMA).forEach(key => {
    const schema = CONFIG_SCHEMA[key];
    const value = config[key];

    if (schema.required && !value) {
      errors.push(`Missing required configuration: ${key}`);
      return;
    }

    if (value && schema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${key} must be an array`);
      } else if (schema.minItems && value.length < schema.minItems) {
        errors.push(`${key} must have at least ${schema.minItems} items`);
      }
    }

    if (value && schema.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${key} must be an object`);
      } else {
        // Validate object properties
        if (schema.properties) {
          Object.keys(schema.properties).forEach(prop => {
            const propSchema = schema.properties[prop];
            const propValue = value[prop];

            if (propSchema.required && !propValue) {
              errors.push(`Missing required property: ${key}.${prop}`);
            }

            if (propValue && propSchema.type === 'number') {
              if (typeof propValue !== 'number') {
                errors.push(`${key}.${prop} must be a number`);
              } else if (propSchema.min && propValue < propSchema.min) {
                errors.push(`${key}.${prop} must be at least ${propSchema.min}`);
              } else if (propSchema.max && propValue > propSchema.max) {
                errors.push(`${key}.${prop} must be at most ${propSchema.max}`);
              }
            }
          });
        }
      }
    }
  });

  // Validate viewport dimensions
  if (config.viewports) {
    config.viewports.forEach((viewport, index) => {
      if (viewport.width < 320 || viewport.width > 3840) {
        warnings.push(`Viewport ${index} width ${viewport.width} is outside recommended range (320-3840)`);
      }
      if (viewport.height < 240 || viewport.height > 2160) {
        warnings.push(`Viewport ${index} height ${viewport.height} is outside recommended range (240-2160)`);
      }
    });
  }

  // Validate performance targets
  if (config.performance) {
    if (config.performance.maxTestExecutionTime > 10000) {
      warnings.push('Test execution time over 10 seconds may impact CI performance');
    }
    if (config.performance.maxScreenshotTime > 1000) {
      warnings.push('Screenshot time over 1 second may impact test performance');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Merge configuration objects
 * @param {Object} base - Base configuration
 * @param {Object} override - Override configuration
 * @returns {Object} Merged configuration
 */
export function mergeConfig(base, override) {
  const merged = JSON.parse(JSON.stringify(base));

  function merge(target, source) {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }

  merge(merged, override);
  return merged;
}

/**
 * Apply environment-specific overrides
 * @param {Object} config - Base configuration
 * @param {string} environment - Environment name
 * @returns {Object} Configuration with overrides applied
 */
function applyEnvironmentOverrides(config, environment) {
  const overrides = config.environments[environment];
  const result = JSON.parse(JSON.stringify(config));

  // Apply debug settings
  if (overrides.debug !== undefined) {
    result.debug.enabled = overrides.debug;
  }

  // Apply headless setting
  if (overrides.headless !== undefined) {
    // This would be used by Playwright config
    result.headless = overrides.headless;
  }

  // Apply retry settings
  if (overrides.retries !== undefined) {
    result.retry.maxRetries = overrides.retries;
  }

  // Apply slow motion
  if (overrides.slowMo !== undefined) {
    result.slowMo = overrides.slowMo;
  }

  return result;
}

/**
 * Determine current environment
 * @returns {string} Environment name
 */
function determineEnvironment() {
  if (process.env.CI) return 'ci';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Get configuration schema documentation
 * @returns {Object} Configuration schema
 */
export function getConfigSchema() {
  return {
    version: '1.0.0',
    description: 'WebClip Assistant UI Testing Configuration',
    schema: CONFIG_SCHEMA,
    examples: {
      minimal: {
        viewports: [{ width: 1280, height: 720, name: 'desktop' }],
        themes: ['light'],
        timeouts: { default: 5000 }
      },
      full: DEFAULT_CONFIG
    },
    environmentVariables: [
      { name: 'NODE_ENV', description: 'Node environment (development, production)' },
      { name: 'CI', description: 'CI environment flag' },
      { name: 'DEBUG', description: 'Enable debug logging' }
    ]
  };
}

/**
 * Save configuration to file
 * @param {Object} config - Configuration to save
 * @param {string} filePath - File path
 * @returns {Promise<Object>} Save result
 */
export async function saveConfig(config, filePath = './test.config.json') {
  try {
    // Validate before saving
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Configuration validation failed',
        errors: validation.errors
      };
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save configuration
    const configString = JSON.stringify(config, null, 2);
    fs.writeFileSync(filePath, configString);

    return {
      success: true,
      path: filePath,
      message: 'Configuration saved successfully'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Export default for easy importing
export default {
  loadConfig,
  loadConfigFile,
  validateConfig,
  mergeConfig,
  saveConfig,
  getConfigSchema
};