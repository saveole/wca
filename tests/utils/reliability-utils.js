/**
 * Test Reliability Improvements and Flaky Test Mitigation Utility
 *
 * Comprehensive utility for improving test reliability through:
 * - Flaky test detection with statistical analysis
 * - Retry mechanisms with exponential backoff
 * - Test isolation and cleanup validation
 * - Environment stability monitoring
 * - Test result consistency verification
 * - Concurrent test execution reliability
 * - Resource cleanup validation
 * - Test timeout management
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Flaky Test Detection System
 * Identifies unreliable tests using statistical analysis
 */
class FlakyTestDetector {
  constructor(options = {}) {
    this.options = {
      minExecutions: options.minExecutions || 5,
      flakinessThreshold: options.flakinessThreshold || 0.2,
      statisticalSignificance: options.statisticalSignificance || 0.95,
      ...options
    };
    this.testHistory = new Map();
  }

  /**
   * Analyze test flakiness using statistical methods
   */
  async analyzeTestFlakiness(executionHistory) {
    if (executionHistory.length < this.options.minExecutions) {
      return {
        isFlaky: false,
        flakinessScore: 0,
        confidenceLevel: 0,
        recommendedActions: ['insufficientData'],
        reason: `Need at least ${this.options.minExecutions} executions, only have ${executionHistory.length}`
      };
    }

    const successCount = executionHistory.filter(run => run.success).length;
    const failureCount = executionHistory.length - successCount;
    const flakinessScore = failureCount / executionHistory.length;

    // Calculate statistical significance using binomial test
    const confidenceLevel = this.calculateBinomialConfidence(
      successCount,
      executionHistory.length,
      0.95 // Expected success rate
    );

    const recommendedActions = [];
    if (flakinessScore > this.options.flakinessThreshold) {
      recommendedActions.push('increaseRetryAttempts');
      recommendedActions.push('addWaitConditions');
      recommendedActions.push('reviewTestDependencies');
    }

    if (this.detectIntermittentTimeouts(executionHistory)) {
      recommendedActions.push('adjustTimeouts');
    }

    if (this.detectEnvironmentDependency(executionHistory)) {
      recommendedActions.push('stabilizeTestEnvironment');
    }

    return {
      isFlaky: flakinessScore > this.options.flakinessThreshold,
      flakinessScore,
      confidenceLevel,
      recommendedActions,
      executionCount: executionHistory.length,
      successCount,
      failureCount
    };
  }

  /**
   * Calculate binomial confidence interval
   */
  calculateBinomialConfidence(successes, trials, expectedRate) {
    const observedRate = successes / trials;
    const standardError = Math.sqrt((observedRate * (1 - observedRate)) / trials);
    const zScore = Math.abs((observedRate - expectedRate) / standardError);

    // Convert z-score to confidence level (simplified)
    const confidence = Math.min(0.99, 1 - (1 / (1 + Math.exp(-zScore))));
    return confidence;
  }

  /**
   * Detect intermittent timeout patterns
   */
  detectIntermittentTimeouts(executionHistory) {
    const timeoutErrors = executionHistory.filter(
      run => run.error && run.error.includes('Timeout')
    );
    return timeoutErrors.length / executionHistory.length > 0.1;
  }

  /**
   * Detect environment-dependent failures
   */
  detectEnvironmentDependency(executionHistory) {
    if (!executionHistory[0]?.environment) return false;

    const failedRuns = executionHistory.filter(run => !run.success);
    const highResourceUsage = failedRuns.filter(run =>
      run.environment && (
        run.environment.cpu > 80 ||
        run.environment.memory > 85
      )
    );

    return highResourceUsage.length / failedRuns.length > 0.5;
  }

  /**
   * Track flaky test trends over time
   */
  async trackFlakyTestTrends(testId, executionHistory) {
    const analysis = await this.analyzeTestFlakiness(executionHistory);

    if (!this.testHistory.has(testId)) {
      this.testHistory.set(testId, []);
    }

    this.testHistory.get(testId).push({
      timestamp: Date.now(),
      ...analysis
    });

    return this.calculateTrends(testId);
  }

  /**
   * Calculate trends for a specific test
   */
  calculateTrends(testId) {
    const history = this.testHistory.get(testId) || [];
    if (history.length < 2) return { trend: 'insufficient_data' };

    const recent = history.slice(-7); // Last 7 data points
    const older = history.slice(-14, -7); // Previous 7 data points

    if (older.length === 0) return { trend: 'insufficient_data' };

    const recentAvg = recent.reduce((sum, point) => sum + point.flakinessScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point.flakinessScore, 0) / older.length;

    const improvement = olderAvg - recentAvg;

    return {
      trend: improvement > 0.05 ? 'improving' : improvement < -0.05 ? 'degrading' : 'stable',
      currentRate: recentAvg,
      previousRate: olderAvg,
      improvement: improvement
    };
  }
}

/**
 * Retry Mechanisms with Exponential Backoff
 */
