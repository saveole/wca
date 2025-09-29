/**
 * Test Timeout Management Utility
 *
 * Provides comprehensive timeout management for test operations with
 * adaptive timeouts, hierarchical timeouts, and timeout strategies.
 */

import { TestError, ERROR_CATEGORIES, RECOVERY_STRATEGIES } from './error-handler.js';

/**
 * Default timeout configuration
 */
const DEFAULT_TIMEOUT_CONFIG = {
  // Base timeouts (in milliseconds)
  base: {
    default: 5000,
    navigation: 10000,
    element: 5000,
    screenshot: 3000,
    accessibility: 8000,
    interaction: 3000,
    api: 10000,
    file: 5000
  },

  // Timeout multipliers for different conditions
  multipliers: {
    slowNetwork: 2.0,
    ciEnvironment: 1.5,
    highLoad: 1.3,
    debugMode: 3.0
  },

  // Adaptive timeout settings
  adaptive: {
    enabled: true,
    historySize: 50,
    successThreshold: 0.8,
    adjustmentFactor: 0.2,
    minMultiplier: 0.5,
    maxMultiplier: 3.0
  },

  // Hierarchical timeout settings
  hierarchical: {
    enabled: true,
    parentChildRatio: 0.7,
    maxDepth: 5
  },

  // Timeout strategies
  strategies: {
    // Fixed timeout - always use the specified timeout
    fixed: {
      type: 'fixed',
      adaptable: false
    },
    // Adaptive timeout - adjust based on historical performance
    adaptive: {
      type: 'adaptive',
      adaptable: true
    },
    // Progressive timeout - increase on each retry
    progressive: {
      type: 'progressive',
      adaptable: true,
      incrementFactor: 1.5
    },
    // Context-aware timeout - adjust based on test context
    contextual: {
      type: 'contextual',
      adaptable: true
    }
  }
};

/**
 * Timeout history for adaptive calculations
 */
class TimeoutHistory {
  constructor(config = {}) {
    this.config = { ...DEFAULT_TIMEOUT_CONFIG.adaptive, ...config };
    this.history = new Map(); // Map<operationType, Array<{duration: number, success: boolean, timestamp: number}>>
  }

  /**
   * Record operation execution
   */
  record(operationType, duration, success = true) {
    if (!this.history.has(operationType)) {
      this.history.set(operationType, []);
    }

    const operationHistory = this.history.get(operationType);
    operationHistory.push({
      duration,
      success,
      timestamp: Date.now()
    });

    // Keep history size manageable
    if (operationHistory.length > this.config.historySize) {
      operationHistory.shift();
    }
  }

  /**
   * Get adaptive timeout for operation type
   */
  getAdaptiveTimeout(operationType, baseTimeout) {
    if (!this.config.enabled || !this.history.has(operationType)) {
      return baseTimeout;
    }

    const operationHistory = this.history.get(operationType);
    if (operationHistory.length < 5) {
      return baseTimeout;
    }

    // Calculate success rate
    const successCount = operationHistory.filter(h => h.success).length;
    const successRate = successCount / operationHistory.length;

    // Calculate average duration for successful operations
    const successfulOps = operationHistory.filter(h => h.success);
    const avgDuration = successfulOps.reduce((sum, h) => sum + h.duration, 0) / successfulOps.length;

    // Calculate adaptive timeout
    let multiplier = 1.0;

    // Adjust based on success rate
    if (successRate < this.config.successThreshold) {
      // Low success rate - increase timeout
      multiplier = Math.min(
        this.config.maxMultiplier,
        1 + ((this.config.successThreshold - successRate) * this.config.adjustmentFactor)
      );
    } else if (successRate > this.config.successThreshold + 0.1) {
      // High success rate - potentially decrease timeout
      multiplier = Math.max(
        this.config.minMultiplier,
        1 - ((successRate - this.config.successThreshold) * this.config.adjustmentFactor * 0.5)
      );
    }

    // Use the higher of average duration + margin or adjusted base timeout
    const adaptiveTimeout = Math.max(
      avgDuration * 1.2, // 20% margin
      baseTimeout * multiplier
    );

    return Math.round(adaptiveTimeout);
  }

