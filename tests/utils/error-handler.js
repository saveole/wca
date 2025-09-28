/**
 * Comprehensive Error Handling Utility
 *
 * Provides centralized error handling, categorization, and recovery mechanisms
 * for the UI testing framework with Chrome extension context support.
 */

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

/**
 * Error categories for classification
 */
const ERROR_CATEGORIES = {
  SETUP: 'setup',
  CONFIGURATION: 'configuration',
  SCREENSHOT: 'screenshot',
  ACCESSIBILITY: 'accessibility',
  VISUAL_REGRESSION: 'visual_regression',
  INTERACTION: 'interaction',
  PERFORMANCE: 'performance',
  TIMEOUT: 'timeout',
  NETWORK: 'network',
  FILE_SYSTEM: 'file_system',
  API: 'api',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

/**
 * Error recovery strategies
 */
const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  SKIP: 'skip',
  FAIL_FAST: 'fail_fast',
  CONTINUE: 'continue',
  FALLBACK: 'fallback'
};

/**
 * Enhanced Error class for testing framework
 */
class TestError extends Error {
  constructor({
    message,
    category = ERROR_CATEGORIES.UNKNOWN,
    severity = ERROR_SEVERITY.MEDIUM,
    recoverable = true,
    recoveryStrategy = RECOVERY_STRATEGIES.CONTINUE,
    context = {},
    suggestions = [],
    retryCount = 0,
    originalError = null
  } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;
    this.recoveryStrategy = recoveryStrategy;
    this.context = context;
    this.suggestions = suggestions;
    this.retryCount = retryCount;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    this.id = generateErrorId();

    // Ensure stack trace is captured
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TestError);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      recoveryStrategy: this.recoveryStrategy,
      context: this.context,
      suggestions: this.suggestions,
      retryCount: this.retryCount,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError?.message || null
    };
  }

  /**
   * Create a TestError from a regular Error
   */
  static fromError(error, options = {}) {
    const categorized = categorizeError(error);
    return new TestError({
      message: error.message,
      category: categorized.category,
      severity: categorized.severity,
      recoverable: categorized.recoverable,
      recoveryStrategy: categorized.recoveryStrategy,
      suggestions: categorized.suggestions,
      originalError: error,
      ...options
    });
  }

  /**
   * Clone error with updated properties
   */
  clone(updates = {}) {
    return new TestError({
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      recoveryStrategy: this.recoveryStrategy,
      context: { ...this.context, ...updates.context },
      suggestions: [...this.suggestions, ...(updates.suggestions || [])],
      retryCount: this.retryCount,
      originalError: this.originalError,
      ...updates
    });
  }
}

/**
 * Error context information
 */
class ErrorContext {
  constructor({
    testId = null,
    testName = null,
    testType = null,
    viewport = null,
    theme = null,
    url = null,
    screenshot = null,
    timestamp = new Date().toISOString(),
    environment = {},
    metadata = {}
  } = {}) {
    this.testId = testId;
    this.testName = testName;
    this.testType = testType;
    this.viewport = viewport;
    this.theme = theme;
    this.url = url;
    this.screenshot = screenshot;
    this.timestamp = timestamp;
    this.environment = environment;
    this.metadata = metadata;
  }

  toJSON() {
    return {
      testId: this.testId,
      testName: this.testName,
      testType: this.testType,
      viewport: this.viewport,
      theme: this.theme,
      url: this.url,
      screenshot: this.screenshot,
      timestamp: this.timestamp,
      environment: this.environment,
      metadata: this.metadata
    };
  }
}

/**
 * Error collector for aggregating multiple errors
 */