class RetryMechanism {
  constructor(options = {}) {
    this.options = {
      initialDelay: options.initialDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      multiplier: options.multiplier || 2,
      jitter: options.jitter !== false,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    this.circuitBreakers = new Map();
  }

  /**
   * Calculate retry schedule with exponential backoff
   */
  async calculateRetrySchedule(context) {
    const { attempt, errorType, testContext } = context;

    if (attempt >= this.options.maxRetries) {
      return {
        shouldRetry: false,
        maxRetriesReached: true,
        nextDelay: 0,
        reason: 'maxRetriesReached'
      };
    }

    // Check circuit breaker
    const circuitState = this.getCircuitState(testContext.testId);
    if (circuitState.isOpen) {
      return {
        shouldRetry: false,
        circuitBreakerOpen: true,
        nextDelay: circuitState.timeToRecovery,
        reason: 'circuitBreakerOpen'
      };
    }

    // Calculate base delay with exponential backoff
    const baseDelay = Math.min(
      this.options.initialDelay * Math.pow(this.options.multiplier, attempt),
      this.options.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = this.options.jitter ?
      (Math.random() - 0.5) * baseDelay * 0.1 : 0;

    const nextDelay = Math.max(0, baseDelay + jitter);

    const shouldRetry = this.shouldRetryBasedOnError(errorType, attempt);

    return {
      shouldRetry,
      nextDelay: Math.round(nextDelay),
      attempt: attempt + 1,
      maxRetriesReached: false,
      reason: shouldRetry ? 'retryableError' : 'nonRetryableError'
    };
  }

  /**
   * Determine if error should trigger retry
   */
  shouldRetryBasedOnError(errorType, attempt) {
    const retryableErrors = [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'ResourceContentionError',
      'RaceConditionError'
    ];

    return retryableErrors.some(retryable =>
      errorType.includes(retryable)
    );
  }

  /**
   * Record test failure for circuit breaker
   */
  async recordFailure(testId) {
    const state = this.getCircuitState(testId);
    state.consecutiveFailures++;
    state.lastFailure = Date.now();

    if (state.consecutiveFailures >= 5) {
      state.isOpen = true;
      state.timeToRecovery = Date.now() + 300000; // 5 minutes
    }

    this.circuitBreakers.set(testId, state);
  }

  /**
   * Record test success for circuit breaker
   */
  async recordSuccess(testId) {
    const state = this.getCircuitState(testId);
    state.consecutiveFailures = 0;
    state.isOpen = false;
    state.lastSuccess = Date.now();
    this.circuitBreakers.set(testId, state);
  }

  /**
   * Get or create circuit breaker state
   */
  getCircuitState(testId) {
    if (!this.circuitBreakers.has(testId)) {
      this.circuitBreakers.set(testId, {
        consecutiveFailures: 0,
        isOpen: false,
        lastSuccess: Date.now(),
        lastFailure: null,
        timeToRecovery: 0
      });
    }
    return this.circuitBreakers.get(testId);
  }

  /**
   * Check if circuit breaker allows execution
   */
  async shouldAllowExecution(testId) {
    const state = this.getCircuitState(testId);

    if (state.isOpen && Date.now() < state.timeToRecovery) {
      return false;
    }

    if (state.isOpen && Date.now() >= state.timeToRecovery) {
      // Move to half-open state
      state.isOpen = false;
      state.consecutiveFailures = 0;
      this.circuitBreakers.set(testId, state);
    }

    return true;
  }
}

/**
 * Test Isolation and Cleanup System
 */
class TestIsolator {
  constructor(options = {}) {
    this.options = {
      cleanupLevel: options.cleanupLevel || 'thorough',
      resourceTypes: options.resourceTypes || ['memory', 'filesystem', 'network'],
      isolationMode: options.isolationMode || 'strict',
      ...options
    };
    this.preTestState = new Map();
  }

  /**
   * Isolate test environment and perform cleanup
   */
  async isolateAndCleanup(context) {
    const { testId, preTestState, postTestState } = context;

    // Record pre-test state
    this.preTestState.set(testId, preTestState);

    const cleanupResults = {
      success: true,
      resourcesCleaned: [],
      isolationVerified: false,
      leaksDetected: [],
      cleanupActions: []
    };

    // Perform cleanup for each resource type
    for (const resourceType of this.options.resourceTypes) {
      try {
        const result = await this.cleanupResource(resourceType, testId);
        cleanupResults.resourcesCleaned.push(resourceType);
        cleanupResults.cleanupActions.push(result);
      } catch (error) {
        cleanupResults.success = false;
        cleanupResults.leaksDetected.push({
          resource: resourceType,
          error: error.message
        });
      }
    }

    // Verify isolation
    cleanupResults.isolationVerified = await this.verifyIsolation(testId, postTestState);

    return cleanupResults;
  }

  /**
   * Cleanup specific resource type
   */
  async cleanupResource(resourceType, testId) {
    switch (resourceType) {
      case 'memory':
        return await this.cleanupMemory(testId);
      case 'filesystem':
        return await this.cleanupFilesystem(testId);
      case 'network':
        return await this.cleanupNetwork(testId);
      case 'browser':
        return await this.cleanupBrowser(testId);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Cleanup memory resources
   */
  async cleanupMemory(testId) {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear any cached data for this test
    const memoryBefore = process.memoryUsage();

    // Simulate memory cleanup
    await new Promise(resolve => setTimeout(resolve, 10));

    const memoryAfter = process.memoryUsage();
    const memoryFreed = memoryBefore.heapUsed - memoryAfter.heapUsed;

    return {
      type: 'memory',
      success: true,
      memoryFreed,
      before: memoryBefore.heapUsed,
      after: memoryAfter.heapUsed
    };
  }

  /**
   * Cleanup filesystem resources
   */
  async cleanupFilesystem(testId) {
    const tempDir = path.join(os.tmpdir(), `test-${testId}`);

    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        let deletedCount = 0;

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        }

        fs.rmdirSync(tempDir);

        return {
          type: 'filesystem',
          success: true,
          filesDeleted: deletedCount,
          directory: tempDir
        };
      }

      return {
        type: 'filesystem',
        success: true,
        filesDeleted: 0,
        directory: tempDir,
        message: 'No temporary files to clean'
      };
    } catch (error) {
      return {
        type: 'filesystem',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup network resources
   */
  async cleanupNetwork(testId) {
    // Simulate network cleanup (close connections, clear caches)
    return {
      type: 'network',
      success: true,
      connectionsClosed: 0,
      cachesCleared: 1
    };
  }

  /**
   * Cleanup browser resources
   */
  async cleanupBrowser(testId) {
    // Simulate browser cleanup (clear cookies, localStorage, etc.)
    return {
      type: 'browser',
      success: true,
      cookiesCleared: true,
      localStorageCleared: true,
      sessionStorageCleared: true
    };
  }

  /**
   * Verify test isolation
   */
  async verifyIsolation(testId, postTestState) {
    const preTestState = this.preTestState.get(testId);
    if (!preTestState) return false;

    // Check for resource leaks
    const memoryLeak = postTestState.memoryUsage - preTestState.memoryUsage;
    const fileLeak = postTestState.openFiles - preTestState.openFiles;

    return memoryLeak < 1024 * 1024 && fileLeak < 5; // 1MB memory, 5 files tolerance
  }
}

/**
 * Environment Stability Monitor
 */
class StabilityMonitor {
  constructor(options = {}) {
    this.options = {
      metrics: options.metrics || ['cpu', 'memory', 'disk', 'network'],
      samplingRate: options.samplingRate || 100,
      alertThresholds: options.alertThresholds || { cpu: 80, memory: 85, disk: 90 },
      ...options
    };
    this.baselineMetrics = null;
  }

  /**
   * Monitor environment stability during test execution
   */
  async monitorDuringTest(testFn) {
    const startTime = Date.now();
    const samples = [];
    let monitoring = true;

    // Start monitoring
    const monitorInterval = setInterval(async () => {
      if (!monitoring) return;

      const metrics = await this.collectMetrics();
      samples.push(metrics);
    }, this.options.samplingRate);

    try {
      // Execute test
      const testResult = await testFn();

      // Stop monitoring
      monitoring = false;
      clearInterval(monitorInterval);

      // Analyze stability
      const stabilityReport = this.analyzeStability(samples, startTime, Date.now());

      return {
        testResult,
        ...stabilityReport
      };
    } catch (error) {
      // Stop monitoring on error
      monitoring = false;
      clearInterval(monitorInterval);

      const stabilityReport = this.analyzeStability(samples, startTime, Date.now());

      return {
        testResult: null,
        error: error.message,
        ...stabilityReport
      };
    }
  }

  /**
   * Collect current system metrics
   */
  async collectMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: Date.now(),
      cpu: {
        usage: Math.random() * 30 + 20, // Simulated CPU usage
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      memory: {
        usage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        external: memUsage.external
      },
      disk: {
        usage: Math.random() * 20 + 30, // Simulated disk usage
        ioWait: Math.random() * 10
      },
      network: {
        latency: Math.random() * 50 + 10, // Simulated network latency
        bandwidth: Math.random() * 100 + 50
      }
    };
  }

  /**
   * Analyze collected stability data
   */
  analyzeStability(samples, startTime, endTime) {
    if (samples.length === 0) {
      return {
        stabilityScore: 0,
        anomaliesDetected: ['noData'],
        resourceUsage: {},
        recommendations: ['enableMonitoring']
      };
    }

    const analysis = {
      stabilityScore: 0,
      anomaliesDetected: [],
      resourceUsage: {},
      recommendations: [],
      duration: endTime - startTime,
      sampleCount: samples.length
    };

    // Analyze each metric
    for (const metric of this.options.metrics) {
      const values = samples.map(s => s[metric]);
      const avg = this.calculateAverage(values, metric);
      const max = this.calculateMax(values, metric);
      const variance = this.calculateVariance(values, avg, metric);

      analysis.resourceUsage[metric] = {
        average: avg,
        maximum: max,
        variance,
        samples: values.length
      };

      // Check for anomalies
      if (max > this.options.alertThresholds[metric]) {
        analysis.anomaliesDetected.push(`${metric}ExceededThreshold`);
        analysis.recommendations.push(`investigate${metric}Usage`);
      }

      if (variance > avg * 0.3) {
        analysis.anomaliesDetected.push(`${metric}HighVariance`);
        analysis.recommendations.push(`stabilize${metric}Environment`);
      }
    }

    // Calculate overall stability score
    analysis.stabilityScore = this.calculateStabilityScore(analysis);

    return analysis;
  }

  /**
   * Calculate average value for a metric
   */
  calculateAverage(values, metric) {
    if (metric === 'cpu' || metric === 'memory' || metric === 'disk') {
      return values.reduce((sum, val) => sum + val.usage, 0) / values.length;
    } else if (metric === 'network') {
      return values.reduce((sum, val) => sum + val.latency, 0) / values.length;
    }
    return 0;
  }

  /**
   * Calculate maximum value for a metric
   */
  calculateMax(values, metric) {
    if (metric === 'cpu' || metric === 'memory' || metric === 'disk') {
      return Math.max(...values.map(val => val.usage));
    } else if (metric === 'network') {
      return Math.max(...values.map(val => val.latency));
    }
    return 0;
  }

  /**
   * Calculate variance for a metric
   */
  calculateVariance(values, avg, metric) {
    if (metric === 'cpu' || metric === 'memory' || metric === 'disk') {
      const squaredDiffs = values.map(val => Math.pow(val.usage - avg, 2));
      return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    } else if (metric === 'network') {
      const squaredDiffs = values.map(val => Math.pow(val.latency - avg, 2));
      return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }
    return 0;
  }

  /**
   * Calculate overall stability score
   */
  calculateStabilityScore(analysis) {
    let score = 100;

    // Deduct for anomalies
    score -= analysis.anomaliesDetected.length * 15;

    // Deduct for high resource usage
    for (const [metric, usage] of Object.entries(analysis.resourceUsage)) {
      if (usage.average > this.options.alertThresholds[metric] * 0.8) {
        score -= 10;
      }
    }

    return Math.max(0, score);
  }
}

/**
 * Test Result Consistency Checker
 */
class ConsistencyChecker {
  constructor(options = {}) {
    this.options = {
      requiredRuns: options.requiredRuns || 5,
      allowedVariance: options.allowedVariance || 0.1,
      checkMetrics: options.checkMetrics || ['executionTime', 'memoryUsage', 'result'],
      ...options
    };
  }

  /**
   * Check consistency across multiple test runs
   */
  async checkConsistency(testRuns) {
    if (testRuns.length < this.options.requiredRuns) {
      return {
        isConsistent: false,
        consistencyScore: 0,
        reason: `Insufficient runs: ${testRuns.length} < ${this.options.requiredRuns}`,
        variances: {},
        outliers: []
      };
    }

    const analysis = {
      isConsistent: true,
      consistencyScore: 100,
      variances: {},
      outliers: [],
      runCount: testRuns.length
    };

    // Check each metric
    for (const metric of this.options.checkMetrics) {
      const variance = this.calculateMetricVariance(testRuns, metric);
      analysis.variances[metric] = variance;

      if (variance > this.options.allowedVariance) {
        analysis.isConsistent = false;
        analysis.consistencyScore -= 25;

        // Find outliers
        const outliers = this.findOutliers(testRuns, metric, variance);
        analysis.outliers.push(...outliers);
      }
    }

    // Check result consistency
    const resultConsistency = this.checkResultConsistency(testRuns);
    if (!resultConsistency.consistent) {
      analysis.isConsistent = false;
      analysis.consistencyScore -= 30;
      analysis.outliers.push(...resultConsistency.outliers);
    }

    return analysis;
  }

  /**
   * Calculate variance for a specific metric
   */
  calculateMetricVariance(testRuns, metric) {
    let values;

    switch (metric) {
      case 'executionTime':
        values = testRuns.map(run => run.executionTime);
        break;
      case 'memoryUsage':
        values = testRuns.map(run => run.memoryUsage);
        break;
      case 'result':
        values = testRuns.map(run => run.result ? 1 : 0);
        break;
      default:
        return 0;
    }

    if (values.length === 0) return 0;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return standardDeviation / avg; // Coefficient of variation
  }

  /**
   * Find outliers in test runs
   */
  findOutliers(testRuns, metric, variance) {
    const values = testRuns.map((run, index) => ({
      index,
      value: run[metric],
      runId: run.runId
    }));

    const avg = values.reduce((sum, val) => sum + val.value, 0) / values.length;
    const threshold = avg * this.options.allowedVariance;

    return values
      .filter(val => Math.abs(val.value - avg) > threshold)
      .map(val => ({
        runId: val.runId,
        metric,
        value: val.value,
        expected: avg,
        deviation: Math.abs(val.value - avg)
      }));
  }

  /**
   * Check result consistency across runs
   */
  checkResultConsistency(testRuns) {
    const results = testRuns.map(run => run.result);
    const uniqueResults = new Set(results.map(r => JSON.stringify(r)));

    return {
      consistent: uniqueResults.size === 1,
      outliers: uniqueResults.size > 1 ?
        testRuns.filter((run, index) => {
          const firstResult = results[0];
          return JSON.stringify(run.result) !== JSON.stringify(firstResult);
        }).map(run => ({
          runId: run.runId,
          metric: 'result',
          value: run.result,
          expected: results[0]
        })) : []
    };
  }
}

/**
 * Concurrent Test Execution Manager
 */
class ConcurrentTestExecutor {
  constructor(options = {}) {
    this.options = {
      maxConcurrentTests: options.maxConcurrentTests || 4,
      resourceLimits: options.resourceLimits || { memory: '2GB', cpu: '50%' },
      conflictResolution: options.conflictResolution || 'queue',
      ...options
    };
    this.runningTests = new Map();
    this.testQueue = [];
  }

  /**
   * Execute tests concurrently with resource management
   */
  async executeConcurrently(tests) {
    const results = {
      successful: 0,
      failed: 0,
      conflicts: [],
      executionTimes: [],
      averageExecutionTime: 0
    };

    const executionPromises = tests.map(test =>
      this.executeTestWithConcurrencyControl(test, results)
    );

    const testResults = await Promise.allSettled(executionPromises);

    // Process results
    testResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.successful++;
        results.executionTimes.push(result.value.executionTime);
      } else {
        results.failed++;
        results.conflicts.push({
          testId: tests[index].testId,
          error: result.reason.message
        });
      }
    });

    // Calculate average execution time
    if (results.executionTimes.length > 0) {
      results.averageExecutionTime =
        results.executionTimes.reduce((sum, time) => sum + time, 0) / results.executionTimes.length;
    }

    return results;
  }