  /**
   * Get statistics for an operation type
   */
  getStats(operationType) {
    if (!this.history.has(operationType)) {
      return null;
    }

    const operationHistory = this.history.get(operationType);
    const totalCount = operationHistory.length;
    const successCount = operationHistory.filter(h => h.success).length;
    const successRate = successCount / totalCount;

    const durations = operationHistory.map(h => h.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      operationType,
      totalExecutions: totalCount,
      successRate,
      avgDuration,
      minDuration,
      maxDuration,
      recentTrend: this.calculateTrend(operationHistory)
    };
  }

  /**
   * Calculate recent performance trend
   */
  calculateTrend(operationHistory) {
    if (operationHistory.length < 5) {
      return 'stable';
    }

    const recent = operationHistory.slice(-5);
    const earlier = operationHistory.slice(-10, -5);

    if (earlier.length === 0) {
      return 'stable';
    }

    const recentSuccessRate = recent.filter(h => h.success).length / recent.length;
    const earlierSuccessRate = earlier.filter(h => h.success).length / earlier.length;

    const recentAvgDuration = recent.reduce((sum, h) => sum + h.duration, 0) / recent.length;
    const earlierAvgDuration = earlier.reduce((sum, h) => sum + h.duration, 0) / earlier.length;

    if (recentSuccessRate > earlierSuccessRate + 0.1) {
      return 'improving';
    } else if (recentSuccessRate < earlierSuccessRate - 0.1) {
      return 'degrading';
    } else if (recentAvgDuration < earlierAvgDuration * 0.8) {
      return 'faster';
    } else if (recentAvgDuration > earlierAvgDuration * 1.2) {
      return 'slower';
    }

    return 'stable';
  }
}

/**
 * Hierarchical timeout manager
 */
class HierarchicalTimeoutManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_TIMEOUT_CONFIG.hierarchical, ...config };
    this.stack = [];
    this.rootTimeout = null;
  }

  /**
   * Enter a new timeout context
   */
  enterContext(name, timeout) {
    const parentTimeout = this.stack.length > 0 ? this.stack[this.stack.length - 1].remaining : null;

    let effectiveTimeout = timeout;
    if (parentTimeout && this.config.enabled) {
      effectiveTimeout = Math.min(timeout, parentTimeout * this.config.parentChildRatio);
    }

    const context = {
      name,
      timeout: effectiveTimeout,
      remaining: effectiveTimeout,
      startTime: Date.now()
    };

    this.stack.push(context);

    if (this.stack.length === 1) {
      this.rootTimeout = effectiveTimeout;
    }

    return context;
  }

  /**
   * Exit the current timeout context
   */
  exitContext() {
    if (this.stack.length === 0) {
      return null;
    }

    const context = this.stack.pop();
    const actualDuration = Date.now() - context.startTime;

    // Update parent remaining time
    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1];
      parent.remaining = Math.max(0, parent.timeout - actualDuration);
    }

    return {
      name: context.name,
      timeout: context.timeout,
      actualDuration,
      remaining: context.remaining
    };
  }

  /**
   * Get current remaining timeout
   */
  getRemainingTimeout() {
    if (this.stack.length === 0) {
      return null;
    }

    const current = this.stack[this.stack.length - 1];
    return Math.max(0, current.remaining - (Date.now() - current.startTime));
  }

  /**
   * Check if current context has timed out
   */
  isTimedOut() {
    const remaining = this.getRemainingTimeout();
    return remaining !== null && remaining <= 0;
  }

  /**
   * Get current context info
   */
  getCurrentContext() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
}

/**
 * Timeout execution result
 */
class TimeoutResult {
  constructor({
    success = false,
    result = null,
    error = null,
    timeout = 0,
    actualDuration = 0,
    timedOut = false,
    operationType = 'unknown'
  } = {}) {
    this.success = success;
    this.result = result;
    this.error = error;
    this.timeout = timeout;
    this.actualDuration = actualDuration;
    this.timedOut = timedOut;
    this.operationType = operationType;
  }

  /**
   * Check if the operation completed within timeout
   */
  completedWithinTimeout() {
    return this.success && !this.timedOut;
  }