class ErrorCollector {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.context = null;
  }

  /**
   * Add an error to the collector
   */
  addError(error, context = null) {
    let testError = error;

    // Convert regular Error to TestError
    if (!(error instanceof TestError)) {
      testError = TestError.fromError(error, { context });
    }

    // Update context if provided
    if (context) {
      testError.context = { ...testError.context, ...context };
    }

    this.errors.push(testError);

    // Limit the number of errors stored
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    return testError;
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category) {
    return this.errors.filter(error => error.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity) {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Get critical errors
   */
  getCriticalErrors() {
    return this.getErrorsBySeverity(ERROR_SEVERITY.CRITICAL);
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors() {
    return this.getCriticalErrors().length > 0;
  }

  /**
   * Get error summary
   */
  getSummary() {
    const summary = {
      total: this.errors.length,
      byCategory: {},
      bySeverity: {},
      recoverable: 0,
      nonRecoverable: 0
    };

    this.errors.forEach(error => {
      // Count by category
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;

      // Count by severity
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;

      // Count by recoverability
      if (error.recoverable) {
        summary.recoverable++;
      } else {
        summary.nonRecoverable++;
      }
    });

    return summary;
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }

  /**
   * Get all errors
   */
  getAll() {
    return [...this.errors];
  }
}

/**
 * Global error handler instance
 */
const globalErrorCollector = new ErrorCollector();

/**
 * Categorize an error based on its message and properties
 */
function categorizeError(error) {
  const message = error.message?.toLowerCase() || '';
  const stack = error.stack?.toLowerCase() || '';

  // Screenshot errors
  if (message.includes('screenshot') || message.includes('pixelmatch') || message.includes('png')) {
    return {
      category: ERROR_CATEGORIES.SCREENSHOT,
      severity: ERROR_SEVERITY.HIGH,
      recoverable: true,
      recoveryStrategy: RECOVERY_STRATEGIES.RETRY,
      suggestions: [
        'Check screenshot capture configuration',
        'Verify viewport settings',
        'Ensure target element is visible and stable'
      ]
    };
  }

  // Accessibility errors
  if (message.includes('accessibility') || message.includes('axe') || message.includes('wcag')) {
    return {
      category: ERROR_CATEGORIES.ACCESSIBILITY,
      severity: ERROR_SEVERITY.MEDIUM,
      recoverable: true,
      recoveryStrategy: RECOVERY_STRATEGIES.CONTINUE,
      suggestions: [
        'Review WCAG compliance issues',
        'Check ARIA attributes and labels',
        'Verify color contrast ratios'
      ]
    };
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      category: ERROR_CATEGORIES.TIMEOUT,
      severity: ERROR_SEVERITY.MEDIUM,
      recoverable: true,
      recoveryStrategy: RECOVERY_STRATEGIES.RETRY,
      suggestions: [
        'Increase timeout values',
        'Check for slow network conditions',
        'Optimize test performance'
      ]
    };
  }

  // Configuration errors
  if (message.includes('config') || message.includes('setting') || message.includes('not found')) {
    return {
      category: ERROR_CATEGORIES.CONFIGURATION,
      severity: ERROR_SEVERITY.HIGH,
      recoverable: false,
      recoveryStrategy: RECOVERY_STRATEGIES.FAIL_FAST,
      suggestions: [
        'Verify configuration file syntax',
        'Check required parameters',
        'Review environment settings'
      ]
    };
  }

  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('econnrefused')) {
    return {
      category: ERROR_CATEGORIES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      recoverable: true,
      recoveryStrategy: RECOVERY_STRATEGIES.RETRY,
      suggestions: [
        'Check network connectivity',
        'Verify API endpoints are accessible',
        'Review firewall and proxy settings'
      ]
    };
  }

  // File system errors
  if (message.includes('file') || message.includes('directory') || message.includes('permission')) {
    return {
      category: ERROR_CATEGORIES.FILE_SYSTEM,
      severity: ERROR_SEVERITY.HIGH,
      recoverable: false,
      recoveryStrategy: RECOVERY_STRATEGIES.FAIL_FAST,
      suggestions: [
        'Check file permissions',
        'Verify directory structure',
        'Ensure sufficient disk space'
      ]
    };
  }

  // Performance errors
  if (message.includes('performance') || message.includes('memory') || message.includes('slow')) {
    return {
      category: ERROR_CATEGORIES.PERFORMANCE,
      severity: ERROR_SEVERITY.MEDIUM,
      recoverable: true,
      recoveryStrategy: RECOVERY_STRATEGIES.CONTINUE,
      suggestions: [
        'Optimize test execution',
        'Reduce screenshot frequency',
        'Increase timeout values'
      ]
    };
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return {
      category: ERROR_CATEGORIES.VALIDATION,
      severity: ERROR_SEVERITY.MEDIUM,
      recoverable: true,
      recoveryStrategy: RECOVERY_STRATEGIES.SKIP,
      suggestions: [
        'Review input validation rules',
        'Check required fields',
        'Verify data format requirements'
      ]
    };
  }

  // Default categorization
  return {
    category: ERROR_CATEGORIES.UNKNOWN,
    severity: ERROR_SEVERITY.MEDIUM,
    recoverable: true,
    recoveryStrategy: RECOVERY_STRATEGIES.CONTINUE,
    suggestions: [
      'Review error logs for more details',
      'Check test implementation',
      'Verify environment configuration'
    ]
  };
}

