/**
 * Test Execution Monitor and Timeout Manager
 *
 * Provides comprehensive monitoring of test execution with timeout handling,
 * performance tracking, and graceful failure modes for Chrome extension UI testing.
 * Ensures reliable test execution with proper resource management and detailed
 * status reporting.
 *
 * Features:
 * - Real-time test execution monitoring
 * - Configurable timeout management per test type
 * - Performance tracking and benchmarking
 * - Resource usage monitoring
 * - Graceful timeout handling with cleanup
 * - Status reporting and event emission
 * - Memory leak detection and prevention
 * - Test state management and recovery
 */

const EventEmitter = require('events');

class TestExecutionMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      defaultTimeout: 30000,
      checkInterval: 1000,
      maxRetries: 3,
      enablePerformanceTracking: true,
      enableMemoryMonitoring: true,
      memoryLimit: 100 * 1024 * 1024, // 100MB
      ...options
    };

    this.activeTests = new Map();
    this.completedTests = new Map();
    this.performanceMetrics = new Map();
    this.memorySnapshots = [];
    this.isMonitoring = false;
    this.monitorInterval = null;

    this.setupDefaultTimeouts();
  }

  /**
   * Setup default timeouts for different test types
   */
  setupDefaultTimeouts() {
    this.timeouts = {
      visual: 15000,
      accessibility: 30000,
      interaction: 10000,
      performance: 45000,
      api: 20000,
      unit: 5000,
      integration: 25000,
      e2e: 60000
    };
  }

  /**
   * Start monitoring a test execution
   */
  startMonitoring(testId, testConfig, testType = 'default') {
    const timeout = this.getTimeoutForTestType(testType);
    const startTime = Date.now();

    const testMonitor = {
      id: testId,
      type: testType,
      config: testConfig,
      startTime,
      timeout,
      deadline: startTime + timeout,
      status: 'running',
      retries: 0,
      warnings: [],
      performanceMetrics: {
        memoryUsage: [],
        cpuUsage: [],
        executionTime: 0
      }
    };

    this.activeTests.set(testId, testMonitor);
    this.emit('testStarted', testMonitor);

    // Start timeout timer
    const timeoutTimer = setTimeout(() => {
      this.handleTimeout(testId);
    }, timeout);

    testMonitor.timeoutTimer = timeoutTimer;

    // Start performance monitoring if enabled
    if (this.options.enablePerformanceTracking) {
      this.startPerformanceMonitoring(testId);
    }

    return testMonitor;
  }

  /**
   * Get timeout for specific test type
   */
  getTimeoutForTestType(testType) {
    return this.timeouts[testType] || this.options.defaultTimeout;
  }

  /**
   * Start performance monitoring for a test
   */
  startPerformanceMonitoring(testId) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    const performanceInterval = setInterval(() => {
      if (!this.activeTests.has(testId)) {
        clearInterval(performanceInterval);
        return;
      }

      const metrics = this.collectPerformanceMetrics();
      testMonitor.performanceMetrics.memoryUsage.push(metrics.memoryUsage);
      testMonitor.performanceMetrics.cpuUsage.push(metrics.cpuUsage);

      // Check for memory leaks
      if (this.options.enableMemoryMonitoring) {
        this.checkForMemoryIssues(testId, metrics);
      }

      // Check performance thresholds
      this.checkPerformanceThresholds(testId, metrics);

    }, this.options.checkInterval);

    testMonitor.performanceInterval = performanceInterval;
  }

  /**
   * Collect current performance metrics
   */
  collectPerformanceMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: Date.now(),
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percentage: this.calculateCpuPercentage(cpuUsage)
      }
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  calculateCpuPercentage(cpuUsage) {
    // Simplified CPU percentage calculation
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    const elapsedMs = 1000; // check interval
    return Math.min((totalCpuTime / (elapsedMs * 1000)) * 100, 100);
  }

  /**
   * Check for memory issues
   */
  checkForMemoryIssues(testId, metrics) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    // Check memory limit
    if (metrics.memoryUsage.heapUsed > this.options.memoryLimit) {
      const warning = {
        type: 'memory_limit_exceeded',
        message: `Memory usage (${this.formatBytes(metrics.memoryUsage.heapUsed)}) exceeds limit (${this.formatBytes(this.options.memoryLimit)})`,
        timestamp: Date.now(),
        severity: 'critical'
      };

      testMonitor.warnings.push(warning);
      this.emit('memoryWarning', { testId, warning });

      // Force cleanup if memory is critically high
      if (metrics.memoryUsage.heapUsed > this.options.memoryLimit * 1.5) {
        this.forceCleanup(testId, 'Critical memory limit exceeded');
      }
    }

    // Check for memory leaks (gradual increase)
    const snapshots = testMonitor.performanceMetrics.memoryUsage;
    if (snapshots.length > 5) {
      const recent = snapshots.slice(-5);
      const trend = this.calculateMemoryTrend(recent);

      if (trend > 0.1) { // 10% growth trend
        const warning = {
          type: 'memory_leak_detected',
          message: `Memory leak detected: ${Math.round(trend * 100)}% growth trend`,
          timestamp: Date.now(),
          severity: 'warning'
        };

        testMonitor.warnings.push(warning);
        this.emit('memoryLeakDetected', { testId, warning });
      }
    }
  }

  /**
   * Calculate memory growth trend
   */
  calculateMemoryTrend(snapshots) {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0].heapUsed;
    const last = snapshots[snapshots.length - 1].heapUsed;

    return (last - first) / first;
  }

  /**
   * Check performance thresholds
   */
  checkPerformanceThresholds(testId, metrics) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    // Check CPU usage
    if (metrics.cpuUsage.percentage > 90) {
      const warning = {
        type: 'high_cpu_usage',
        message: `High CPU usage: ${Math.round(metrics.cpuUsage.percentage)}%`,
        timestamp: Date.now(),
        severity: 'warning'
      };

      testMonitor.warnings.push(warning);
      this.emit('cpuWarning', { testId, warning });
    }

    // Check memory percentage
    if (metrics.memoryUsage.percentage > 90) {
      const warning = {
        type: 'high_memory_percentage',
        message: `High memory percentage: ${Math.round(metrics.memoryUsage.percentage)}%`,
        timestamp: Date.now(),
        severity: 'warning'
      };

      testMonitor.warnings.push(warning);
      this.emit('memoryWarning', { testId, warning });
    }
  }

  /**
   * Handle test timeout
   */
  async handleTimeout(testId) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    testMonitor.status = 'timeout';
    testMonitor.endTime = Date.now();
    testMonitor.executionTime = testMonitor.endTime - testMonitor.startTime;

    // Cleanup resources
    this.cleanupTestResources(testId);

    // Check if retry is possible
    if (testMonitor.retries < this.options.maxRetries) {
      testMonitor.retries++;
      testMonitor.status = 'retrying';

      this.emit('testRetry', {
        testId,
        retryCount: testMonitor.retries,
        maxRetries: this.options.maxRetries
      });

      // Schedule retry with exponential backoff
      const backoffDelay = Math.min(1000 * Math.pow(2, testMonitor.retries - 1), 10000);

      setTimeout(() => {
        this.retryTest(testId);
      }, backoffDelay);
    } else {
      // Final timeout failure
      testMonitor.status = 'failed';
      const error = {
        type: 'timeout',
        message: `Test timed out after ${testMonitor.timeout}ms (${testMonitor.retries} retries attempted)`,
        timestamp: Date.now(),
        executionTime: testMonitor.executionTime
      };

      this.emit('testTimeout', { testId, error, testMonitor });
      this.moveToCompleted(testId);
    }
  }

  /**
   * Retry a failed test
   */
  retryTest(testId) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    // Reset monitor state
    testMonitor.startTime = Date.now();
    testMonitor.deadline = testMonitor.startTime + testMonitor.timeout;
    testMonitor.status = 'running';
    testMonitor.warnings = [];
    testMonitor.performanceMetrics = {
      memoryUsage: [],
      cpuUsage: [],
      executionTime: 0
    };

    // Setup new timeout timer
    testMonitor.timeoutTimer = setTimeout(() => {
      this.handleTimeout(testId);
    }, testMonitor.timeout);

    // Restart performance monitoring
    if (this.options.enablePerformanceTracking) {
      this.startPerformanceMonitoring(testId);
    }

    this.emit('testRetrying', testMonitor);
  }

  /**
   * Complete a test successfully
   */
  completeTest(testId, result = {}) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    testMonitor.status = 'completed';
    testMonitor.endTime = Date.now();
    testMonitor.executionTime = testMonitor.endTime - testMonitor.startTime;
    testMonitor.result = result;

    this.cleanupTestResources(testId);
    this.moveToCompleted(testId);

    this.emit('testCompleted', { testId, testMonitor, result });
  }

  /**
   * Fail a test with error
   */
  failTest(testId, error) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    testMonitor.status = 'failed';
    testMonitor.endTime = Date.now();
    testMonitor.executionTime = testMonitor.endTime - testMonitor.startTime;
    testMonitor.error = error;

    this.cleanupTestResources(testId);
    this.moveToCompleted(testId);

    this.emit('testFailed', { testId, error, testMonitor });
  }

  /**
   * Cleanup test resources
   */
  cleanupTestResources(testId) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    // Clear timeout timer
    if (testMonitor.timeoutTimer) {
      clearTimeout(testMonitor.timeoutTimer);
      testMonitor.timeoutTimer = null;
    }

    // Clear performance monitoring interval
    if (testMonitor.performanceInterval) {
      clearInterval(testMonitor.performanceInterval);
      testMonitor.performanceInterval = null;
    }
  }

  /**
   * Move test to completed
   */
  moveToCompleted(testId) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    this.activeTests.delete(testId);
    this.completedTests.set(testId, testMonitor);

    // Update performance metrics
    if (testMonitor.executionTime > 0) {
      this.performanceMetrics.set(testId, {
        type: testMonitor.type,
        executionTime: testMonitor.executionTime,
        memoryPeak: this.getMemoryPeak(testMonitor.performanceMetrics.memoryUsage),
        cpuPeak: this.getCpuPeak(testMonitor.performanceMetrics.cpuUsage),
        warnings: testMonitor.warnings.length,
        retries: testMonitor.retries
      });
    }
  }

  /**
   * Get memory peak from metrics
   */
  getMemoryPeak(memoryMetrics) {
    if (!memoryMetrics || memoryMetrics.length === 0) return 0;
    return Math.max(...memoryMetrics.map(m => m.heapUsed));
  }

  /**
   * Get CPU peak from metrics
   */
  getCpuPeak(cpuMetrics) {
    if (!cpuMetrics || cpuMetrics.length === 0) return 0;
    return Math.max(...cpuMetrics.map(c => c.percentage));
  }

  /**
   * Force cleanup of a test
   */
  forceCleanup(testId, reason) {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    this.cleanupTestResources(testId);
    this.activeTests.delete(testId);

    const error = {
      type: 'force_cleanup',
      message: reason,
      timestamp: Date.now()
    };

    this.emit('testForceCleanup', { testId, error, testMonitor });
  }

  /**
   * Cancel a running test
   */
  cancelTest(testId, reason = 'Test cancelled by user') {
    const testMonitor = this.activeTests.get(testId);
    if (!testMonitor) return;

    testMonitor.status = 'cancelled';
    testMonitor.endTime = Date.now();
    testMonitor.executionTime = testMonitor.endTime - testMonitor.startTime;

    this.cleanupTestResources(testId);
    this.moveToCompleted(testId);

    this.emit('testCancelled', { testId, reason, testMonitor });
  }

  /**
   * Get current status of all active tests
   */
  getActiveTestsStatus() {
    const status = {
      active: this.activeTests.size,
      completed: this.completedTests.size,
      tests: []
    };

    this.activeTests.forEach((monitor, testId) => {
      const elapsed = Date.now() - monitor.startTime;
      const remaining = Math.max(0, monitor.deadline - Date.now());

      status.tests.push({
        id: testId,
        type: monitor.type,
        status: monitor.status,
        elapsed,
        remaining,
        progress: Math.min((elapsed / monitor.timeout) * 100, 100),
        warnings: monitor.warnings.length,
        retries: monitor.retries
      });
    });

    return status;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      totalTests: this.completedTests.size,
      averageExecutionTime: 0,
      memoryPeak: 0,
      cpuPeak: 0,
      totalWarnings: 0,
      totalRetries: 0,
      byType: {}
    };

    let totalExecutionTime = 0;
    let totalMemory = 0;
    let totalCpu = 0;
    let totalWarnings = 0;
    let totalRetries = 0;

    this.performanceMetrics.forEach((metrics, testId) => {
      totalExecutionTime += metrics.executionTime;
      totalMemory += metrics.memoryPeak;
      totalCpu += metrics.cpuPeak;
      totalWarnings += metrics.warnings;
      totalRetries += metrics.retries;

      if (!summary.byType[metrics.type]) {
        summary.byType[metrics.type] = {
          count: 0,
          totalTime: 0,
          avgTime: 0
        };
      }

      summary.byType[metrics.type].count++;
      summary.byType[metrics.type].totalTime += metrics.executionTime;
    });

    summary.averageExecutionTime = this.completedTests.size > 0 ?
      totalExecutionTime / this.completedTests.size : 0;
    summary.memoryPeak = totalMemory;
    summary.cpuPeak = totalCpu;
    summary.totalWarnings = totalWarnings;
    summary.totalRetries = totalRetries;

    // Calculate averages by type
    Object.keys(summary.byType).forEach(type => {
      const typeData = summary.byType[type];
      typeData.avgTime = typeData.count > 0 ?
        typeData.totalTime / typeData.count : 0;
    });

    return summary;
  }

  /**
   * Get detailed test report
   */
  getTestReport(testId) {
    const testMonitor = this.completedTests.get(testId) || this.activeTests.get(testId);
    if (!testMonitor) return null;

    return {
      id: testId,
      type: testMonitor.type,
      status: testMonitor.status,
      startTime: testMonitor.startTime,
      endTime: testMonitor.endTime,
      executionTime: testMonitor.executionTime,
      timeout: testMonitor.timeout,
      retries: testMonitor.retries,
      warnings: testMonitor.warnings,
      error: testMonitor.error,
      result: testMonitor.result,
      performanceMetrics: testMonitor.performanceMetrics,
      config: testMonitor.config
    };
  }

  /**
   * Start global monitoring
   */
  startGlobalMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.globalHealthCheck();
    }, this.options.checkInterval);

    this.emit('monitoringStarted');
  }

  /**
   * Stop global monitoring
   */
  stopGlobalMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.emit('monitoringStopped');
  }

  /**
   * Global health check
   */
  globalHealthCheck() {
    const health = {
      timestamp: Date.now(),
      activeTests: this.activeTests.size,
      totalMemory: process.memoryUsage().heapUsed,
      uptime: process.uptime(),
      isHealthy: true,
      issues: []
    };

    // Check overall memory usage
    if (health.totalMemory > this.options.memoryLimit * 0.8) {
      health.isHealthy = false;
      health.issues.push({
        type: 'high_memory',
        message: `System memory usage (${this.formatBytes(health.totalMemory)}) approaching limit`
      });
    }

    // Check for stuck tests
    this.activeTests.forEach((monitor, testId) => {
      const elapsed = Date.now() - monitor.startTime;
      if (elapsed > monitor.timeout * 2) {
        health.isHealthy = false;
        health.issues.push({
          type: 'stuck_test',
          testId,
          message: `Test ${testId} appears to be stuck (${this.formatDuration(elapsed)})`
        });
      }
    });

    this.emit('healthCheck', health);
    return health;
  }

  /**
   * Format bytes for human reading
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration for human reading
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.options = { ...this.options, ...newConfig };

    // Update timeouts if provided
    if (newConfig.timeouts) {
      this.timeouts = { ...this.timeouts, ...newConfig.timeouts };
    }

    this.emit('configUpdated', this.options);
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    // Cancel all active tests
    this.activeTests.forEach((monitor, testId) => {
      this.cancelTest(testId, 'System cleanup');
    });

    // Stop global monitoring
    this.stopGlobalMonitoring();

    // Clear stored data
    this.activeTests.clear();
    this.completedTests.clear();
    this.performanceMetrics.clear();
    this.memorySnapshots = [];

    this.emit('cleanupComplete');
  }
}

/**
 * Create singleton instance for easy import
 */
