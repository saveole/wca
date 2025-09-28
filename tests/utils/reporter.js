/**
 * AI-Friendly Test Reporter
 *
 * Generates test reports optimized for AI tool interpretation with 80% success rate targeting.
 * Provides structured, actionable feedback that AI coding tools can understand and act upon.
 */

/**
 * Generate AI-friendly JSON report from test results
 * @param {Array} testResults - Array of test results
 * @param {Object} options - Reporting options
 * @param {boolean} options.aiOptimized - Enable AI optimization (default: true)
 * @param {string} options.format - Output format (default: 'json')
 * @param {string} options.verbosity - Detail level (minimal, normal, detailed)
 * @param {Object} options.metadata - Additional metadata
 * @returns {Object} AI-optimized report
 */
export function generateAIReport(testResults, options = {}) {
  const {
    aiOptimized = true,
    format = 'json',
    verbosity = 'normal',
    metadata = {}
  } = options;

  // Calculate summary statistics
  const summary = calculateTestSummary(testResults);

  // Structure results for AI interpretation
  const results = testResults.map(result => structureTestResult(result, aiOptimized));

  // Generate actionable insights
  const insights = generateAIInsights(testResults, summary);

  // Create AI-optimized structure
  const report = {
    executionId: generateUUID(),
    timestamp: new Date().toISOString(),
    status: summary.failed > 0 ? 'failed' : 'passed',
    summary,
    results,
    insights,
    aiOptimized,
    metadata: formatMetadata(metadata),
    performance: calculatePerformanceMetrics(testResults)
  };

  // Add AI-specific optimizations
  if (aiOptimized) {
    report.aiSuggestions = generateAISuggestions(testResults, summary);
    report.successProbability = calculateSuccessProbability(summary);
    report.priorityActions = determinePriorityActions(testResults);
  }

  return report;
}

/**
 * Calculate test summary statistics
 * @param {Array} testResults - Array of test results
 * @returns {Object} Summary statistics
 */
function calculateTestSummary(testResults) {
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'passed').length;
  const failed = testResults.filter(r => r.status === 'failed').length;
  const skipped = testResults.filter(r => r.status === 'skipped').length;
  const error = testResults.filter(r => r.status === 'error').length;

  const executed = total - skipped;
  const successRate = executed > 0 ? passed / executed : 0;

  return {
    total,
    passed,
    failed,
    skipped,
    error,
    executed,
    successRate: Math.round(successRate * 100) / 100
  };
}

/**
 * Structure individual test result for AI interpretation
 * @param {Object} result - Raw test result
 * @param {boolean} aiOptimized - Enable AI optimizations
 * @returns {Object} Structured test result
 */
function structureTestResult(result, aiOptimized) {
  const structured = {
    testId: result.testId || generateUUID(),
    name: result.name || 'Unknown Test',
    type: result.type || 'unknown',
    status: result.status || 'unknown',
    duration: result.duration || 0,
    errors: result.errors || [],
    metadata: result.metadata || {}
  };

  if (aiOptimized) {
    // Add AI-friendly error structure
    structured.errors = structured.errors.map(error => structureErrorForAI(error));

    // Add categorization for AI understanding
    structured.category = categorizeTest(result);
    structured.complexity = assessTestComplexity(result);
    structured.fixable = isFixableByAI(result);
  }

  return structured;
}

/**
 * Structure error information for AI interpretation
 * @param {Object} error - Raw error object
 * @returns {Object} AI-structured error
 */
export function structureErrorForAI(error) {
  return {
    message: error.message || 'Unknown error',
    severity: assessErrorSeverity(error),
    category: categorizeError(error),
    fixSuggestion: generateFixSuggestion(error),
    confidence: calculateFixConfidence(error),
    context: extractErrorContext(error),
    screenshot: error.screenshot || null,
    actionable: isActionableError(error)
  };
}

/**
 * Calculate success rate for AI targeting
 * @param {Array} results - Test results
 * @returns {number} Success rate (0-1)
 */
export function calculateSuccessRate(results) {
  const executed = results.filter(r => r.status !== 'skipped');
  if (executed.length === 0) return 0;

  const passed = executed.filter(r => r.status === 'passed').length;
  return Math.round((passed / executed.length) * 100) / 100;
}

/**
 * Generate actionable test summary for AI analysis
 * @param {Array} testResults - Array of test results
 * @returns {Object} Test summary with AI insights
 */
export function generateTestSummary(testResults) {
  const summary = calculateTestSummary(testResults);

  // Group by test type
  const byType = groupTestsByType(testResults);
  const byStatus = groupTestsByStatus(testResults);

  return {
    totalTests: summary.total,
    executedTests: summary.executed,
    successRate: summary.successRate,
    failedByType: Object.fromEntries(
      Object.entries(byType).map(([type, tests]) => [
        type,
        tests.filter(t => t.status === 'failed').length
      ])
    ),
    criticalFailures: countCriticalFailures(testResults),
    actionableItems: countActionableItems(testResults),
    priority: determineTestPriority(summary),
    estimatedFixTime: estimateFixTime(testResults)
  };
}

