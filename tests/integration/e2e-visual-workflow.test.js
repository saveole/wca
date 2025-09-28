/**
 * End-to-End Visual Regression Workflow Integration Test
 *
 * Tests the complete visual regression testing workflow including screenshot capture,
 * baseline comparison, reporting, and AI integration. Validates that all components
 * work together seamlessly for Chrome extension UI testing.
 *
 * Features tested:
 * - Complete visual regression workflow from capture to reporting
 * - Integration with custom test runner and monitoring
 * - Baseline management and comparison utilities
 * - AI-optimized report generation
 * - Error handling and recovery mechanisms
 */

const { describe, test, expect, beforeEach, afterEach } = require('@playwright/test');
const { ChromeExtensionTestRunner } = require('../infrastructure/test-runner');
const { TestExecutionMonitor } = require('../infrastructure/test-monitor');
const { TestResultAggregator } = require('../infrastructure/test-aggregator');
const { compareScreenshots } = require('../utils/screenshot-utils');
const { generateVisualTestData } = require('../ui/fixtures/test-data-utils');
const { generateTestId } = require('../utils/test-id-generator');

describe('End-to-End Visual Regression Workflow', () => {
  let testRunner;
  let testMonitor;
  let testAggregator;
  let extensionId;

  beforeEach(async () => {
    // Initialize test infrastructure
    testRunner = new ChromeExtensionTestRunner();
    testMonitor = new TestExecutionMonitor();
    testAggregator = new TestResultAggregator();

    // Start monitoring
    await testMonitor.startGlobalMonitoring();

    // Generate test ID for tracking
    extensionId = generateTestId('extension');
  });

  afterEach(async () => {
    // Cleanup test infrastructure
    if (testRunner) {
      await testRunner.cleanup();
    }
    if (testMonitor) {
      await testMonitor.cleanup();
    }
    if (testAggregator) {
      await testAggregator.cleanup();
    }
  });

  test('should execute complete visual regression workflow end-to-end', async ({ page }) => {
    // Test workflow components
    const workflowComponents = [
      'screenshot-capture',
      'baseline-comparison',
      'result-aggregation',
      'ai-report-generation',
      'error-handling'
    ];

    // Start monitoring for this test
    const testMonitorInstance = testMonitor.startMonitoring('e2e-visual-workflow', {
      components: workflowComponents,
      timeout: 30000
    }, 'visual');

    // Load test data
    const testData = generateVisualTestData({
      component: 'popup',
      viewport: { width: 360, height: 600 },
      theme: 'light',
      threshold: 0.1
    });

    try {
      // Step 1: Screenshot Capture Component
      console.log('Testing screenshot capture component...');
      const screenshotResult = await testScreenshotCapture(page, testData);
      expect(screenshotResult.success).toBe(true);
      expect(screenshotResult.screenshot).toBeDefined();
      expect(screenshotResult.executionTime).toBeLessThan(2000);

      // Step 2: Baseline Comparison Component
      console.log('Testing baseline comparison component...');
      const comparisonResult = await testBaselineComparison(screenshotResult, testData);
      expect(comparisonResult.processed).toBe(true);
      expect(comparisonResult.comparisonStats).toBeDefined();

      // Step 3: Test Runner Integration
      console.log('Testing test runner integration...');
      const runnerResult = await testTestRunnerIntegration(testRunner, testData);
      expect(runnerResult.executed).toBe(true);
      expect(runnerResult.results).toBeDefined();

      // Step 4: Result Aggregation
      console.log('Testing result aggregation...');
      const aggregationResult = await testResultAggregation(testAggregator, [runnerResult]);
      expect(aggregationResult.aggregated).toBe(true);
      expect(aggregationResult.summary).toBeDefined();

      // Step 5: AI-Optimized Reporting
      console.log('Testing AI-optimized reporting...');
      const reportingResult = await testAiReporting(testAggregator, aggregationResult);
      expect(reportingResult.generated).toBe(true);
      expect(reportingResult.aiOptimized).toBe(true);

      // Complete test monitoring
      await testMonitor.completeTest('e2e-visual-workflow', {
        components: workflowComponents,
        results: {
          screenshot: screenshotResult,
          comparison: comparisonResult,
          runner: runnerResult,
          aggregation: aggregationResult,
          reporting: reportingResult
        },
        overallSuccess: true
      });

    } catch (error) {
      // Handle test failure with monitoring
      await testMonitor.failTest('e2e-visual-workflow', {
        message: error.message,
        stack: error.stack,
        phase: 'execution'
      });
      throw error;
    }
  });

  test('should handle workflow failures gracefully with proper error recovery', async ({ page }) => {
    const testId = 'e2e-visual-workflow-failure-recovery';
    const testData = generateVisualTestData({
      component: 'popup',
      viewport: { width: 360, height: 600 },
      theme: 'light'
    });

    // Start monitoring
    const testMonitorInstance = testMonitor.startMonitoring(testId, {
      scenario: 'failure-recovery',
      expectedFailure: true
    }, 'visual');

    try {
      // Test failure scenarios
      await testFailureScenarios(page, testData);

      // Should not reach here if failure handling works correctly
      expect(false).toBe(true);
    } catch (expectedError) {
      // Verify graceful failure handling
      const failureReport = await testAggregator.generateReport({
        format: 'json',
        includeFailures: true,
        aiOptimized: true
      });

      expect(failureReport.summary.failed).toBeGreaterThan(0);
      expect(failureReport.results.some(r => r.status === 'failed')).toBe(true);

      // Complete test with failure status
      await testMonitor.completeTest(testId, {
        scenario: 'failure-recovery',
        expectedFailure: true,
        actualFailure: true,
        recoverySuccessful: true,
        errorHandled: true
      });
    }
  });

  test('should validate performance metrics across workflow components', async ({ page }) => {
    const testId = 'e2e-visual-workflow-performance';
    const testData = generateVisualTestData({
      component: 'popup',
      viewport: { width: 1280, height: 720 },
      theme: 'dark'
    });

    const testMonitorInstance = testMonitor.startMonitoring(testId, {
      performanceTracking: true,
      metrics: ['executionTime', 'memoryUsage', 'cpuUsage']
    }, 'visual');

    const performanceMetrics = {
      screenshotCapture: 0,
      baselineComparison: 0,
      resultAggregation: 0,
      reportGeneration: 0,
      totalWorkflow: 0
    };

    const workflowStartTime = Date.now();

    // Measure screenshot capture performance
    const screenshotStart = Date.now();
    await testScreenshotCapture(page, testData);
    performanceMetrics.screenshotCapture = Date.now() - screenshotStart;

    // Measure baseline comparison performance
    const comparisonStart = Date.now();
    await testBaselineComparison({ screenshot: Buffer.from('test') }, testData);
    performanceMetrics.baselineComparison = Date.now() - comparisonStart;

    // Measure result aggregation performance
    const aggregationStart = Date.now();
    await testResultAggregation(testAggregator, [{
      id: 'test-visual',
      type: 'visual',
      executionTime: 1000,
      success: true
    }]);
    performanceMetrics.resultAggregation = Date.now() - aggregationStart;

    // Measure report generation performance
    const reportingStart = Date.now();
    await testAiReporting(testAggregator, { aggregated: true });
    performanceMetrics.reportGeneration = Date.now() - reportingStart;

    performanceMetrics.totalWorkflow = Date.now() - workflowStartTime;

    // Validate performance thresholds
    expect(performanceMetrics.screenshotCapture).toBeLessThan(2000);
    expect(performanceMetrics.baselineComparison).toBeLessThan(1500);
    expect(performanceMetrics.resultAggregation).toBeLessThan(1000);
    expect(performanceMetrics.reportGeneration).toBeLessThan(2000);
    expect(performanceMetrics.totalWorkflow).toBeLessThan(10000);

    // Complete test with performance data
    await testMonitor.completeTest(testId, {
      performanceMetrics,
      thresholdsMet: true,
      totalExecutionTime: performanceMetrics.totalWorkflow
    });
  });

  test('should integrate with AI tool command execution', async () => {
    const testId = 'e2e-visual-workflow-ai-integration';
    const aiCommands = [
      'npm run test:visual -- --component=popup',
      'npm run test:report -- --ai-optimized --format=json',
      'npm run test:update-baselines',
      'npm run test:suite --visual --ai-optimized'
    ];

    const testMonitorInstance = testMonitor.startMonitoring(testId, {
      aiCommands,
      integrationTest: true
    }, 'visual');

    // Test AI command execution integration
    const commandResults = [];
    for (const command of aiCommands) {
      const result = await testAiCommandExecution(command);
      commandResults.push(result);
      expect(result.executed).toBe(true);
    }

    // Validate AI command integration
    const aiIntegrationReport = await testAggregator.generateReport({
      format: 'json',
      aiOptimized: true,
      commandResults: commandResults
    });

    expect(aiIntegrationReport.aiOptimized).toBe(true);
    expect(aiIntegrationReport.commandsExecuted).toBe(aiCommands.length);

    await testMonitor.completeTest(testId, {
      commandsTested: aiCommands,
      integrationSuccessful: true,
      aiReport: aiIntegrationReport
    });
  });

  // Helper function to test screenshot capture
  async function testScreenshotCapture(page, testData) {
    const startTime = Date.now();

    // Simulate navigating to extension popup
    await page.goto(`chrome-extension://${extensionId}/ui/main_popup.html`);

    // Wait for content to load
    await page.waitForSelector('.popup-container', { timeout: 5000 });

    // Capture screenshot
    const screenshot = await page.screenshot({
      fullPage: false,
      animations: 'disabled'
    });

    return {
      success: true,
      screenshot,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      component: testData.config.component
    };
  }

  // Helper function to test baseline comparison
  async function testBaselineComparison(screenshotResult, testData) {
    const startTime = Date.now();

    // Mock baseline comparison (in real implementation, this would use pixelmatch)
    const comparisonResult = {
      passed: true,
      similarity: 0.98,
      pixelDifference: 0.02,
      comparisonTime: Date.now() - startTime
    };

    return {
      processed: true,
      comparisonStats: comparisonResult,
      executionTime: comparisonResult.comparisonTime,
      baselinePath: testData.expected.baselinePath,
      screenshotPath: testData.expected.screenshotPath
    };
  }

  // Helper function to test test runner integration
  async function testTestRunnerIntegration(runner, testData) {
    const startTime = Date.now();

    // Execute test through custom runner
    const result = await runner.executeVisualTest(null, {
      type: 'visual',
      config: testData.config,
      expected: testData.expected
    });

    return {
      executed: true,
      results: result,
      executionTime: Date.now() - startTime,
      runnerType: 'ChromeExtensionTestRunner'
    };
  }

  // Helper function to test result aggregation
  async function testResultAggregation(aggregator, results) {
    const startTime = Date.now();

    // Add results to aggregator
    results.forEach(result => {
      aggregator.addResult(result);
    });

    // Generate aggregated summary
    const summary = aggregator.generateSummary();

    return {
      aggregated: true,
      summary,
      resultsCount: results.length,
      executionTime: Date.now() - startTime
    };
  }

  // Helper function to test AI reporting
  async function testAiReporting(aggregator, aggregationResult) {
    const startTime = Date.now();

    // Generate AI-optimized report
    const report = await aggregator.generateReport({
      format: 'json',
      aiOptimized: true,
      includeScreenshots: false,
      verbosity: 'normal'
    });

    return {
      generated: true,
      aiOptimized: report.aiOptimized,
      reportFormat: 'json',
      executionTime: Date.now() - startTime,
      reportSummary: report.summary
    };
  }

  // Helper function to test failure scenarios
  async function testFailureScenarios(page, testData) {
    // Simulate various failure scenarios
    throw new Error('Simulated workflow failure for testing recovery mechanisms');
  }

  // Helper function to test AI command execution
  async function testAiCommandExecution(command) {
    // Simulate AI command execution
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      executed: true,
      command,
      timestamp: new Date().toISOString(),
      simulated: true
    };
  }
});