const testExecutionMonitor = new TestExecutionMonitor();

/**
 * Export utilities for different use cases
 */
module.exports = {
  TestExecutionMonitor,
  testExecutionMonitor,

  /**
   * Quick access methods for common operations
   */
  startMonitoring: (testId, testConfig, testType) =>
    testExecutionMonitor.startMonitoring(testId, testConfig, testType),

  completeTest: (testId, result) =>
    testExecutionMonitor.completeTest(testId, result),

  failTest: (testId, error) =>
    testExecutionMonitor.failTest(testId, error),

  cancelTest: (testId, reason) =>
    testExecutionMonitor.cancelTest(testId, reason),

  /**
   * Status and reporting methods
   */
  getActiveTestsStatus: () =>
    testExecutionMonitor.getActiveTestsStatus(),

  getPerformanceSummary: () =>
    testExecutionMonitor.getPerformanceSummary(),

  getTestReport: (testId) =>
    testExecutionMonitor.getTestReport(testId),

  /**
   * Control methods
   */
  startGlobalMonitoring: () =>
    testExecutionMonitor.startGlobalMonitoring(),

  stopGlobalMonitoring: () =>
    testExecutionMonitor.stopGlobalMonitoring(),

  updateConfig: (config) =>
    testExecutionMonitor.updateConfig(config),

  cleanup: () =>
    testExecutionMonitor.cleanup()
};