/**
 * Format test metadata for AI analysis
 * @param {Object} metadata - Raw metadata
 * @returns {Object} AI-formatted metadata
 */
export function formatMetadata(metadata) {
  return {
    browser: metadata.browser || 'unknown',
    viewportSize: metadata.viewport ? `${metadata.viewport.width}x${metadata.viewport.height}` : 'unknown',
    theme: metadata.theme || 'unknown',
    environment: metadata.environment || 'unknown',
    timestamp: metadata.timestamp || new Date().toISOString(),
    performance: {
      totalDurationMs: metadata.totalDuration || 0,
      memoryUsedMB: metadata.memoryUsed ? Math.round(metadata.memoryUsed / 1024 / 1024) : 0,
      averageTestDurationMs: metadata.averageTestDuration || 0
    }
  };
}

/**
 * Generate AI insights from test results
 * @param {Array} testResults - Test results
 * @param {Object} summary - Test summary
 * @returns {Array<string>} AI insights
 */
function generateAIInsights(testResults, summary) {
  const insights = [];

  // Performance insights
  if (summary.successRate < 0.8) {
    insights.push('Success rate below 80% target - focus on fixing critical failures first');
  }

  // Type-based insights
  const byType = groupTestsByType(testResults);
  Object.entries(byType).forEach(([type, tests]) => {
    const typeSuccess = calculateSuccessRate(tests);
    if (typeSuccess < 0.5) {
      insights.push(`${type} tests have low success rate (${Math.round(typeSuccess * 100)}%) - consider systematic review`);
    }
  });

  // Error pattern insights
  const errorPatterns = identifyErrorPatterns(testResults);
  Object.entries(errorPatterns).forEach(([pattern, count]) => {
    if (count > 1) {
      insights.push(`Detected ${count} instances of "${pattern}" - consider systematic fix`);
    }
  });

  return insights;
}

/**
 * Generate AI suggestions for test improvements
 * @param {Array} testResults - Test results
 * @param {Object} summary - Test summary
 * @returns {Array<string>} AI suggestions
 */
function generateAISuggestions(testResults, summary) {
  const suggestions = [];

  // Fix prioritization suggestions
  if (summary.failed > 0) {
    suggestions.push('Focus on critical failures first for maximum impact');
    suggestions.push('Consider fixing accessibility violations before visual regressions');
    suggestions.push('Prioritize tests that block other functionality');
  }

  // Performance suggestions
  const avgDuration = calculateAverageDuration(testResults);
  if (avgDuration > 2000) {
    suggestions.push('Test execution time is high - consider optimization or parallel execution');
  }

  // Coverage suggestions
  const coverage = calculateTestCoverage(testResults);
  if (coverage.visual < 0.5) {
    suggestions.push('Increase visual regression test coverage for better UI stability');
  }

  return suggestions;
}

/**
 * Calculate success probability for AI targeting
 * @param {Object} summary - Test summary
 * @returns {number} Success probability (0-1)
 */
function calculateSuccessProbability(summary) {
  const baseProbability = summary.successRate;

  // Adjust based on failure types
  const failureAdjustment = summary.failed > 0 ? -0.1 : 0;
  const criticalAdjustment = summary.critical > 0 ? -0.2 : 0;

  const probability = Math.max(0, Math.min(1, baseProbability + failureAdjustment + criticalAdjustment));

  return Math.round(probability * 100) / 100;
}

/**
 * Determine priority actions for AI tools
 * @param {Array} testResults - Test results
 * @returns {Array<Object>} Priority actions
 */
function determinePriorityActions(testResults) {
  const actions = [];
  const failures = testResults.filter(r => r.status === 'failed');

  // Group by severity and type
  const criticalFailures = failures.filter(f => isCriticalFailure(f));
  const accessibilityFailures = failures.filter(f => f.type === 'accessibility');
  const visualFailures = failures.filter(f => f.type === 'visual');

  if (criticalFailures.length > 0) {
    actions.push({
      priority: 'critical',
      action: 'Fix critical test failures',
      count: criticalFailures.length,
      reason: 'Critical failures block functionality and must be fixed immediately'
    });
  }

  if (accessibilityFailures.length > 0) {
    actions.push({
      priority: 'high',
      action: 'Address accessibility violations',
      count: accessibilityFailures.length,
      reason: 'Accessibility is required for compliance and inclusivity'
    });
  }

  if (visualFailures.length > 0) {
    actions.push({
      priority: 'medium',
      action: 'Review visual regressions',
      count: visualFailures.length,
      reason: 'Visual changes may indicate unintended UI modifications'
    });
  }

  return actions;
}