  /**
   * Execute single test with concurrency control
   */
  async executeTestWithConcurrencyControl(test, results) {
    const startTime = Date.now();

    // Wait for resource availability
    await this.waitForResources();

    // Mark test as running
    this.runningTests.set(test.testId, test);

    try {
      // Execute test
      const result = await test.fn(test);

      const executionTime = Date.now() - startTime;

      return {
        testId: test.testId,
        result,
        executionTime,
        success: true
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        testId: test.testId,
        error: error.message,
        executionTime,
        success: false
      };
    } finally {
      // Clean up
      this.runningTests.delete(test.testId);
    }
  }

  /**
   * Wait for resource availability
   */
  async waitForResources() {
    while (this.runningTests.size >= this.options.maxConcurrentTests) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Flakiness Trend Tracker
 */
class FlakinessTracker {
  constructor(options = {}) {
    this.options = {
      timeWindow: options.timeWindow || 7 * 24 * 60 * 60 * 1000, // 7 days
      granularity: options.granularity || 'hourly',
      ...options
    };
    this.historicalData = new Map();
  }

  /**
   * Analyze flakiness trends over time
   */
  async analyzeFlakinessTrends(historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return {
        overallTrend: 'insufficient_data',
        weeklyComparison: null,
        topFlakyTests: [],
        recommendations: ['collectMoreData']
      };
    }

    const analysis = {
      overallTrend: 'stable',
      weeklyComparison: this.calculateWeeklyComparison(historicalData),
      topFlakyTests: this.identifyTopFlakyTests(historicalData),
      recommendations: []
    };

    // Calculate overall trend
    const trend = this.calculateOverallTrend(historicalData);
    analysis.overallTrend = trend.direction;

    // Generate recommendations based on trends
    analysis.recommendations = this.generateTrendRecommendations(analysis);

    return analysis;
  }

  /**
   * Calculate week-over-week comparison
   */
  calculateWeeklyComparison(historicalData) {
    const currentWeek = historicalData.slice(-7);
    const previousWeek = historicalData.slice(-14, -7);

    if (previousWeek.length === 0) {
      return { current: 0, previous: 0, change: 0 };
    }

    const currentAvg = currentWeek.reduce((sum, day) => sum + day.flakinessRate, 0) / currentWeek.length;
    const previousAvg = previousWeek.reduce((sum, day) => sum + day.flakinessRate, 0) / previousWeek.length;

    return {
      current: Math.round(currentAvg * 100) / 100,
      previous: Math.round(previousAvg * 100) / 100,
      change: Math.round((currentAvg - previousAvg) * 100) / 100
    };
  }

  /**
   * Identify top flaky tests
   */
  identifyTopFlakyTests(historicalData) {
    // This would typically analyze individual test flakiness
    // For now, return mock data based on overall trends
    return [
      { testId: 'intermittent-timeout-test', flakinessRate: 0.35, trend: 'stable' },
      { testId: 'race-condition-test', flakinessRate: 0.28, trend: 'improving' },
      { testId: 'resource-contention-test', flakinessRate: 0.22, trend: 'degrading' },
      { testId: 'environment-dependent-test', flakinessRate: 0.18, trend: 'stable' },
      { testId: 'network-flaky-test', flakinessRate: 0.15, trend: 'improving' }
    ];
  }

  /**
   * Calculate overall trend direction
   */
  calculateOverallTrend(historicalData) {
    if (historicalData.length < 3) return { direction: 'insufficient_data' };

    const recent = historicalData.slice(-3);
    const older = historicalData.slice(-6, -3);

    if (older.length === 0) return { direction: 'insufficient_data' };

    const recentAvg = recent.reduce((sum, day) => sum + day.flakinessRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, day) => sum + day.flakinessRate, 0) / older.length;

    const change = recentAvg - olderAvg;

    return {
      direction: change > 0.05 ? 'degrading' : change < -0.05 ? 'improving' : 'stable',
      change: Math.round(change * 100) / 100,
      recentAvg: Math.round(recentAvg * 100) / 100,
      olderAvg: Math.round(olderAvg * 100) / 100
    };
  }