/**
 * Generate a unique error ID
 */
function generateErrorId() {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create error context from test execution
 */
export function createErrorContext(testInfo) {
  return new ErrorContext({
    testId: testInfo.testId,
    testName: testInfo.testName,
    testType: testInfo.testType,
    viewport: testInfo.viewport,
    theme: testInfo.theme,
    url: testInfo.url,
    timestamp: new Date().toISOString(),
    environment: testInfo.environment || {},
    metadata: testInfo.metadata || {}
  });
}

/**
 * Handle error with comprehensive logging and recovery
 */
export async function handleError(error, context = {}, options = {}) {
  const {
    log = true,
    throwOnCritical = true,
    screenshotOnError = true,
    collector = globalErrorCollector
  } = options;

  // Create TestError if needed
  let testError = error;
  if (!(error instanceof TestError)) {
    testError = TestError.fromError(error, { context });
  }

  // Add context
  if (context) {
    testError.context = { ...testError.context, ...context };
  }

  // Add to collector
  collector.addError(testError);

  // Log error
  if (log) {
    logError(testError);
  }

  // Take screenshot if enabled
  if (screenshotOnError && context.page) {
    try {
      const screenshot = await context.page.screenshot({
        fullPage: false,
        captures: 'viewport'
      });
      testError.context.screenshot = screenshot.toString('base64');
    } catch (screenshotError) {
      console.warn('Failed to capture error screenshot:', screenshotError.message);
    }
  }

  // Throw on critical errors if enabled
  if (throwOnCritical && testError.severity === ERROR_SEVERITY.CRITICAL) {
    throw testError;
  }

  return testError;
}

/**
 * Log error in a structured format
 */
function logError(error) {
  const errorData = error.toJSON();

  console.error(`[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`);
  console.error(`Error ID: ${error.id}`);
  console.error(`Timestamp: ${error.timestamp}`);

  if (error.context) {
    console.error('Context:', JSON.stringify(error.context, null, 2));
  }

  if (error.suggestions.length > 0) {
    console.error('Suggestions:');
    error.suggestions.forEach((suggestion, index) => {
      console.error(`  ${index + 1}. ${suggestion}`);
    });
  }

  if (error.stack) {
    console.error('Stack:', error.stack);
  }
}

/**
 * Create a wrapped function with error handling
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handledError = await handleError(error, {}, options);

      // Return error result or throw based on strategy
      if (handledError.recoveryStrategy === RECOVERY_STRATEGIES.CONTINUE) {
        return { error: handledError, success: false };
      } else if (handledError.recoveryStrategy === RECOVERY_STRATEGIES.SKIP) {
        return { skipped: true, error: handledError };
      } else {
        throw handledError;
      }
    }
  };
}

/**
 * Execute function with retry capability
 */
export async function executeWithRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffFactor = 2,
    context = {},
    collector = globalErrorCollector
  } = options;

  let lastError = null;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      retryCount++;

      if (retryCount > maxRetries) {
        break;
      }

      // Create enhanced error with retry info
      const retryError = TestError.fromError(error, {
        context,
        retryCount,
        suggestions: [
          ...error.suggestions || [],
          `Retry attempt ${retryCount} of ${maxRetries}`
        ]
      });

      collector.addError(retryError);

      // Wait before retrying
      const delay = retryDelay * Math.pow(backoffFactor, retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Final error after all retries
  const finalError = TestError.fromError(lastError, {
    context,
    retryCount: maxRetries,
    recoveryStrategy: RECOVERY_STRATEGIES.FAIL_FAST,
    suggestions: [
      ...lastError.suggestions || [],
      'Maximum retry attempts exceeded'
    ]
  });

  collector.addError(finalError);
  throw finalError;
}

/**
 * Check if error should halt execution
 */
