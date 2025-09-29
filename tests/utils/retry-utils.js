/**
 * Retry Utility for Flaky Tests
 *
 * Provides intelligent retry mechanisms for handling flaky tests with
 * exponential backoff, circuit breaking, and adaptive strategies.
 */

import { TestError, ERROR_CATEGORIES, RECOVERY_STRATEGIES } from './error-handler.js';

/**
 * Retry configuration defaults
 */
const DEFAULT_RETRY_CONFIG = {
  // Basic retry settings
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,

  // Exponential backoff settings
  jitter: true,
  jitterFactor: 0.1,

  // Circuit breaker settings
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 300000
  },

  // Adaptive retry settings
  adaptive: {
    enabled: true,
    successThreshold: 0.8,
    failureThreshold: 0.5,
    sampleSize: 10
  },

  // Error type specific settings
  errorTypeSettings: {
    [ERROR_CATEGORIES.TIMEOUT]: {
      maxRetries: 5,
      initialDelay: 2000,
      backoffFactor: 1.5
    },
    [ERROR_CATEGORIES.NETWORK]: {
      maxRetries: 4,
      initialDelay: 1000,
      backoffFactor: 2
    },
    [ERROR_CATEGORIES.SCREENSHOT]: {
      maxRetries: 2,
      initialDelay: 500,
      backoffFactor: 1.5
    },
    [ERROR_CATEGORIES.ACCESSIBILITY]: {
      maxRetries: 1,
      retryIf: (error) => error.recoverable
    }
  }
};

/**
 * Circuit breaker for preventing cascading failures
 */
class CircuitBreaker {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG.circuitBreaker, ...config };
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.monitoringStartTime = Date.now();
  }

  /**
   * Check if the circuit breaker allows execution
   */
  async allowExecution() {
    const now = Date.now();

    // Reset monitoring period
    if (now - this.monitoringStartTime > this.config.monitoringPeriod) {
      this.reset();
    }

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if reset timeout has passed
        if (now - this.lastFailureTime > this.config.resetTimeout) {
          this.state = 'HALF_OPEN';
          this.successCount = 0;
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited execution to test recovery
        return this.successCount < 3;

      default:
        return true;
    }
  }

  /**
   * Record a successful execution
   */
  recordSuccess() {
    this.failures = 0;
    this.successCount++;

    if (this.state === 'HALF_OPEN' && this.successCount >= 3) {
      this.state = 'CLOSED';
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.monitoringStartTime = Date.now();
    this.lastFailureTime = null;
  }

  /**
   * Get current state information
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      monitoringStartTime: this.monitoringStartTime
    };
  }
}

/**
 * Adaptive retry strategy based on historical performance
 */
class AdaptiveRetryStrategy {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG.adaptive, ...config };
    this.history = [];
    this.maxHistorySize = 100;
  }

  /**
   * Record test execution result
   */
  recordResult(testName, success, duration, retryCount) {
    this.history.push({
      testName,
      success,
      duration,
      retryCount,
      timestamp: Date.now()
    });

    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get adaptive retry settings for a test
   */
  getRetrySettings(testName) {
    if (!this.config.enabled) {
      return null;
    }

    const testHistory = this.history.filter(h => h.testName === testName);
    if (testHistory.length < this.config.sampleSize) {
      return null;
    }

    const recentHistory = testHistory.slice(-this.config.sampleSize);
    const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;
    const avgRetries = recentHistory.reduce((sum, h) => sum + h.retryCount, 0) / recentHistory.length;

    // Adjust settings based on success rate
    let settings = {};

    if (successRate < this.config.failureThreshold) {
      // High failure rate - reduce retries
      settings.maxRetries = Math.max(1, Math.floor(avgRetries * 0.5));
      settings.initialDelay = 2000;
      settings.backoffFactor = 2.5;
    } else if (successRate > this.config.successThreshold) {
      // High success rate - maintain current settings
      settings.maxRetries = Math.min(5, Math.ceil(avgRetries * 1.2));
      settings.initialDelay = 1000;
      settings.backoffFactor = 2;
    } else {
      // Moderate success rate - slight adjustment
      settings.maxRetries = Math.max(2, Math.floor(avgRetries * 0.8));
      settings.initialDelay = 1500;
      settings.backoffFactor = 2;
    }

    return settings;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    if (this.history.length === 0) {
      return null;
    }

    const totalTests = this.history.length;
    const successfulTests = this.history.filter(h => h.success).length;
    const successRate = successfulTests / totalTests;
    const avgRetries = this.history.reduce((sum, h) => sum + h.retryCount, 0) / totalTests;
    const avgDuration = this.history.reduce((sum, h) => sum + h.duration, 0) / totalTests;

    // Group by test name
    const byTest = {};
    this.history.forEach(h => {
      if (!byTest[h.testName]) {
        byTest[h.testName] = [];
      }
      byTest[h.testName].push(h);
    });

    const testStats = {};
    Object.entries(byTest).forEach(([testName, tests]) => {
      const testSuccess = tests.filter(t => t.success).length;
      testStats[testName] = {
        executions: tests.length,
        successRate: testSuccess / tests.length,
        avgRetries: tests.reduce((sum, t) => sum + t.retryCount, 0) / tests.length,
        avgDuration: tests.reduce((sum, t) => sum + t.duration, 0) / tests.length
      };
    });

    return {
      totalExecutions: totalTests,
      successRate,
      avgRetries,
      avgDuration,
      testStats
    };
  }
}