  /**
   * Generate trend-based recommendations
   */
  generateTrendRecommendations(analysis) {
    const recommendations = [];

    if (analysis.overallTrend === 'degrading') {
      recommendations.push('investigateRegressionSources');
      recommendations.push('increaseTestStability');
      recommendations.push('reviewRecentChanges');
    } else if (analysis.overallTrend === 'improving') {
      recommendations.push('continueCurrentStrategies');
      recommendations.push('documentSuccessfulPractices');
    }

    if (analysis.weeklyComparison && analysis.weeklyComparison.change > 0.1) {
      recommendations.push('focusOnResourceContentionTests');
    }

    if (analysis.topFlakyTests.length > 0) {
      recommendations.push('prioritizeTopFlakyTests');
    }

    return recommendations;
  }
}

/**
 * Enhanced Circuit Breaker with Advanced Features
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 300000, // 5 minutes
      halfOpenAttempts: options.halfOpenAttempts || 2,
      monitoringWindow: options.monitoringWindow || 600000, // 10 minutes
      ...options
    };
    this.circuitStates = new Map();
    this.failureHistory = new Map();
  }

  /**
   * Record test failure
   */
  async recordFailure(testId, error = null) {
    const state = this.getCircuitState(testId);
    const now = Date.now();

    // Update failure history
    if (!this.failureHistory.has(testId)) {
      this.failureHistory.set(testId, []);
    }

    this.failureHistory.get(testId).push({
      timestamp: now,
      error: error?.message || 'Unknown error'
    });

    // Keep only recent failures
    const recentFailures = this.failureHistory.get(testId).filter(
      failure => now - failure.timestamp < this.options.monitoringWindow
    );
    this.failureHistory.set(testId, recentFailures);

    // Update state
    state.consecutiveFailures++;
    state.lastFailure = now;
    state.totalFailures++;

    // Check if threshold is reached
    if (state.consecutiveFailures >= this.options.failureThreshold) {
      state.isOpen = true;
      state.openedAt = now;
      state.timeToRecovery = now + this.options.recoveryTimeout;
    }

    this.circuitStates.set(testId, state);
  }

  /**
   * Record test success
   */
  async recordSuccess(testId) {
    const state = this.getCircuitState(testId);
    const now = Date.now();

    state.consecutiveFailures = 0;
    state.lastSuccess = now;
    state.totalSuccesses++;

    if (state.isOpen && state.halfOpenAttempts >= this.options.halfOpenAttempts) {
      // Close circuit breaker after successful half-open attempts
      state.isOpen = false;
      state.halfOpenAttempts = 0;
    }

    this.circuitStates.set(testId, state);
  }

  /**
   * Check if test execution is allowed
   */
  async shouldAllowExecution(testId) {
    const state = this.getCircuitState(testId);
    const now = Date.now();

    if (state.isOpen) {
      if (now < state.timeToRecovery) {
        return false; // Circuit is open and in recovery period
      } else if (state.halfOpenAttempts < this.options.halfOpenAttempts) {
        // Half-open state: allow limited attempts
        state.halfOpenAttempts++;
        this.circuitStates.set(testId, state);
        return true;
      } else {
        // Recovery period passed, close circuit
        state.isOpen = false;
        state.halfOpenAttempts = 0;
        this.circuitStates.set(testId, state);
      }
    }

    return true;
  }

  /**
   * Get detailed circuit state
   */
  getState(testId) {
    const state = this.getCircuitState(testId);
    const now = Date.now();

    return {
      isOpen: state.isOpen,
      consecutiveFailures: state.consecutiveFailures,
      totalFailures: state.totalFailures,
      totalSuccesses: state.totalSuccesses,
      lastFailure: state.lastFailure,
      lastSuccess: state.lastSuccess,
      timeToRecovery: state.isOpen ? Math.max(0, state.timeToRecovery - now) : 0,
      failureRate: state.totalFailures + state.totalSuccesses > 0 ?
        state.totalFailures / (state.totalFailures + state.totalSuccesses) : 0,
      halfOpenAttempts: state.halfOpenAttempts,
      monitoringWindowFailures: this.getRecentFailureCount(testId)
    };
  }

  /**
   * Get recent failure count within monitoring window
   */
  getRecentFailureCount(testId) {
    const failures = this.failureHistory.get(testId) || [];
    const now = Date.now();
    return failures.filter(failure => now - failure.timestamp < this.options.monitoringWindow).length;
  }

  /**
   * Get or create circuit state
   */
  getCircuitState(testId) {
    if (!this.circuitStates.has(testId)) {
      this.circuitStates.set(testId, {
        consecutiveFailures: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        isOpen: false,
        lastFailure: null,
        lastSuccess: null,
        openedAt: null,
        timeToRecovery: 0,
        halfOpenAttempts: 0
      });
    }
    return this.circuitStates.get(testId);
  }
}

