/**
 * Memory Usage Validation Test for Large Test Suites
 *
 * Validates memory usage patterns and efficiency for large test suites.
 * Ensures memory stays within acceptable limits and identifies memory leaks
 * or inefficient memory usage patterns during test execution.
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const { MemoryManager } = require('../utils/memory-manager');
const { ParallelExecutor } = require('../utils/parallel-executor');
const { ScreenshotCache } = require('../utils/screenshot-cache');
const path = require('path');
const fs = require('fs');
const { Worker, isMainThread } = require('worker_threads');

/**
 * Memory Validation Test Suite
 *
 * Tests memory usage patterns across different scenarios:
 * - Memory leak detection during test execution
 * - Memory efficiency with large datasets
 * - Memory reclamation and garbage collection
 * - Memory usage patterns under load
 * - Resource pooling effectiveness
 */
class MemoryValidationTest {
  constructor() {
    // Memory thresholds and limits
    this.memoryThresholds = {
      warning: 100 * 1024 * 1024, // 100MB
      critical: 200 * 1024 * 1024, // 200MB
      emergency: 500 * 1024 * 1024, // 500MB
      perTestLimit: 10 * 1024 * 1024, // 10MB per test
      leakThreshold: 0.1, // 10% growth rate
      cleanupEfficiency: 0.8 // 80% cleanup efficiency target
    };

    this.results = [];
    this.memoryManager = new MemoryManager({
      enableAggressiveCleanup: true,
      enableLeakDetection: true,
      enableMemorySwapping: true,
      warningThreshold: 0.7,
      criticalThreshold: 0.85
    });

    // Test configuration
    this.testConfig = {
      iterations: 20,
      largeSuiteSize: 1000,
      concurrentTests: 10,
      testMemoryPressure: true,
      monitoringInterval: 1000, // 1 second
      stabilizationPeriod: 5000 // 5 seconds
    };

    // Performance monitoring setup
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.results.push({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
          type: entry.entryType,
          details: entry.detail || {}
        });
      });
    });

    this.performanceObserver.observe({
      entryTypes: ['measure', 'function']
    });
  }

  /**
   * Run all memory validation tests
   */
  async runAllTests() {
    console.log('Starting Memory Usage Validation Tests...');
    console.log(`Memory thresholds:`);
    console.log(`  Warning: ${this.formatBytes(this.memoryThresholds.warning)}`);
    console.log(`  Critical: ${this.formatBytes(this.memoryThresholds.critical)}`);
    console.log(`  Emergency: ${this.formatBytes(this.memoryThresholds.emergency)}`);
    console.log('');

    const testResults = {
      summary: {
        passed: 0,
        failed: 0,
        total: 0,
        memoryLeaks: 0,
        efficiency: 0
      },
      results: {},
      memoryProfile: {}
    };

    // Establish baseline memory usage
    testResults.baselineMemory = this.getCurrentMemoryProfile();

    // Run each test scenario
    const testScenarios = [
      'baseline-memory-measurement',
      'memory-leak-detection',
      'large-suite-memory',
      'concurrent-execution-memory',
      'resource-pooling-efficiency',
      'garbage-collection-effectiveness',
      'memory-pressure-handling',
      'cleanup-efficiency-validation'
    ];

    for (const scenario of testScenarios) {
      console.log(`Running memory validation scenario: ${scenario}`);

      const scenarioResults = await this.runTestScenario(scenario);
      testResults.results[scenario] = scenarioResults;

      // Update summary
      testResults.summary.total += scenarioResults.tests;
      testResults.summary.passed += scenarioResults.passed;
      testResults.summary.failed += scenarioResults.failed;
      testResults.summary.memoryLeaks += scenarioResults.memoryLeaks || 0;

      console.log(`Scenario completed: ${scenarioResults.passed}/${scenarioResults.tests} passed`);
      console.log('');
    }

    // Calculate final memory profile and efficiency
    testResults.finalMemoryProfile = this.getCurrentMemoryProfile();
    testResults.summary.efficiency = this.calculateMemoryEfficiency(testResults);

    // Generate comprehensive report
    const report = this.generateMemoryValidationReport(testResults);

    return {
      results: testResults,
      report,
      passed: testResults.summary.failed === 0,
      memoryHealthy: this.isMemoryHealthy(testResults),
      efficiencyMet: testResults.summary.efficiency >= this.memoryThresholds.cleanupEfficiency
    };
  }

  /**
   * Run individual test scenario
   */
  async runTestScenario(scenario) {
    const results = {
      scenario,
      tests: 0,
      passed: 0,
      failed: 0,
      memoryLeaks: 0,
      memoryMeasurements: [],
      peakMemory: 0,
      averageMemory: 0,
      memoryGrowthRate: 0,
      cleanupEfficiency: 0,
      recommendations: []
    };

    try {
      switch (scenario) {
        case 'baseline-memory-measurement':
          Object.assign(results, await this.testBaselineMemoryMeasurement());
          break;
        case 'memory-leak-detection':
          Object.assign(results, await this.testMemoryLeakDetection());
          break;
        case 'large-suite-memory':
          Object.assign(results, await this.testLargeSuiteMemory());
          break;
        case 'concurrent-execution-memory':
          Object.assign(results, await this.testConcurrentExecutionMemory());
          break;
        case 'resource-pooling-efficiency':
          Object.assign(results, await this.testResourcePoolingEfficiency());
          break;
        case 'garbage-collection-effectiveness':
          Object.assign(results, await this.testGarbageCollectionEffectiveness());
          break;
        case 'memory-pressure-handling':
          Object.assign(results, await this.testMemoryPressureHandling());
          break;
        case 'cleanup-efficiency-validation':
          Object.assign(results, await this.testCleanupEfficiencyValidation());
          break;
        default:
          throw new Error(`Unknown test scenario: ${scenario}`);
      }
    } catch (error) {
      console.error(`Failed to run scenario ${scenario}:`, error.message);
      results.failed = results.tests;
    }

    return results;
  }

  /**
   * Test baseline memory measurement
   */
  async testBaselineMemoryMeasurement() {
    const memoryMeasurements = [];
    const tests = [];

    // Measure memory over time with no load
    for (let i = 0; i < 10; i++) {
      const measurement = this.getCurrentMemoryProfile();
      memoryMeasurements.push(measurement);
      tests.push({ id: i, memory: measurement.heapUsed, passed: true });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Analyze baseline stability
    const memoryValues = memoryMeasurements.map(m => m.heapUsed);
    const avgMemory = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length;
    const variance = memoryValues.reduce((sum, val) => sum + Math.pow(val - avgMemory, 2), 0) / memoryValues.length;
    const standardDeviation = Math.sqrt(variance);

    const stable = standardDeviation < (avgMemory * 0.05); // 5% variance threshold

    return {
      tests: tests.length,
      passed: stable ? tests.length : 0,
      failed: stable ? 0 : tests.length,
      memoryMeasurements,
      averageMemory: avgMemory,
      memoryStability: stable,
      standardDeviation: standardDeviation,
      recommendations: stable ? [] : ['High baseline memory variability detected']
    };
  }

  /**
   * Test memory leak detection
   */
  async testMemoryLeakDetection() {
    const memoryMeasurements = [];
    const tests = [];
    let memoryLeaks = 0;

    // Simulate operations that could cause memory leaks
    for (let i = 0; i < this.testConfig.iterations; i++) {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform memory-intensive operations
      await this.simulateMemoryLeakScenario(i);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;

      memoryMeasurements.push({
        iteration: i,
        initialMemory,
        finalMemory,
        delta: memoryDelta
      });

      // Check for memory leak (growing memory without cleanup)
      const isLeak = memoryDelta > (this.memoryThresholds.perTestLimit * 2);
      tests.push({
        id: i,
        memoryDelta,
        passed: !isLeak
      });

      if (isLeak) {
        memoryLeaks++;
      }

      // Force garbage collection periodically
      if (i % 5 === 0 && global.gc) {
        global.gc();
      }
    }

    // Calculate memory growth rate
    const deltas = memoryMeasurements.map(m => m.delta);
    const avgGrowth = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    const growthRate = avgGrowth / this.memoryThresholds.perTestLimit;

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryLeaks,
      memoryMeasurements,
      memoryGrowthRate: growthRate,
      averageMemoryDelta: avgGrowth,
      recommendations: growthRate > this.memoryThresholds.leakThreshold ?
        ['Memory growth rate exceeds threshold'] : []
    };
  }

  /**
   * Test large suite memory usage
   */
  async testLargeSuiteMemory() {
    const memoryMeasurements = [];
    const tests = [];

    // Simulate large test suite execution
    const suiteSize = Math.min(this.testConfig.largeSuiteSize, 100); // Limit for testing
    const batchSize = 10;

    for (let i = 0; i < suiteSize; i += batchSize) {
      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();

      // Execute batch of tests
      await this.simulateTestSuiteExecution(batchSize);

      const finalMemory = process.memoryUsage().heapUsed;
      const executionTime = performance.now() - startTime;
      const memoryDelta = finalMemory - initialMemory;

      memoryMeasurements.push({
        batchStart: i,
        batchSize,
        memoryDelta,
        executionTime,
        finalMemory
      });

      tests.push({
        batch: i / batchSize,
        memoryDelta,
        executionTime,
        passed: memoryDelta < this.memoryThresholds.perTestLimit * batchSize
      });

      // Check memory thresholds
      if (finalMemory > this.memoryThresholds.warning) {
        console.warn(`Memory warning threshold exceeded: ${this.formatBytes(finalMemory)}`);
      }

      // Pause for stabilization
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Analyze memory efficiency
    const totalDelta = memoryMeasurements.reduce((sum, m) => sum + m.memoryDelta, 0);
    const averageDelta = totalDelta / memoryMeasurements.length;
    const efficiency = Math.max(0, 1 - (averageDelta / (this.memoryThresholds.perTestLimit * batchSize)));

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryMeasurements,
      averageMemoryDelta,
      memoryEfficiency: efficiency,
      peakMemory: Math.max(...memoryMeasurements.map(m => m.finalMemory)),
      recommendations: efficiency < 0.7 ? ['Low memory efficiency detected in large test suites'] : []
    };
  }

  /**
   * Test concurrent execution memory
   */
  async testConcurrentExecutionMemory() {
    const memoryMeasurements = [];
    const tests = [];

    // Run concurrent test executions
    const concurrentPromises = [];
    const testsPerWorker = Math.ceil(this.testConfig.iterations / this.testConfig.concurrentTests);

    for (let i = 0; i < this.testConfig.concurrentTests; i++) {
      const promise = this.runConcurrentMemoryTest(i, testsPerWorker);
      concurrentPromises.push(promise);
    }

    const workerResults = await Promise.all(concurrentPromises);

    // Aggregate results
    workerResults.forEach(result => {
      memoryMeasurements.push(...result.memoryMeasurements);
      tests.push(...result.tests);
    });

    // Analyze concurrent memory patterns
    const peakMemory = Math.max(...memoryMeasurements.map(m => m.finalMemory));
    const averageMemory = memoryMeasurements.reduce((sum, m) => sum + m.finalMemory, 0) / memoryMeasurements.length;
    const concurrencyEfficiency = this.calculateConcurrencyEfficiency(memoryMeasurements);

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryMeasurements,
      peakMemory,
      averageMemory,
      concurrencyEfficiency,
      recommendations: concurrencyEfficiency < 0.8 ? ['Inefficient memory usage under concurrent load'] : []
    };
  }

  /**
   * Run concurrent memory test
   */
  async runConcurrentMemoryTest(workerId, testCount) {
    const memoryMeasurements = [];
    const tests = [];

    for (let i = 0; i < testCount; i++) {
      const initialMemory = process.memoryUsage().heapUsed;

      await this.simulateMemoryIntensiveOperation();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;

      memoryMeasurements.push({
        workerId,
        testId: i,
        initialMemory,
        finalMemory,
        delta: memoryDelta
      });

      tests.push({
        workerId,
        testId: i,
        memoryDelta,
        passed: memoryDelta < this.memoryThresholds.perTestLimit
      });
    }

    return { memoryMeasurements, tests };
  }

  /**
   * Test resource pooling efficiency
   */
  async testResourcePoolingEfficiency() {
    const memoryMeasurements = [];
    const tests = [];

    // Test with and without resource pooling
    const poolingTests = [
      { withPooling: true, name: 'with-pooling' },
      { withPooling: false, name: 'without-pooling' }
    ];

    for (const testConfig of poolingTests) {
      const initialMemory = process.memoryUsage().heapUsed;

      if (testConfig.withPooling) {
        await this.simulateResourcePooledOperations();
      } else {
        await this.simulateNonPooledOperations();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;

      memoryMeasurements.push({
        testType: testConfig.name,
        memoryDelta,
        withPooling: testConfig.withPooling
      });

      const expectedDelta = testConfig.withPooling ?
        this.memoryThresholds.perTestLimit * 0.3 : // 30% with pooling
        this.memoryThresholds.perTestLimit; // 100% without pooling

      tests.push({
        testType: testConfig.name,
        memoryDelta,
        expectedDelta,
        passed: memoryDelta <= expectedDelta,
        withPooling: testConfig.withPooling
      });
    }

    // Calculate pooling efficiency
    const pooledResult = tests.find(t => t.withPooling);
    const nonPooledResult = tests.find(t => !t.withPooling);

    const poolingEfficiency = nonPooledResult && pooledResult ?
      (nonPooledResult.memoryDelta - pooledResult.memoryDelta) / nonPooledResult.memoryDelta : 0;

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryMeasurements,
      poolingEfficiency,
      recommendations: poolingEfficiency < 0.5 ? ['Low resource pooling efficiency'] : []
    };
  }

  /**
   * Test garbage collection effectiveness
   */
  async testGarbageCollectionEffectiveness() {
    const memoryMeasurements = [];
    const tests = [];

    for (let i = 0; i < this.testConfig.iterations; i++) {
      // Allocate memory
      const allocatedMemory = await this.simulateMemoryAllocation();
      const preGCMemory = process.memoryUsage().heapUsed;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      } else {
        // Alternative: trigger GC through memory pressure
        await this.triggerGarbageCollection();
      }

      const postGCMemory = process.memoryUsage().heapUsed;
      const memoryReclaimed = preGCMemory - postGCMemory;
      const reclamationEfficiency = allocatedMemory > 0 ? memoryReclaimed / allocatedMemory : 0;

      memoryMeasurements.push({
        iteration: i,
        allocatedMemory,
        memoryReclaimed,
        reclamationEfficiency
      });

      tests.push({
        iteration: i,
        reclamationEfficiency,
        passed: reclamationEfficiency > 0.7 // 70% reclamation target
      });
    }

    const averageEfficiency = memoryMeasurements.reduce((sum, m) => sum + m.reclamationEfficiency, 0) / memoryMeasurements.length;

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryMeasurements,
      averageReclamationEfficiency: averageEfficiency,
      recommendations: averageEfficiency < 0.7 ? ['Poor garbage collection effectiveness'] : []
    };
  }

  /**
   * Test memory pressure handling
   */
  async testMemoryPressureHandling() {
    const memoryMeasurements = [];
    const tests = [];

    // Gradually increase memory pressure
    const pressureLevels = [0.2, 0.4, 0.6, 0.8, 0.9, 0.95];

    for (const pressureLevel of pressureLevels) {
      const initialMemory = process.memoryUsage().heapUsed;
      const targetMemory = initialMemory + (this.memoryThresholds.critical * pressureLevel);

      // Apply memory pressure
      await this.applyMemoryPressure(targetMemory);

      const finalMemory = process.memoryUsage().heapUsed;
      const pressureApplied = finalMemory - initialMemory;
      const systemStable = this.isSystemStable();

      memoryMeasurements.push({
        pressureLevel,
        targetMemory,
        finalMemory,
        pressureApplied,
        systemStable
      });

      tests.push({
        pressureLevel,
        pressureApplied,
        systemStable,
        passed: systemStable && pressureApplied > 0
      });

      // Cleanup
      await this.cleanupMemoryPressure();
    }

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryMeasurements,
      pressureHandlingEfficiency: tests.filter(t => t.passed).length / tests.length,
      recommendations: tests.filter(t => !t.passed).length > 0 ? ['Poor memory pressure handling'] : []
    };
  }

  /**
   * Test cleanup efficiency validation
   */
  async testCleanupEfficiencyValidation() {
    const memoryMeasurements = [];
    const tests = [];

    for (let i = 0; i < this.testConfig.iterations; i++) {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create memory mess
      await this.createMemoryMess();

      const preCleanupMemory = process.memoryUsage().heapUsed;
      const messCreated = preCleanupMemory - initialMemory;

      // Perform cleanup
      await this.memoryManager.performAggressiveCleanup();

      const postCleanupMemory = process.memoryUsage().heapUsed;
      const memoryCleaned = preCleanupMemory - postCleanupMemory;
      const cleanupEfficiency = messCreated > 0 ? memoryCleaned / messCreated : 0;

      memoryMeasurements.push({
        iteration: i,
        messCreated,
        memoryCleaned,
        cleanupEfficiency
      });

      tests.push({
        iteration: i,
        cleanupEfficiency,
        passed: cleanupEfficiency > this.memoryThresholds.cleanupEfficiency
      });
    }

    const averageEfficiency = memoryMeasurements.reduce((sum, m) => sum + m.cleanupEfficiency, 0) / memoryMeasurements.length;

    return {
      tests: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      memoryMeasurements,
      averageCleanupEfficiency: averageEfficiency,
      recommendations: averageEfficiency < this.memoryThresholds.cleanupEfficiency ?
        ['Low cleanup efficiency'] : []
    };
  }

  /**
   * Helper methods for memory simulation
   */

  async simulateMemoryLeakScenario(iteration) {
    // Create objects that aren't properly cleaned up
    const leakyObjects = [];
    const objectCount = 1000 + (iteration * 100);

    for (let i = 0; i < objectCount; i++) {
      leakyObjects.push({
        data: new Array(1000).fill(`leak-data-${iteration}-${i}`),
        timestamp: Date.now(),
        metadata: { iteration, id: i }
      });
    }

    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // In a real leak, we wouldn't clear this array
    if (iteration % 3 === 0) { // Simulate occasional cleanup
      leakyObjects.length = 0;
    }
  }

  async simulateTestSuiteExecution(testCount) {
    const testPromises = [];
    for (let i = 0; i < testCount; i++) {
      testPromises.push(this.simulateMemoryIntensiveOperation());
    }
    await Promise.all(testPromises);
  }

  async simulateMemoryIntensiveOperation() {
    // Allocate and process data
    const dataSize = 1024 * 1024; // 1MB
    const data = new Array(dataSize).fill(0).map(() => Math.random());

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));

    return data;
  }

  async simulateResourcePooledOperations() {
    // Use resource pooling for efficient memory usage
    const pool = [];
    const poolSize = 5;

    for (let i = 0; i < poolSize; i++) {
      pool.push(await this.simulateMemoryIntensiveOperation());
    }

    // Reuse resources from pool
    for (let i = 0; i < 10; i++) {
      const resource = pool[i % poolSize];
      // Process resource (simulated)
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  async simulateNonPooledOperations() {
    // Create new resources each time (inefficient)
    for (let i = 0; i < 10; i++) {
      await this.simulateMemoryIntensiveOperation();
    }
  }

  async simulateMemoryAllocation() {
    const allocationSize = 5 * 1024 * 1024; // 5MB
    const data = new Array(allocationSize).fill(Math.random());
    return data.length * 8; // Approximate bytes
  }

  async triggerGarbageCollection() {
    // Alternative GC triggering through memory pressure
    const pressureData = [];
    for (let i = 0; i < 100; i++) {
      pressureData.push(new Array(10000).fill(Math.random()));
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    pressureData.length = 0; // Allow GC
  }

  async applyMemoryPressure(targetMemory) {
    const currentMemory = process.memoryUsage().heapUsed;
    const neededMemory = targetMemory - currentMemory;

    if (neededMemory > 0) {
      const elements = Math.ceil(neededMemory / 8); // 8 bytes per number
      const pressureArray = new Array(elements).fill(Math.random());

      // Hold reference to maintain pressure
      this.pressureArray = pressureArray;

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async cleanupMemoryPressure() {
    this.pressureArray = null;
    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async createMemoryMess() {
    this.messyObjects = [];
    for (let i = 0; i < 1000; i++) {
      this.messyObjects.push({
        largeData: new Array(1000).fill(Math.random()),
        metadata: { id: i, timestamp: Date.now() },
        nested: {
          data: new Array(500).fill(`nested-${i}`),
          moreNested: {
            array: new Array(100).fill(`deep-nested-${i}`)
          }
        }
      });
    }
  }

  /**
   * Analysis and utility methods
   */

  getCurrentMemoryProfile() {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      timestamp: Date.now()
    };
  }

  calculateConcurrencyEfficiency(memoryMeasurements) {
    if (memoryMeasurements.length < 2) return 1;

    // Check if memory scales linearly with concurrency
    const memoryValues = memoryMeasurements.map(m => m.finalMemory);
    const avgMemory = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length;
    const maxMemory = Math.max(...memoryValues);

    // Good efficiency means memory doesn't grow exponentially with concurrency
    const efficiency = avgMemory / maxMemory;
    return efficiency;
  }

  calculateMemoryEfficiency(testResults) {
    let totalEfficiency = 0;
    let efficiencyCount = 0;

    for (const [scenario, results] of Object.entries(testResults.results)) {
      if (results.cleanupEfficiency !== undefined) {
        totalEfficiency += results.cleanupEfficiency;
        efficiencyCount++;
      }
      if (results.memoryEfficiency !== undefined) {
        totalEfficiency += results.memoryEfficiency;
        efficiencyCount++;
      }
      if (results.poolingEfficiency !== undefined) {
        totalEfficiency += results.poolingEfficiency;
        efficiencyCount++;
      }
      if (results.concurrencyEfficiency !== undefined) {
        totalEfficiency += results.concurrencyEfficiency;
        efficiencyCount++;
      }
    }

    return efficiencyCount > 0 ? totalEfficiency / efficiencyCount : 0;
  }

  isMemoryHealthy(testResults) {
    const finalMemory = testResults.finalMemoryProfile.heapUsed;
    return finalMemory < this.memoryThresholds.critical &&
           testResults.summary.memoryLeaks === 0;
  }

  isSystemStable() {
    // Simple stability check
    const memoryUsage = process.memoryUsage();
    const heapUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    return heapUsageRatio < 0.9; // 90% threshold
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateMemoryValidationReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        baselineMemory: this.formatBytes(testResults.baselineMemory.heapUsed),
        finalMemory: this.formatBytes(testResults.finalMemoryProfile.heapUsed),
        memoryGrowth: this.formatBytes(testResults.finalMemoryProfile.heapUsed - testResults.baselineMemory.heapUsed),
        totalTests: testResults.summary.total,
        passedTests: testResults.summary.passed,
        failedTests: testResults.summary.failed,
        memoryLeaks: testResults.summary.memoryLeaks,
        overallEfficiency: (testResults.summary.efficiency * 100).toFixed(1) + '%',
        memoryHealthy: this.isMemoryHealthy(testResults)
      },
      scenarios: {},
      recommendations: [],
      criticalIssues: []
    };

    // Analyze each scenario
    for (const [scenario, results] of Object.entries(testResults.results)) {
      report.scenarios[scenario] = {
        memoryProfile: {
          averageMemory: results.averageMemory ? this.formatBytes(results.averageMemory) : 'N/A',
          peakMemory: results.peakMemory ? this.formatBytes(results.peakMemory) : 'N/A',
          memoryGrowthRate: (results.memoryGrowthRate * 100).toFixed(1) + '%'
        },
        efficiency: {
          cleanupEfficiency: results.cleanupEfficiency !== undefined ?
            (results.cleanupEfficiency * 100).toFixed(1) + '%' : 'N/A',
          memoryEfficiency: results.memoryEfficiency !== undefined ?
            (results.memoryEfficiency * 100).toFixed(1) + '%' : 'N/A',
          poolingEfficiency: results.poolingEfficiency !== undefined ?
            (results.poolingEfficiency * 100).toFixed(1) + '%' : 'N/A'
        },
        reliability: {
          passRate: ((results.passed / results.tests) * 100).toFixed(1) + '%',
          memoryLeaks: results.memoryLeaks || 0,
          tests: results.tests
        }
      };

      // Collect recommendations
      if (results.recommendations && results.recommendations.length > 0) {
        report.recommendations.push(...results.recommendations.map(rec => ({
          scenario,
          ...rec
        })));
      }

      // Identify critical issues
      if (results.memoryLeaks > 0) {
        report.criticalIssues.push({
          scenario,
          type: 'memory-leak',
          severity: 'high',
          count: results.memoryLeaks
        });
      }

      if (results.peakMemory > this.memoryThresholds.critical) {
        report.criticalIssues.push({
          scenario,
          type: 'high-memory',
          severity: 'high',
          memory: this.formatBytes(results.peakMemory)
        });
      }
    }

    return report;
  }

  /**
   * Cleanup test resources
   */
  cleanup() {
    this.performanceObserver.disconnect();
    this.memoryManager.cleanup();
    this.pressureArray = null;
    this.messyObjects = null;
    this.results = [];
  }
}

/**
 * Test runner entry point
 */
async function runMemoryValidationTests() {
  const testRunner = new MemoryValidationTest();

  try {
    const results = await testRunner.runAllTests();

    // Output results
    console.log('=== MEMORY VALIDATION TEST RESULTS ===');
    console.log('');
    console.log(`Baseline Memory: ${results.report.summary.baselineMemory}`);
    console.log(`Final Memory: ${results.report.summary.finalMemory}`);
    console.log(`Memory Growth: ${results.report.summary.memoryGrowth}`);
    console.log(`Overall Results: ${results.report.summary.passedTests}/${results.report.summary.totalTests} tests passed`);
    console.log(`Memory Leaks: ${results.report.summary.memoryLeaks}`);
    console.log(`Overall Efficiency: ${results.report.summary.overallEfficiency}`);
    console.log(`Memory Healthy: ${results.report.summary.memoryHealthy ? 'YES' : 'NO'}`);
    console.log('');

    // Scenario details
    console.log('=== SCENARIO DETAILS ===');
    for (const [scenario, details] of Object.entries(results.report.scenarios)) {
      console.log(`${scenario}:`);
      console.log(`  Pass Rate: ${details.reliability.passRate}`);
      console.log(`  Memory Growth: ${details.memoryProfile.memoryGrowthRate}`);
      if (details.efficiency.cleanupEfficiency !== 'N/A') {
        console.log(`  Cleanup Efficiency: ${details.efficiency.cleanupEfficiency}`);
      }
      console.log('');
    }

    // Critical issues
    if (results.report.criticalIssues.length > 0) {
      console.log('=== CRITICAL ISSUES ===');
      results.report.criticalIssues.forEach(issue => {
        console.log(`[${issue.severity.toUpperCase()}] ${issue.scenario}: ${issue.type}`);
        if (issue.count) console.log(`  Count: ${issue.count}`);
        if (issue.memory) console.log(`  Memory: ${issue.memory}`);
      });
      console.log('');
    }

    // Recommendations
    if (results.report.recommendations.length > 0) {
      console.log('=== RECOMMENDATIONS ===');
      results.report.recommendations.forEach(rec => {
        console.log(`[${rec.scenario}] ${rec.issue}`);
        console.log(`  -> ${rec.suggestion}`);
        console.log('');
      });
    }

    console.log('=== TEST COMPLETED ===');

    return results;

  } catch (error) {
    console.error('Memory validation test failed:', error);
    throw error;
  } finally {
    testRunner.cleanup();
  }
}

// Export test runner
module.exports = {
  MemoryValidationTest,
  runMemoryValidationTests
};

// Run tests if called directly
if (require.main === module) {
  runMemoryValidationTests()
    .then(results => {
      process.exit(results.memoryHealthy ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}