/**
 * Retry context for tracking retry attempts
 */
class RetryContext {
  constructor({
    testName,
    attemptNumber = 1,
    maxRetries,
    delay,
    strategy = 'exponential',
    circuitBreaker = null,
    adaptiveStrategy = null
  } = {}) {
    this.testName = testName;
    this.attemptNumber = attemptNumber;
    this.maxRetries = maxRetries;
    this.delay = delay;
    this.strategy = strategy;
    this.circuitBreaker = circuitBreaker;
    this.adaptiveStrategy = adaptiveStrategy;
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Record an error for this retry attempt
   */
  recordError(error) {
    this.errors.push({
      attempt: this.attemptNumber,
      error: error.message,
      timestamp: Date.now(),
      stack: error.stack
    });
  }

  /**
   * Add a warning
   */
  addWarning(warning) {
    this.warnings.push({
      attempt: this.attemptNumber,
      warning,
      timestamp: Date.now()
    });
  }

  /**
   * Get duration of current attempt
   */
  getDuration() {
    return Date.now() - this.startTime;
  }

  /**
   * Check if this is the final attempt
   */
  isFinalAttempt() {
    return this.attemptNumber >= this.maxRetries;
  }

  /**
   * Check if should retry
   */
  shouldRetry(error) {
    if (this.isFinalAttempt()) {
      return false;
    }

    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.allowExecution()) {
      this.addWarning('Circuit breaker is OPEN - blocking retry attempt');
      return false;
    }

    // Check if error is retryable
    return isRetryableError(error);
  }

  /**
   * Prepare for next attempt
   */
  async nextAttempt() {
    this.attemptNumber++;
    this.startTime = Date.now();

    // Calculate delay with jitter
    let actualDelay = this.delay;
    if (this.strategy === 'exponential') {
      actualDelay = Math.min(
        this.delay * Math.pow(DEFAULT_RETRY_CONFIG.backoffFactor, this.attemptNumber - 1),
        DEFAULT_RETRY_CONFIG.maxDelay
      );
    }

    // Add jitter if enabled
    if (DEFAULT_RETRY_CONFIG.jitter) {
      const jitterAmount = actualDelay * DEFAULT_RETRY_CONFIG.jitterFactor;
      actualDelay += (Math.random() - 0.5) * 2 * jitterAmount;
      actualDelay = Math.max(0, actualDelay);
    }

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, actualDelay));

    // Reset start time for new attempt
    this.startTime = Date.now();
  }

  /**
   * Get summary of retry context
   */
  getSummary() {
    return {
      testName: this.testName,
      attempts: this.attemptNumber,
      maxRetries: this.maxRetries,
      duration: this.getDuration(),
      errors: this.errors.length,
      warnings: this.warnings.length,
      strategy: this.strategy,
      circuitBreakerState: this.circuitBreaker?.getState()
    };
  }
}

/**
 * Global instances
 */
const globalCircuitBreaker = new CircuitBreaker();
const globalAdaptiveStrategy = new AdaptiveRetryStrategy();

/**
 * Execute function with intelligent retry logic
 */
