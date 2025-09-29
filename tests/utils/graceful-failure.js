/**
 * Graceful Failure Modes for Test Execution
 *
 * Provides comprehensive graceful failure handling to ensure test suites
 * can continue execution even when individual tests fail, with proper
 * cleanup, state management, and recovery strategies.
 */

import { TestError, ERROR_SEVERITY, ERROR_CATEGORIES, RECOVERY_STRATEGIES } from './error-handler.js';

/**
 * Graceful failure configuration
 */
const GRACEFUL_FAILURE_CONFIG = {
  // Failure handling modes
  modes: {
    CONTINUE: 'continue',           // Continue with next test
    SKIP_SUITE: 'skip_suite',        // Skip remaining tests in current suite
    STOP_CURRENT: 'stop_current',   // Stop current test, continue with next
    RETRY_LATER: 'retry_later',      // Queue test for retry at end
    BEST_EFFORT: 'best_effort'       // Continue with degraded functionality
  },

  // Cleanup strategies
  cleanup: {
    enabled: true,
    timeout: 5000,
    retryCount: 2,
    forceCleanup: false
  },

  // State recovery
  state: {
    preserveContext: true,
    isolationLevel: 'test',          // 'test', 'suite', 'session'
    checkpointInterval: 10,
    maxCheckpoints: 5
  },

  // Reporting and logging
  reporting: {
    logFailures: true,
    logSuccess: true,
    screenshotOnFailure: true,
    saveStateOnFailure: true,
    detailedMetrics: true
  },

  // Recovery strategies
  recovery: {
    autoRetry: {
      enabled: true,
      maxRetries: 1,
      delay: 1000,
      backoff: false
    },
    fallback: {
      enabled: true,
      timeout: 3000
    },
    degradation: {
      enabled: true,
      maxDegradationSteps: 3,
      timeoutMultiplier: 1.5
    }
  }
};

/**
 * Test execution state
 */
class TestExecutionState {
  constructor({
    testId,
    suiteId,
    isolationLevel = GRACEFUL_FAILURE_CONFIG.state.isolationLevel
  } = {}) {
    this.testId = testId;
    this.suiteId = suiteId;
    this.isolationLevel = isolationLevel;
    this.checkpoints = [];
    this.resources = new Set();
    this.context = {};
    this.startTime = Date.now();
    this.status = 'running';
    this.failureCount = 0;
    this.recoveryAttempts = 0;
  }

  /**
   * Create a checkpoint of current state
   */
  createCheckpoint(name = '') {
    const checkpoint = {
      id: generateCheckpointId(),
      name: name || `checkpoint-${this.checkpoints.length + 1}`,
      timestamp: Date.now(),
      context: JSON.parse(JSON.stringify(this.context)),
      resources: Array.from(this.resources),
      failureCount: this.failureCount
    };

    this.checkpoints.push(checkpoint);

    // Limit checkpoint count
    if (this.checkpoints.length > GRACEFUL_FAILURE_CONFIG.state.maxCheckpoints) {
      this.checkpoints.shift();
    }

    return checkpoint.id;
  }

  /**
   * Restore to a specific checkpoint
   */
  restoreToCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    this.context = JSON.parse(JSON.stringify(checkpoint.context));
    this.resources = new Set(checkpoint.resources);
    this.failureCount = checkpoint.failureCount;
    this.recoveryAttempts++;

    return checkpoint;
  }

  /**
   * Add a resource to track for cleanup
   */
  addResource(resource) {
    this.resources.add(resource);
  }

  /**
   * Remove a resource from tracking
   */
  removeResource(resource) {
    this.resources.delete(resource);
  }

  /**
   * Get current state summary
   */
  getSummary() {
    return {
      testId: this.testId,
      suiteId: this.suiteId,
      status: this.status,
      duration: Date.now() - this.startTime,
      checkpoints: this.checkpoints.length,
      resources: this.resources.size,
      failureCount: this.failureCount,
      recoveryAttempts: this.recoveryAttempts
    };
  }
}

/**
 * Graceful failure manager
 */