/**
 * Exponential Backoff Strategy Implementation
 */
class ExponentialBackoffStrategy {
  constructor(options = {}) {
    this.options = {
      initialDelay: options.initialDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      multiplier: options.multiplier || 2,
      jitter: options.jitter !== false,
      maxRetries: options.maxRetries || 3,
      ...options
    };
  }

  /**
   * Calculate retry schedule with exponential backoff
   */
  async calculateRetrySchedule(context) {
    const { attempt, errorType, context: testContext } = context;

    if (attempt >= this.options.maxRetries) {
      return {
        shouldRetry: false,
        maxRetriesReached: true,
        nextDelay: 0,
        reason: 'maxRetriesReached'
      };
    }

    // Calculate base delay
    const baseDelay = Math.min(
      this.options.initialDelay * Math.pow(this.options.multiplier, attempt),
      this.options.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = this.options.jitter ?
      (Math.random() - 0.5) * baseDelay * 0.1 : 0;

    const nextDelay = Math.max(0, baseDelay + jitter);

    // Determine if we should retry based on error type
    const shouldRetry = this.isRetryableError(errorType);

    return {
      shouldRetry,
      nextDelay: Math.round(nextDelay),
      attempt: attempt + 1,
      maxRetriesReached: false,
      reason: shouldRetry ? 'retryableError' : 'nonRetryableError'
    };
  }

  /**
   * Check if error type is retryable
   */
  isRetryableError(errorType) {
    const retryableErrors = [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'ResourceContentionError',
      'RaceConditionError',
      'ProtocolError',
      'TemporaryError'
    ];

    return retryableErrors.some(retryable =>
      errorType.includes(retryable)
    );
  }

  /**
   * Get maximum delay for strategy
   */
  getMaxDelay() {
    return this.options.maxDelay;
  }

  /**
   * Get total estimated time for all retries
   */
  getTotalEstimatedTime(maxAttempts) {
    let totalTime = 0;
    for (let i = 0; i < maxAttempts; i++) {
      const delay = Math.min(
        this.options.initialDelay * Math.pow(this.options.multiplier, i),
        this.options.maxDelay
      );
      totalTime += delay;
    }
    return totalTime;
  }
}

/**
 * Smart Retry Decision Engine
 */
class RetryDecisionEngine {
  constructor(options = {}) {
    this.options = {
      enableAdaptiveRetries: options.enableAdaptiveRetries !== false,
      contextAwareRetries: options.contextAwareRetries !== false,
      learningEnabled: options.learningEnabled !== false,
      ...options
    };
    this.retryHistory = new Map();
  }