  /**
   * Get efficiency score (0-1)
   */
  getEfficiency() {
    if (this.timeout === 0) return 0;
    return Math.min(1, this.actualDuration / this.timeout);
  }
}

/**
 * Global instances
 */
const globalTimeoutHistory = new TimeoutHistory();
const globalHierarchicalManager = new HierarchicalTimeoutManager();

/**
 * Execute operation with timeout
 */
export async function executeWithTimeout(fn, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_CONFIG.base.default,
    operationType = 'unknown',
    strategy = 'adaptive',
    context = {},
    hierarchical = false,
    onTimeout = null,
    history = globalTimeoutHistory,
    manager = globalHierarchicalManager
  } = options;

  let timeoutContext = null;
  let effectiveTimeout = timeout;

  // Apply hierarchical timeout if enabled
  if (hierarchical) {
    timeoutContext = manager.enterContext(operationType, timeout);
    effectiveTimeout = timeoutContext.timeout;
  }

  // Apply strategy adjustments
  if (strategy === 'adaptive') {
    effectiveTimeout = history.getAdaptiveTimeout(operationType, effectiveTimeout);
  } else if (strategy === 'progressive') {
    // This would be enhanced with retry context
    const retryCount = context.retryCount || 0;
    effectiveTimeout = timeout * Math.pow(DEFAULT_TIMEOUT_CONFIG.strategies.progressive.incrementFactor, retryCount);
  } else if (strategy === 'contextual') {
    effectiveTimeout = calculateContextualTimeout(operationType, timeout, context);
  }

  const startTime = Date.now();
  let timeoutId = null;
  let completed = false;

  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutError = new TestError({
          message: `Operation timed out after ${effectiveTimeout}ms`,
          category: ERROR_CATEGORIES.TIMEOUT,
          severity: 'high',
          recoverable: true,
          recoveryStrategy: RECOVERY_STRATEGIES.RETRY,
          context: {
            operationType,
            timeout: effectiveTimeout,
            actualDuration: Date.now() - startTime,
            strategy,
            ...context
          },
          suggestions: [
            'Increase timeout value for this operation',
            'Check for slow network conditions',
            'Optimize operation performance',
            'Consider breaking operation into smaller chunks'
          ]
        });

        reject(timeoutError);
      }, effectiveTimeout);
    });

    // Execute the function
    const result = await Promise.race([
      fn(),
      timeoutPromise
    ]);

    completed = true;
    const actualDuration = Date.now() - startTime;

    // Record successful execution
    history.record(operationType, actualDuration, true);

    // Exit hierarchical context
    if (hierarchical && timeoutContext) {
      manager.exitContext();
    }

    return new TimeoutResult({
      success: true,
      result,
      timeout: effectiveTimeout,
      actualDuration,
      timedOut: false,
      operationType
    });

  } catch (error) {
    const actualDuration = Date.now() - startTime;
    const timedOut = error.category === ERROR_CATEGORIES.TIMEOUT;

    // Record failed execution
    history.record(operationType, actualDuration, false);

    // Call timeout callback if provided
    if (timedOut && onTimeout) {
      await onTimeout(error, { operationType, timeout: effectiveTimeout, actualDuration });
    }

    // Exit hierarchical context
    if (hierarchical && timeoutContext) {
      manager.exitContext();
    }

    return new TimeoutResult({
      success: false,
      error,
      timeout: effectiveTimeout,
      actualDuration,
      timedOut,
      operationType
    });

  } finally {
    // Clean up timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Calculate contextual timeout based on environment and conditions
 */
function calculateContextualTimeout(operationType, baseTimeout, context = {}) {
  let timeout = baseTimeout;

  // Apply environment multipliers
  if (context.environment === 'ci') {
    timeout *= DEFAULT_TIMEOUT_CONFIG.multipliers.ciEnvironment;
  }

  if (context.network === 'slow') {
    timeout *= DEFAULT_TIMEOUT_CONFIG.multipliers.slowNetwork;
  }

  if (context.load === 'high') {
    timeout *= DEFAULT_TIMEOUT_CONFIG.multipliers.highLoad;
  }

  if (context.debug) {
    timeout *= DEFAULT_TIMEOUT_CONFIG.multipliers.debugMode;
  }

  // Apply operation-specific adjustments
  if (operationType === 'screenshot' && context.viewport) {
    // Larger viewports need more time
    const viewportArea = context.viewport.width * context.viewport.height;
    if (viewportArea > 2000000) { // Large viewport
      timeout *= 1.5;
    }
  }

  if (operationType === 'accessibility' && context.pageComplexity === 'high') {
    timeout *= 1.3;
  }

  return Math.round(timeout);
}

/**
 * Create a timeout-aware wrapper for a function
 */
export function withTimeout(fn, options = {}) {
  return async (...args) => {
    return executeWithTimeout(
      () => fn(...args),
      options
    );
  };
}

/**
 * Execute multiple operations with timeout management
 */
export async function executeBatchWithTimeout(operations, options = {}) {
  const {
    concurrency = 3,
    overallTimeout = 30000,
    stopOnFirstTimeout = false,
    ...timeoutOptions
  } = options;

  const startTime = Date.now();
  const results = [];
  const timeouts = [];

  // Create overall timeout
  const overallTimeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TestError({
        message: `Batch execution timed out after ${overallTimeout}ms`,
        category: ERROR_CATEGORIES.TIMEOUT,
        severity: 'high',
        recoverable: true,
        context: { operations: operations.length, completed: results.length }
      }));
    }, overallTimeout);
  });

  try {
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await executeWithTimeout(
            operation.fn,
            {
              ...timeoutOptions,
              operationType: operation.name || `batch-${i + index}`,
              context: { batchIndex: i + index, ...operation.context }
            }
          );
          results.push({ success: true, result, operation });
          return result;
        } catch (error) {
          timeouts.push({ error, operation });
          results.push({ success: false, error, operation });

          if (stopOnFirstTimeout && error.category === ERROR_CATEGORIES.TIMEOUT) {
            throw error;
          }
        }
      });

      await Promise.all(batchPromises);

      // Check overall timeout
      if (Date.now() - startTime > overallTimeout) {
        throw new TestError({
          message: `Batch execution exceeded overall timeout of ${overallTimeout}ms`,
          category: ERROR_CATEGORIES.TIMEOUT,
          severity: 'high',
          recoverable: true
        });
      }
    }

    return await Promise.race([
      Promise.resolve({
        results,
        timeouts,
        successCount: results.filter(r => r.success).length,
        timeoutCount: timeouts.length,
        totalDuration: Date.now() - startTime
      }),
      overallTimeoutPromise
    ]);

  } catch (error) {
    return {
      success: false,
      error,
      results,
      timeouts,
      totalDuration: Date.now() - startTime
    };
  }
}