// Helper functions

function groupTestsByType(testResults) {
  const grouped = {};
  testResults.forEach(result => {
    const type = result.type || 'unknown';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(result);
  });
  return grouped;
}

function groupTestsByStatus(testResults) {
  const grouped = {};
  testResults.forEach(result => {
    const status = result.status || 'unknown';
    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(result);
  });
  return grouped;
}

function categorizeTest(result) {
  if (result.type === 'accessibility') return 'compliance';
  if (result.type === 'visual') return 'ui-stability';
  if (result.type === 'interaction') return 'functionality';
  return 'general';
}

function assessTestComplexity(result) {
  if (result.duration > 5000) return 'high';
  if (result.duration > 2000) return 'medium';
  return 'low';
}

function isFixableByAI(result) {
  // Consider fixable if errors have clear patterns and suggestions
  return result.errors?.some(error => isActionableError(error)) || false;
}

function assessErrorSeverity(error) {
  const message = error.message?.toLowerCase() || '';
  if (message.includes('critical') || message.includes('fatal')) return 'critical';
  if (message.includes('error') || message.includes('failed')) return 'high';
  if (message.includes('warning') || message.includes('timeout')) return 'medium';
  return 'low';
}

function categorizeError(error) {
  const message = error.message?.toLowerCase() || '';
  if (message.includes('visual') || message.includes('screenshot')) return 'visual';
  if (message.includes('accessibility') || message.includes('axe')) return 'accessibility';
  if (message.includes('timeout') || message.includes('wait')) return 'timing';
  if (message.includes('element') || message.includes('selector')) return 'selector';
  return 'general';
}

function generateFixSuggestion(error) {
  const category = categorizeError(error);
  const suggestions = {
    visual: 'Check UI changes or update visual baseline',
    accessibility: 'Review WCAG compliance and fix ARIA attributes',
    timing: 'Increase timeout or optimize test performance',
    selector: 'Update element selectors or wait for element availability',
    general: 'Review test logic and application state'
  };

  return suggestions[category] || 'Review test implementation and application code';
}

function calculateFixConfidence(error) {
  // Higher confidence for clear error patterns
  if (error.message?.includes('expected')) return 0.9;
  if (error.message?.includes('timeout')) return 0.7;
  if (error.message?.includes('not found')) return 0.8;
  return 0.5;
}

function extractErrorContext(error) {
  return {
    stack: error.stack?.substring(0, 200) || null,
    location: error.stack?.split('\n')[1]?.trim() || null
  };
}

function isActionableError(error) {
  return error.message && !error.message.includes('unknown');
}

function countCriticalFailures(testResults) {
  return testResults.filter(r => r.status === 'failed' && isCriticalFailure(r)).length;
}

function countActionableItems(testResults) {
  return testResults.filter(r => r.status === 'failed' && isFixableByAI(r)).length;
}

function determineTestPriority(summary) {
  if (summary.successRate < 0.5) return 'critical';
  if (summary.successRate < 0.8) return 'high';
  if (summary.failed > 0) return 'medium';
  return 'low';
}

function estimateFixTime(testResults) {
  const failures = testResults.filter(r => r.status === 'failed');
  const baseTime = failures.length * 15; // 15 minutes per failure
  const complexity = failures.reduce((sum, f) => sum + (f.duration > 3000 ? 1 : 0), 0) * 10;
  return baseTime + complexity;
}

function identifyErrorPatterns(testResults) {
  const patterns = {};
  testResults.filter(r => r.status === 'failed').forEach(result => {
    result.errors?.forEach(error => {
      const pattern = error.message?.substring(0, 50) || 'unknown';
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });
  });
  return patterns;
}

function calculateAverageDuration(testResults) {
  const durations = testResults.map(r => r.duration || 0);
  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}

function calculateTestCoverage(testResults) {
  const byType = groupTestsByType(testResults);
  const total = testResults.length;
  return {
    visual: (byType.visual?.length || 0) / total,
    accessibility: (byType.accessibility?.length || 0) / total,
    interaction: (byType.interaction?.length || 0) / total
  };
}

function calculatePerformanceMetrics(testResults) {
  const durations = testResults.map(r => r.duration || 0);
  return {
    totalDuration: durations.reduce((sum, d) => sum + d, 0),
    averageDuration: calculateAverageDuration(testResults),
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations)
  };
}

function isCriticalFailure(result) {
  return result.errors?.some(error => assessErrorSeverity(error) === 'critical') || false;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default {
  generateAIReport,
  structureErrorForAI,
  calculateSuccessRate,
  generateTestSummary,
  formatMetadata
};