export async function executeWithRetry(fn, options = {}) {
  const {
    testName = 'unknown',
    config = DEFAULT_RETRY_CONFIG,
    circuitBreaker = globalCircuitBreaker,
    adaptiveStrategy = globalAdaptiveStrategy,
    onError = null,
    onRetry = null,
    onSuccess = null,
    context = {}
  } = options;

  // Get error-specific settings
  let effectiveConfig = config;
  if (config.errorTypeSettings) {
    // We'll adjust this after first error
  }

  // Get adaptive settings if enabled
  const adaptiveSettings = adaptiveStrategy.getRetrySettings(testName);
  if (adaptiveSettings) {
    effectiveConfig = { ...effectiveConfig, ...adaptiveSettings };
  }

  // Create retry context
  const retryContext = new RetryContext({
    testName,
    maxRetries: effectiveConfig.maxRetries,
    delay: effectiveConfig.initialDelay,
    strategy: 'exponential',
    circuitBreaker,
    adaptiveStrategy
  });

  let lastError = null;

  while (retryContext.attemptNumber <= effectiveConfig.maxRetries) {
    try {
      // Execute function
      const result = await fn();

      // Record success
      if (adaptiveStrategy) {
        adaptiveStrategy.recordResult(
          testName,
          true,
          retryContext.getDuration(),
          retryContext.attemptNumber - 1
        );
      }

      if (circuitBreaker) {
        circuitBreaker.recordSuccess();
      }

      // Call success callback
      if (onSuccess) {
        await onSuccess(result, retryContext);
      }

      return result;

    } catch (error) {
      lastError = error;
      retryContext.recordError(error);

      // Adjust config based on error type if not already done
      if (retryContext.attemptNumber === 1 && config.errorTypeSettings) {
        const errorCategory = error.category || ERROR_CATEGORIES.UNKNOWN;
        const errorSettings = config.errorTypeSettings[errorCategory];
        if (errorSettings) {
          effectiveConfig = { ...effectiveConfig, ...errorSettings };
          retryContext.maxRetries = effectiveConfig.maxRetries;
        }
      }

      // Check if should retry
      if (!retryContext.shouldRetry(error)) {
        break;
      }

      // Call retry callback
      if (onRetry) {
        await onRetry(error, retryContext);
      }

      // Prepare for next attempt
      if (!retryContext.isFinalAttempt()) {
        await retryContext.nextAttempt();
      }
    }
  }

  // Record final failure
  if (adaptiveStrategy) {
    adaptiveStrategy.recordResult(
      testName,
      false,
      retryContext.getDuration(),
      retryContext.attemptNumber - 1
    );
  }

  if (circuitBreaker) {
    circuitBreaker.recordFailure();
  }

  // Call error callback
  if (onError) {
    await onError(lastError, retryContext);
  }

  // Create enhanced error with retry information
  const retryError = new TestError({
    message: `Test failed after ${retryContext.attemptNumber} attempts: ${lastError.message}`,
    category: lastError.category || ERROR_CATEGORIES.UNKNOWN,
    severity: lastError.severity || 'medium',
    recoverable: false,
    recoveryStrategy: RECOVERY_STRATEGIES.FAIL_FAST,
    context: {
      ...context,
      retryAttempts: retryContext.attemptNumber,
      retryDuration: retryContext.getDuration(),
      errors: retryContext.errors
    },
    suggestions: [
      ...lastError.suggestions || [],
      `Test failed after ${retryContext.attemptNumber} retry attempts`,
      'Consider increasing timeout values or fixing flaky conditions'
    ],
    originalError: lastError
  });

  throw retryError;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
  // Always retry timeouts
  if (error.category === ERROR_CATEGORIES.TIMEOUT) {
    return true;
  }

  // Retry network errors
  if (error.category === ERROR_CATEGORIES.NETWORK) {
    return true;
  }

  // Retry recoverable errors
  if (error.recoverable) {
    return true;
  }

  // Don't retry configuration or validation errors
  if (error.category === ERROR_CATEGORIES.CONFIGURATION ||
      error.category === ERROR_CATEGORIES.VALIDATION) {
    return false;
  }

  // Default to not retrying unknown errors
  return false;
}

/**
 * Create a retry wrapper for a function
 */
export function withRetry(fn, options = {}) {
  return async (...args) => {
    return executeWithRetry(
      () => fn(...args),
      options
    );
  };
}

/**
 * Retry decorator for class methods
 */
export function retry(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      return executeWithRetry(
        () => originalMethod.apply(this, args),
        {
          ...options,
          testName: `${target.constructor.name}.${propertyKey}`,
          context: { target, propertyKey, args }
        }
      );
    };

    return descriptor;
  };
}

/**
 * Batch retry for multiple operations
 */
export async function batchRetry(operations, options = {}) {
  const {
    concurrency = 3,
    stopOnFailure = false,
    ...retryOptions
  } = options;

  const results = [];
  const errors = [];

  // Process operations in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchPromises = batch.map(async (operation, index) => {
      try {
        const result = await executeWithRetry(
          operation.fn,
          {
            ...retryOptions,
            testName: operation.name || `batch-${i + index}`,
            context: { batchIndex: i + index, ...operation.context }
          }
        );
        results.push({ success: true, result, operation });
        return result;
      } catch (error) {
        errors.push({ error, operation });
        results.push({ success: false, error, operation });

        if (stopOnFailure) {
          throw error;
        }
      }
    });

    await Promise.all(batchPromises);
  }

  return {
    results,
    errors,
    successCount: results.filter(r => r.success).length,
    failureCount: errors.length
  };
}

/**
 * Get retry statistics
 */
export function getRetryStats() {
  return {
    circuitBreaker: globalCircuitBreaker.getState(),
    adaptive: globalAdaptiveStrategy.getStats()
  };
}

/**
 * Reset retry mechanisms
 */
export function resetRetryMechanisms() {
  globalCircuitBreaker.reset();
  // Note: Adaptive strategy history is preserved for learning
}

export default {
  executeWithRetry,
  withRetry,
  retry,
  batchRetry,
  CircuitBreaker,
  AdaptiveRetryStrategy,
  RetryContext,
  getRetryStats,
  resetRetryMechanisms,
  DEFAULT_RETRY_CONFIG
};