export function shouldHaltExecution(error) {
  return error.severity === ERROR_SEVERITY.CRITICAL &&
         error.recoveryStrategy === RECOVERY_STRATEGIES.FAIL_FAST;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error) {
  const categoryMessages = {
    [ERROR_CATEGORIES.SCREENSHOT]: 'Screenshot capture failed',
    [ERROR_CATEGORIES.ACCESSIBILITY]: 'Accessibility test failed',
    [ERROR_CATEGORIES.TIMEOUT]: 'Test timed out',
    [ERROR_CATEGORIES.CONFIGURATION]: 'Configuration error',
    [ERROR_CATEGORIES.NETWORK]: 'Network connection issue',
    [ERROR_CATEGORIES.FILE_SYSTEM]: 'File system error',
    [ERROR_CATEGORIES.PERFORMANCE]: 'Performance issue',
    [ERROR_CATEGORIES.VALIDATION]: 'Validation error'
  };

  const baseMessage = categoryMessages[error.category] || 'Test execution error';

  let message = `${baseMessage}: ${error.message}`;

  // Add recovery suggestion
  if (error.suggestions.length > 0) {
    message += `\n\nSuggestion: ${error.suggestions[0]}`;
  }

  // Add retry information
  if (error.retryCount > 0) {
    message += `\nRetries attempted: ${error.retryCount}`;
  }

  return message;
}

/**
 * Generate error report for AI analysis
 */
export function generateErrorReport(collector = globalErrorCollector) {
  const summary = collector.getSummary();
  const errors = collector.getAll();

  return {
    executionId: generateErrorId().replace('err_', 'exec_'),
    timestamp: new Date().toISOString(),
    summary,
    errors: errors.map(error => error.toJSON()),
    actionableInsights: generateActionableInsights(errors),
    recommendations: generateRecommendations(summary)
  };
}

/**
 * Generate actionable insights from errors
 */
function generateActionableInsights(errors) {
  const insights = [];

  // Pattern analysis
  const errorPatterns = {};
  errors.forEach(error => {
    const pattern = error.category;
    errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
  });

  // Most common error type
  const mostCommon = Object.entries(errorPatterns)
    .sort(([,a], [,b]) => b - a)[0];

  if (mostCommon && mostCommon[1] > 1) {
    insights.push({
      type: 'pattern',
      message: `Multiple ${mostCommon[0]} errors detected (${mostCommon[1]} occurrences)`,
      severity: 'medium',
      action: 'systematic_review'
    });
  }

  // Critical errors
  const criticalCount = errors.filter(e => e.severity === ERROR_SEVERITY.CRITICAL).length;
  if (criticalCount > 0) {
    insights.push({
      type: 'critical',
      message: `${criticalCount} critical errors require immediate attention`,
      severity: 'critical',
      action: 'immediate_fix'
    });
  }

  // Recovery rate
  const recoverableCount = errors.filter(e => e.recoverable).length;
  const recoveryRate = errors.length > 0 ? recoverableCount / errors.length : 1;
  if (recoveryRate < 0.8) {
    insights.push({
      type: 'recovery',
      message: `Low recovery rate (${Math.round(recoveryRate * 100)}%) - improve error handling`,
      severity: 'high',
      action: 'improve_error_handling'
    });
  }

  return insights;
}

/**
 * Generate recommendations based on error summary
 */
function generateRecommendations(summary) {
  const recommendations = [];

  if (summary.byCategory.screenshot > 0) {
    recommendations.push('Review screenshot capture configuration and timing');
  }

  if (summary.byCategory.timeout > 0) {
    recommendations.push('Increase timeout values or optimize test performance');
  }

  if (summary.byCategory.configuration > 0) {
    recommendations.push('Validate configuration files and environment settings');
  }

  if (summary.byCategory.network > 0) {
    recommendations.push('Check network connectivity and API availability');
  }

  if (summary.nonRecoverable > 0) {
    recommendations.push('Implement better error recovery mechanisms for critical failures');
  }

  return recommendations;
}

// Export classes and utilities
export {
  TestError,
  ErrorContext,
  ErrorCollector,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  RECOVERY_STRATEGIES,
  globalErrorCollector
};

export default {
  TestError,
  ErrorContext,
  ErrorCollector,
  handleError,
  withErrorHandling,
  executeWithRetry,
  shouldHaltExecution,
  getUserFriendlyMessage,
  generateErrorReport,
  createErrorContext,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  RECOVERY_STRATEGIES,
  globalErrorCollector
};