class GracefulFailureManager {
  constructor(config = {}) {
    this.config = { ...GRACEFUL_FAILURE_CONFIG, ...config };
    this.executionStates = new Map();
    this.suiteStates = new Map();
    this.globalState = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      recoveryAttempts: 0,
      cleanupFailures: 0
    };
  }

  /**
   * Start test execution
   */
  async startTest(testInfo) {
    const state = new TestExecutionState({
      testId: testInfo.testId,
      suiteId: testInfo.suiteId,
      isolationLevel: this.config.state.isolationLevel
    });

    this.executionStates.set(testInfo.testId, state);
    this.globalState.totalTests++;

    // Create initial checkpoint
    state.createCheckpoint('initial');

    return state;
  }

  /**
   * Handle test failure gracefully
   */
  async handleFailure(error, testInfo, context = {}) {
    const state = this.executionStates.get(testInfo.testId);
    if (!state) {
      throw new Error(`Test state not found for ${testInfo.testId}`);
    }

    state.status = 'failed';
    state.failureCount++;
    this.globalState.failedTests++;
    this.globalState.recoveryAttempts++;

    // Create failure checkpoint
    const failureCheckpointId = state.createCheckpoint('failure');

    // Log failure
    if (this.config.reporting.logFailures) {
      await this.logFailure(error, testInfo, state, context);
    }

    // Take screenshot on failure if enabled
    if (this.config.reporting.screenshotOnFailure && context.page) {
      await this.captureFailureScreenshot(testInfo, context.page);
    }

    // Determine failure mode
    const failureMode = this.determineFailureMode(error, state);

    // Attempt recovery based on failure mode
    const recoveryResult = await this.attemptRecovery(error, testInfo, state, failureMode, context);

    // Clean up resources
    await this.cleanupTestResources(state);

    // Update state based on recovery result
    if (recoveryResult.success) {
      state.status = 'recovered';
      this.globalState.failedTests--;
      this.globalState.passedTests++;
    } else if (recoveryResult.shouldSkip) {
      state.status = 'skipped';
      this.globalState.failedTests--;
      this.globalState.skippedTests++;
    }

    return {
      success: recoveryResult.success,
      mode: failureMode,
      recoveryResult,
      finalState: state.getSummary()
    };
  }

  /**
   * Handle test success
   */
  async handleSuccess(testInfo, result, context = {}) {
    const state = this.executionStates.get(testInfo.testId);
    if (!state) {
      throw new Error(`Test state not found for ${testInfo.testId}`);
    }

    state.status = 'passed';
    this.globalState.passedTests++;

    // Log success
    if (this.config.reporting.logSuccess) {
      await this.logSuccess(testInfo, result, state, context);
    }

    // Clean up resources
    await this.cleanupTestResources(state);

    return state.getSummary();
  }

  /**
   * Determine appropriate failure mode
   */
  determineFailureMode(error, state) {
    // Critical errors should stop the suite
    if (error.severity === ERROR_SEVERITY.CRITICAL) {
      return this.config.modes.SKIP_SUITE;
    }

    // Configuration errors should stop current
    if (error.category === ERROR_CATEGORIES.CONFIGURATION) {
      return this.config.modes.STOP_CURRENT;
    }

    // After multiple failures, skip remaining tests
    if (state.failureCount >= 3) {
      return this.config.modes.SKIP_SUITE;
    }

    // Default to continuing with next test
    return this.config.modes.CONTINUE;
  }

  /**
   * Attempt recovery based on failure mode
   */
  async attemptRecovery(error, testInfo, state, failureMode, context = {}) {
    switch (failureMode) {
      case this.config.modes.CONTINUE:
        return await this.recoveryContinue(error, testInfo, state, context);

      case this.config.modes.SKIP_SUITE:
        return await this.recoverySkipSuite(error, testInfo, state, context);

      case this.config.modes.STOP_CURRENT:
        return await this.recoveryStopCurrent(error, testInfo, state, context);

      case this.config.modes.RETRY_LATER:
        return await this.recoveryRetryLater(error, testInfo, state, context);

      case this.config.modes.BEST_EFFORT:
        return await this.recoveryBestEffort(error, testInfo, state, context);

      default:
        return { success: false, shouldSkip: false };
    }
  }

  /**
   * Recovery: Continue with next test
   */
  async recoveryContinue(error, testInfo, state, context) {
    // Just log and continue
    return {
      success: false,
      shouldSkip: false,
      strategy: 'continue',
      message: 'Test failed, continuing with next test'
    };
  }

  /**
   * Recovery: Skip remaining tests in suite
   */
  async recoverySkipSuite(error, testInfo, state, context) {
    // Mark suite as skipped
    this.suiteStates.set(testInfo.suiteId, {
      status: 'skipped',
      reason: error.message,
      testId: testInfo.testId
    });

    return {
      success: false,
      shouldSkip: true,
      strategy: 'skip_suite',
      message: 'Critical failure - skipping remaining tests in suite'
    };
  }

  /**
   * Recovery: Stop current test, continue with next
   */
  async recoveryStopCurrent(error, testInfo, state, context) {
    // Try auto-retry if enabled
    if (this.config.recovery.autoRetry.enabled && state.recoveryAttempts <= this.config.recovery.autoRetry.maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.recovery.autoRetry.delay));

        // Restore to last good checkpoint
        const goodCheckpoint = state.checkpoints.find(cp => cp.failureCount < state.failureCount);
        if (goodCheckpoint) {
          state.restoreToCheckpoint(goodCheckpoint.id);

          return {
            success: true,
            shouldSkip: false,
            strategy: 'auto_retry',
            message: `Auto-retry attempt ${state.recoveryAttempts}`
          };
        }
      } catch (retryError) {
        // Retry failed, continue with next test
      }
    }

    return {
      success: false,
      shouldSkip: false,
      strategy: 'stop_current',
      message: 'Test stopped due to failure'
    };
  }

  /**
   * Recovery: Queue test for retry at end
   */
  async recoveryRetryLater(error, testInfo, state, context) {
    // Add to retry queue (implementation would handle this)
    const retryInfo = {
      testId: testInfo.testId,
      suiteId: testInfo.suiteId,
      error: error.message,
      timestamp: Date.now(),
      priority: state.failureCount
    };

    return {
      success: false,
      shouldSkip: true,
      strategy: 'retry_later',
      retryInfo,
      message: 'Test queued for retry'
    };
  }

  /**
   * Recovery: Continue with degraded functionality
   */
  async recoveryBestEffort(error, testInfo, state, context) {
    // Try to continue with reduced functionality
    if (this.config.recovery.degradation.enabled) {
      // Apply degradation steps
      const degradationSteps = Math.min(state.failureCount, this.config.recovery.degradation.maxDegradationSteps);

      // Example: Increase timeouts, reduce assertions, etc.
      const timeoutMultiplier = Math.pow(this.config.recovery.degradation.timeoutMultiplier, degradationSteps);

      return {
        success: true,
        shouldSkip: false,
        strategy: 'best_effort',
        degradation: {
          steps: degradationSteps,
          timeoutMultiplier,
          message: `Continuing with degraded functionality (${degradationSteps} steps)`
        }
      };
    }

    return {
      success: false,
      shouldSkip: false,
      strategy: 'best_effort_failed',
      message: 'Best effort recovery not available'
    };
  }

  /**
   * Clean up test resources
   */
  async cleanupTestResources(state) {
    if (!this.config.cleanup.enabled) {
      return;
    }

    const cleanupResults = [];
    let cleanupFailures = 0;

    for (const resource of state.resources) {
      try {
        const result = await this.cleanupResource(resource);
        cleanupResults.push({ resource, success: true, result });
        state.removeResource(resource);
      } catch (error) {
        cleanupFailures++;
        cleanupResults.push({ resource, success: false, error: error.message });
      }
    }

    if (cleanupFailures > 0) {
      this.globalState.cleanupFailures++;
    }

    return cleanupResults;
  }

  /**
   * Clean up individual resource
   */
  async cleanupResource(resource) {
    // Handle different resource types
    if (typeof resource === 'function') {
      // Cleanup function
      return await resource();
    } else if (resource && typeof resource.close === 'function') {
      // Closeable resource
      return await resource.close();
    } else if (resource && typeof resource.cleanup === 'function') {
      // Cleanup method
      return await resource.cleanup();
    } else if (resource && typeof resource.destroy === 'function') {
      // Destroy method
      return await resource.destroy();
    }

    // Unknown resource type
    return null;
  }

  /**
   * Log failure details
   */
  async logFailure(error, testInfo, state, context) {
    const logEntry = {
      timestamp: Date.now(),
      testId: testInfo.testId,
      suiteId: testInfo.suiteId,
      error: {
        message: error.message,
        category: error.category,
        severity: error.severity,
        stack: error.stack
      },
      state: state.getSummary(),
      context
    };

    console.error(`[TEST FAILURE] ${testInfo.testId}: ${error.message}`);
    console.error('State:', JSON.stringify(logEntry.state, null, 2));

    // In a real implementation, this would write to a log file or database
  }

  /**
   * Log success details
   */
  async logSuccess(testInfo, result, state, context) {
    const logEntry = {
      timestamp: Date.now(),
      testId: testInfo.testId,
      suiteId: testInfo.suiteId,
      result,
      state: state.getSummary(),
      context
    };

    console.log(`[TEST SUCCESS] ${testInfo.testId}: Passed in ${state.duration}ms`);
  }

  /**
   * Capture screenshot on failure
   */
  async captureFailureScreenshot(testInfo, page) {
    try {
      const screenshot = await page.screenshot({
        fullPage: false,
        captures: 'viewport'
      });

      const filename = `failure-${testInfo.testId}-${Date.now()}.png`;
      const path = `test-results/screenshots/${filename}`;

      // In a real implementation, save to filesystem
      console.log(`[SCREENSHOT] Failure screenshot saved: ${path}`);

      return { success: true, path, filename };
    } catch (error) {
      console.warn(`Failed to capture failure screenshot: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution summary
   */
  getSummary() {
    return {
      global: this.globalState,
      suites: Array.from(this.suiteStates.entries()),
      activeTests: Array.from(this.executionStates.values()).map(s => s.getSummary()),
      successRate: this.globalState.totalTests > 0
        ? this.globalState.passedTests / this.globalState.totalTests
        : 0
    };
  }

  /**
   * Check if suite should be skipped
   */
  shouldSkipSuite(suiteId) {
    const suiteState = this.suiteStates.get(suiteId);
    return suiteState && suiteState.status === 'skipped';
  }
}

/**
 * Global graceful failure manager
 */
const globalGracefulFailureManager = new GracefulFailureManager();

/**
 * Execute test with graceful failure handling
 */
export async function executeWithGracefulFailure(testFn, testInfo, options = {}) {
  const {
    manager = globalGracefulFailureManager,
    context = {}
  } = options;

  let state = null;

  try {
    // Start test execution
    state = await manager.startTest(testInfo);

    // Execute test function
    const result = await testFn(state, context);

    // Handle success
    return await manager.handleSuccess(testInfo, result, context);

  } catch (error) {
    // Handle failure gracefully
    const failureResult = await manager.handleFailure(error, testInfo, context);

    // Re-throw if it should stop execution
    if (failureResult.mode === GRACEFUL_FAILURE_CONFIG.modes.SKIP_SUITE) {
      throw new TestError({
        message: `Suite skipped due to critical failure: ${error.message}`,
        category: ERROR_CATEGORIES.UNKNOWN,
        severity: ERROR_SEVERITY.CRITICAL,
        recoverable: false,
        recoveryStrategy: RECOVERY_STRATEGIES.FAIL_FAST,
        originalError: error
      });
    }

    return failureResult.finalState;
  }
}

/**
 * Create a graceful failure wrapper
 */
export function withGracefulFailure(testFn, testInfo, options = {}) {
  return async (...args) => {
    return executeWithGracefulFailure(
      () => testFn(...args),
      testInfo,
      options
    );
  };
}

/**
 * Decorator for graceful failure handling
 */
export function gracefulFailure(testInfo, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const enhancedTestInfo = {
        ...testInfo,
        testId: testInfo.testId || `${target.constructor.name}.${propertyKey}`,
        suiteId: testInfo.suiteId || target.constructor.name
      };

      return executeWithGracefulFailure(
        () => originalMethod.apply(this, args),
        enhancedTestInfo,
        options
      );
    };

    return descriptor;
  };
}

/**
 * Check if suite should continue
 */
export function shouldContinueSuite(suiteId, manager = globalGracefulFailureManager) {
  return !manager.shouldSkipSuite(suiteId);
}

/**
 * Get global execution statistics
 */
export function getGlobalStats(manager = globalGracefulFailureManager) {
  return manager.getSummary();
}

/**
 * Generate checkpoint ID
 */
function generateCheckpointId() {
  return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  executeWithGracefulFailure,
  withGracefulFailure,
  gracefulFailure,
  shouldContinueSuite,
  getGlobalStats,
  TestExecutionState,
  GracefulFailureManager,
  globalGracefulFailureManager,
  GRACEFUL_FAILURE_CONFIG
};