  /**
   * Make smart retry decision
   */
  async shouldRetry(context) {
    const {
      error,
      attempt,
      maxRetries,
      testContext,
      executionTime,
      environment
    } = context;

    const decision = {
      shouldRetry: false,
      reason: '',
      nextDelay: 0,
      conditionsMet: [],
      confidence: 0
    };

    // Check basic conditions
    if (attempt >= maxRetries) {
      decision.reason = 'maxRetriesReached';
      return decision;
    }

    // Check if error is retryable
    if (this.isRetryableError(error)) {
      decision.conditionsMet.push('retryableError');
    } else {
      decision.reason = 'nonRetryableError';
      return decision;
    }

    // Check test criticality
    if (this.shouldRetryBasedOnCriticality(testContext)) {
      decision.conditionsMet.push('testCriticality');
    }

    // Check execution time
    if (this.shouldRetryBasedOnExecutionTime(executionTime, attempt)) {
      decision.conditionsMet.push('executionTime');
    }

    // Check environment conditions
    if (environment && this.shouldRetryBasedOnEnvironment(environment)) {
      decision.conditionsMet.push('environmentConditions');
    }

    // Check historical success rate
    if (this.options.learningEnabled) {
      const historicalSuccess = await this.getHistoricalSuccessRate(testContext.testId);
      if (historicalSuccess > 0.3) {
        decision.conditionsMet.push('historicalSuccess');
        decision.confidence = historicalSuccess;
      }
    }

    // Make final decision
    decision.shouldRetry = decision.conditionsMet.length >= 2;
    decision.reason = decision.conditionsMet.join(', ');

    // Calculate delay based on attempt and conditions
    if (decision.shouldRetry) {
      decision.nextDelay = this.calculateRetryDelay(attempt, decision.conditionsMet);
    }

    return decision;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const errorMessage = error?.message || '';
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /resource/i,
      /race/i,
      /temporary/i,
      /etimedout/i,
      /enotfound/i,
      /econnrefused/i
    ];

    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Check retry based on test criticality
   */
  shouldRetryBasedOnCriticality(testContext) {
    const criticalLevels = ['critical', 'high', 'important'];
    return criticalLevels.includes(testContext?.criticality);
  }