/**
 * Get timeout statistics
 */
export function getTimeoutStats() {
  const stats = {};

  // Get stats for all operation types
  for (const [operationType, _] of globalTimeoutHistory.history) {
    stats[operationType] = globalTimeoutHistory.getStats(operationType);
  }

  return {
    operationStats: stats,
    hierarchicalContext: globalHierarchicalManager.getCurrentContext(),
    remainingTimeout: globalHierarchicalManager.getRemainingTimeout()
  };
}

/**
 * Reset timeout history
 */
export function resetTimeoutHistory() {
  globalTimeoutHistory.history.clear();
  globalHierarchicalManager.stack = [];
}

/**
 * Timeout decorator for class methods
 */
export function timeout(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      return executeWithTimeout(
        () => originalMethod.apply(this, args),
        {
          ...options,
          operationType: `${target.constructor.name}.${propertyKey}`,
          context: { target, propertyKey, args }
        }
      );
    };

    return descriptor;
  };
}

export default {
  executeWithTimeout,
  withTimeout,
  timeout,
  executeBatchWithTimeout,
  TimeoutResult,
  TimeoutHistory,
  HierarchicalTimeoutManager,
  getTimeoutStats,
  resetTimeoutHistory,
  DEFAULT_TIMEOUT_CONFIG,
  globalTimeoutHistory,
  globalHierarchicalManager
};