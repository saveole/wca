/**
 * Global Teardown for WebClip Assistant Tests
 *
 * This file runs once after all tests to clean up the global testing environment,
 * remove Chrome API mocks, and generate test reports.
 */

import { cleanupChromeMock } from '../mocks/chrome-api.js';

/**
 * Global teardown function called by Playwright after all tests
 * @param {Object} config - Playwright test configuration
 * @param {Object} config.config - Playwright configuration object
 * @returns {Promise<void>}
 */
export default async function globalTeardown(config) {
  console.log('🧹 Tearing down global test environment...');

  // Cleanup Chrome API mocks
  cleanupChromeMock();

  // Generate test summary report
  generateTestSummary();

  // Cleanup global utilities
  cleanupGlobalUtilities();

  console.log('✅ Global test environment teardown complete');
}

/**
 * Generate test summary report
 */
function generateTestSummary() {
  const summary = {
    testEnvironment: 'component-isolation',
    timestamp: new Date().toISOString(),
    totalTests: global.__testCount || 0,
    passedTests: global.__passedTests || 0,
    failedTests: global.__failedTests || 0,
    chromeApiCalls: global.__chromeApiCallCount || 0,
    mockResponses: global.__mockResponseCount || 0,
    performance: {
      totalDuration: global.__testDuration || 0,
      averageTestDuration: global.__averageTestDuration || 0
    }
  };

  // Log test summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`Environment: ${summary.testEnvironment}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passedTests}`);
  console.log(`Failed: ${summary.failedTests}`);
  console.log(`Chrome API Calls: ${summary.chromeApiCalls}`);
  console.log(`Mock Responses: ${summary.mockResponses}`);
  console.log(`Total Duration: ${summary.performance.totalDuration}ms`);
  console.log(`Average Test Duration: ${summary.performance.averageTestDuration}ms`);

  // Save summary to file if in Node.js environment
  if (typeof process !== 'undefined' && process.env && typeof require !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');

      const summaryPath = path.join(process.cwd(), 'test-results', 'test-summary.json');
      const summaryDir = path.dirname(summaryPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(summaryDir)) {
        fs.mkdirSync(summaryDir, { recursive: true });
      }

      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📄 Test summary saved to: ${summaryPath}`);
    } catch (error) {
      console.warn('⚠️ Could not save test summary to file:', error.message);
    }
  }
}

/**
 * Cleanup global utilities and mocks
 */
function cleanupGlobalUtilities() {
  // Clear global timeouts and intervals
  if (global.setTimeout) {
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  }

  if (global.setInterval) {
    const highestIntervalId = setInterval(() => {}, 0);
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
  }

  // Reset global counters
  global.__testCount = 0;
  global.__passedTests = 0;
  global.__failedTests = 0;
  global.__chromeApiCallCount = 0;
  global.__mockResponseCount = 0;
  global.__testDuration = 0;
  global.__averageTestDuration = 0;
}

/**
 * Validate cleanup was successful
 * @returns {boolean} True if cleanup was successful
 */
function validateCleanup() {
  const issues = [];

  // Check for remaining Chrome mock
  if (global.chrome && typeof global.chrome === 'object') {
    issues.push('Chrome mock still present in global scope');
  }

  if (issues.length > 0) {
    console.warn('⚠️ Cleanup validation issues:', issues);
    return false;
  }

  return true;
}

// Export validation function for external use
global.validateTestCleanup = validateCleanup;