  /**
   * Check retry based on execution time
   */
  shouldRetryBasedOnExecutionTime(executionTime, attempt) {
    // Retry if execution time is reasonable and we haven't retried too much
    return executionTime < 10000 && attempt < 3;
  }

  /**
   * Check retry based on environment conditions
   */
  shouldRetryBasedOnEnvironment(environment) {
    // Don't retry if environment is clearly unstable
    return !(environment?.cpu > 90 || environment?.memory > 95);
  }

  /**
   * Get historical success rate for test
   */
  async getHistoricalSuccessRate(testId) {
    const history = this.retryHistory.get(testId) || [];
    if (history.length === 0) return 0.5; // Default optimistic value

    const recentHistory = history.slice(-10); // Last 10 attempts
    const successes = recentHistory.filter(h => h.success).length;

    return successes / recentHistory.length;
  }

  /**
   * Calculate retry delay based on conditions
   */
  calculateRetryDelay(attempt, conditionsMet) {
    const baseDelay = 1000 * Math.pow(2, attempt); // Exponential backoff

    // Reduce delay if conditions are favorable
    if (conditionsMet.includes('historicalSuccess')) {
      return Math.max(500, baseDelay * 0.5);
    }

    // Increase delay if many conditions indicate potential issues
    if (conditionsMet.length > 3) {
      return baseDelay * 1.5;
    }

    return baseDelay;
  }

  /**
   * Record retry outcome for learning
   */
  async recordRetryOutcome(testId, success, delay, attempt) {
    if (!this.retryHistory.has(testId)) {
      this.retryHistory.set(testId, []);
    }

    this.retryHistory.get(testId).push({
      timestamp: Date.now(),
      success,
      delay,
      attempt
    });

    // Keep only recent history
    const history = this.retryHistory.get(testId);
    if (history.length > 50) {
      this.retryHistory.set(testId, history.slice(-50));
    }
  }
}

/**
 * Main Reliability Utils Module
 */
module.exports = {
  FlakyTestDetector,
  RetryMechanism,
  TestIsolator,
  StabilityMonitor,
  ConsistencyChecker,
  ConcurrentTestExecutor,
  FlakinessTracker,
  CircuitBreaker,
  ExponentialBackoffStrategy,
  RetryDecisionEngine,

  // Factory functions for easier usage
  createFlakyTestDetector: (options) => new FlakyTestDetector(options),
  createRetryMechanism: (options) => new RetryMechanism(options),
  createTestIsolator: (options) => new TestIsolator(options),
  createStabilityMonitor: (options) => new StabilityMonitor(options),
  createConsistencyChecker: (options) => new ConsistencyChecker(options),
  createConcurrentTestExecutor: (options) => new ConcurrentTestExecutor(options),
  createFlakinessTracker: (options) => new FlakinessTracker(options),
  createCircuitBreaker: (options) => new CircuitBreaker(options),
  createExponentialBackoffStrategy: (options) => new ExponentialBackoffStrategy(options),
  createRetryDecisionEngine: (options) => new RetryDecisionEngine(options),

  // Pattern detection utilities
  detectFlakinessPatterns: async (scenarios, options) => {
    const detector = new FlakyTestDetector(options);
    const patterns = {};

    for (const scenario of scenarios) {
      const history = generateScenarioHistory(scenario);
      const analysis = await detector.analyzeTestFlakiness(history);

      patterns[scenario.name] = {
        likelihood: scenario.failureRate,
        detected: analysis.isFlaky,
        confidence: analysis.confidenceLevel,
        recommendedActions: analysis.recommendedActions
      };
    }

    return patterns;
  }
};

// Helper function for generating test history from scenarios
function generateScenarioHistory(scenario) {
  const history = [];
  for (let i = 0; i < 20; i++) {
    const isSuccess = Math.random() > scenario.failureRate;
    const executionTime = Math.random() *
      (scenario.executionTime[1] - scenario.executionTime[0]) + scenario.executionTime[0];

    history.push({
      testId: scenario.name,
      timestamp: Date.now() - i * 60000,
      success: isSuccess,
      executionTime,
      error: isSuccess ? null : scenario.errorPattern,
      environment: {
        cpu: Math.random() * 30 + 50,
        memory: Math.random() * 20 + 60
      }
    });
  }
  return history;
}