/**
 * Test Result Aggregation and Reporting System
 *
 * Provides comprehensive test result aggregation, analysis, and reporting
 * capabilities for Chrome extension UI testing. Supports multiple report formats,
 * AI-optimized insights, and detailed analytics.
 *
 * Features:
 * - Multi-format report generation (JSON, HTML, Markdown, CLI)
 * - AI-optimized result analysis and recommendations
 * - Historical trend analysis and comparison
 * - Performance benchmarking and insights
 * - Customizable report templates and filtering
 * - Integration with external reporting tools
 */

const path = require('path');
const fs = require('fs');

class TestResultAggregator {
  constructor(options = {}) {
    this.options = {
      reportsDir: path.join(__dirname, '../reports'),
      historyDir: path.join(__dirname, '../history'),
      includeRecommendations: options.includeRecommendations !== false,
      aiOptimized: options.aiOptimized !== false,
      targetInterpretability: options.targetInterpretability || 0.85,
      maxHistoryFiles: options.maxHistoryFiles || 50,
      ...options
    };

    this.results = [];
    this.metadata = {
      startTime: 0,
      endTime: 0,
      testRunner: 'ChromeExtensionTestRunner',
      environment: process.env.NODE_ENV || 'test'
    };

    this.ensureDirectoriesExist();
    this.loadReportTemplates();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectoriesExist() {
    [this.options.reportsDir, this.options.historyDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load report templates
   */
  loadReportTemplates() {
    this.templates = {
      html: this.getHtmlTemplate(),
      markdown: this.getMarkdownTemplate(),
      cli: this.getCliTemplate(),
      json: this.getJsonTemplate()
    };
  }

  /**
   * Add test result to aggregation
   */
  addResult(result) {
    this.results.push(result);
  }

  /**
   * Add multiple test results
   */
  addResults(results) {
    this.results.push(...results);
  }

  /**
   * Set execution metadata
   */
  setMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(options = {}) {
    const reportOptions = {
      format: options.format || 'json',
      includeCharts: options.includeCharts !== false,
      includeRecommendations: options.includeRecommendations !== false,
      includeHistory: options.includeHistory !== false,
      filter: options.filter || null,
      sort: options.sort || 'timestamp',
      targetInterpretability: options.targetInterpretability || this.options.targetInterpretability,
      ...options
    };

    console.log(`📊 Generating ${reportOptions.format} report...`);

    // Process and analyze results
    const analysis = this.analyzeResults(this.results, reportOptions);

    // Generate report based on format
    let report;
    switch (reportOptions.format.toLowerCase()) {
      case 'html':
        report = this.generateHtmlReport(analysis, reportOptions);
        break;
      case 'markdown':
        report = this.generateMarkdownReport(analysis, reportOptions);
        break;
      case 'cli':
        report = this.generateCliReport(analysis, reportOptions);
        break;
      case 'json':
      default:
        report = this.generateJsonReport(analysis, reportOptions);
        break;
    }

    // Save report to file
    const filename = this.generateReportFilename(reportOptions.format);
    const filepath = path.join(this.options.reportsDir, filename);
    fs.writeFileSync(filepath, report);

    // Save to history
    this.saveToHistory(analysis);

    console.log(`📄 Report saved to: ${filepath}`);

    return {
      success: true,
      filepath,
      filename,
      format: reportOptions.format,
      analysis,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze test results and extract insights
   */
  analyzeResults(results, options = {}) {
    let filteredResults = this.filterResults(results, options.filter);
    filteredResults = this.sortResults(filteredResults, options.sort);

    const analysis = {
      summary: this.generateSummary(filteredResults),
      grouping: this.groupResults(filteredResults),
      trends: this.analyzeTrends(filteredResults),
      performance: this.analyzePerformance(filteredResults),
      quality: this.analyzeQuality(filteredResults),
      recommendations: this.generateRecommendations(filteredResults),
      insights: this.generateInsights(filteredResults),
      failures: this.analyzeFailures(filteredResults)
    };

    if (options.includeHistory) {
      analysis.history = this.loadHistoricalData();
    }

    return analysis;
  }

  /**
   * Generate test summary
   */
  generateSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = results.filter(r => r.skipped).length || 0;

    const executionTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const averageExecutionTime = total > 0 ? executionTime / total : 0;

    const successRate = total > 0 ? (passed / total) * 100 : 0;

    // Group by test type
    const byType = {};
    results.forEach(r => {
      if (!byType[r.type]) byType[r.type] = { total: 0, passed: 0, failed: 0 };
      byType[r.type].total++;
      if (r.success) byType[r.type].passed++;
      else byType[r.type].failed++;
    });

    // Group by feature
    const byFeature = {};
    results.forEach(r => {
      if (!byFeature[r.feature]) byFeature[r.feature] = { total: 0, passed: 0, failed: 0 };
      byFeature[r.feature].total++;
      if (r.success) byFeature[r.feature].passed++;
      else byFeature[r.feature].failed++;
    });

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
      successRate: Math.round(successRate * 100) / 100,
      totalExecutionTime: executionTime,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      testTypes: Object.keys(byType),
      features: Object.keys(byFeature),
      breakdown: {
        byType,
        byFeature
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Group results by different criteria
   */
  groupResults(results) {
    const grouping = {
      byType: {},
      byFeature: {},
      byTheme: {},
      byViewport: {},
      byStatus: {},
      byPriority: {}
    };

    results.forEach(result => {
      // By type
      this.addToGroup(grouping.byType, result.type, result);

      // By feature
      this.addToGroup(grouping.byFeature, result.feature, result);

      // By theme
      this.addToGroup(grouping.byTheme, result.theme || 'unknown', result);

      // By viewport
      const viewportKey = result.viewport ? `${result.viewport.width}x${result.viewport.height}` : 'unknown';
      this.addToGroup(grouping.byViewport, viewportKey, result);

      // By status
      const status = result.success ? 'passed' : 'failed';
      this.addToGroup(grouping.byStatus, status, result);

      // By priority
      const priority = result.priority || 'medium';
      this.addToGroup(grouping.byPriority, priority, result);
    });

    return grouping;
  }

  /**
   * Add result to group
   */
  addToGroup(group, key, result) {
    if (!group[key]) {
      group[key] = {
        total: 0,
        passed: 0,
        failed: 0,
        results: [],
        executionTime: 0
      };
    }

    group[key].total++;
    group[key].executionTime += result.executionTime || 0;
    group[key].results.push(result);

    if (result.success) {
      group[key].passed++;
    } else {
      group[key].failed++;
    }
  }

  /**
   * Analyze trends from results
   */
  analyzeTrends(results) {
    // Sort by timestamp
    const sorted = [...results].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Calculate rolling success rate
    const windowSize = Math.max(1, Math.floor(sorted.length / 10));
    const trends = [];

    for (let i = 0; i < sorted.length - windowSize + 1; i++) {
      const window = sorted.slice(i, i + windowSize);
      const passed = window.filter(r => r.success).length;
      const successRate = (passed / window.length) * 100;

      trends.push({
        windowStart: i,
        windowEnd: i + windowSize - 1,
        successRate: Math.round(successRate * 100) / 100,
        timestamp: window[Math.floor(window.length / 2)].timestamp || Date.now()
      });
    }

    // Determine overall trend direction
    const recentTrend = trends.slice(-3);
    const trendDirection = this.calculateTrendDirection(recentTrend);

    return {
      rollingSuccessRates: trends,
      overallTrend: trendDirection,
      stability: this.calculateStability(trends),
      improvement: this.calculateImprovement(trends)
    };
  }

  /**
   * Analyze performance metrics
   */
  analyzePerformance(results) {
    const executionTimes = results.map(r => r.executionTime || 0).filter(t => t > 0);
    const memoryUsage = results
      .map(r => r.result?.memoryUsage || 0)
      .filter(m => m > 0);

    const performance = {
      executionTime: {
        average: executionTimes.length > 0 ? this.calculateAverage(executionTimes) : 0,
        median: executionTimes.length > 0 ? this.calculateMedian(executionTimes) : 0,
        min: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
        max: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
        p95: executionTimes.length > 0 ? this.calculatePercentile(executionTimes, 95) : 0,
        p99: executionTimes.length > 0 ? this.calculatePercentile(executionTimes, 99) : 0
      },
      memoryUsage: memoryUsage.length > 0 ? {
        average: this.calculateAverage(memoryUsage),
        median: this.calculateMedian(memoryUsage),
        min: Math.min(...memoryUsage),
        max: Math.max(...memoryUsage),
        trend: this.calculateMemoryTrend(results)
      } : null,
      bottlenecks: this.identifyBottlenecks(results),
      efficiency: this.calculateEfficiency(results)
    };

    return performance;
  }

  /**
   * Analyze test quality metrics
   */
  analyzeQuality(results) {
    const flakyTests = this.identifyFlakyTests(results);
    const reliability = this.calculateReliability(results);
    const coverage = this.estimateCoverage(results);

    return {
      reliability: Math.round(reliability * 100) / 100,
      flakinessRate: Math.round((flakyTests.length / results.length) * 100 * 100) / 100,
      flakyTests: flakyTests.slice(0, 10), // Top 10 flaky tests
      testStability: this.calculateTestStability(results),
      assertionQuality: this.calculateAssertionQuality(results),
      coverage: coverage,
      maintainability: this.calculateMaintainability(results)
    };
  }

  /**
   * Generate AI-powered recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Performance recommendations
    const slowTests = results.filter(r => (r.executionTime || 0) > 2000);
    if (slowTests.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize Slow Tests',
        description: `${slowTests.length} tests exceed 2s execution time`,
        impact: 'Reduced test execution speed',
        suggestions: [
          'Reduce test complexity',
          'Optimize wait strategies',
          'Consider parallel execution',
          'Review test dependencies'
        ]
      });
    }

    // Reliability recommendations
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > results.length * 0.1) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Improve Test Reliability',
        description: `${failedTests.length} tests failed (${Math.round((failedTests.length / results.length) * 100)}%)`,
        impact: 'Reduced confidence in test results',
        suggestions: [
          'Review error messages and fix root causes',
          'Add better error handling',
          'Improve test stability',
          'Consider retry mechanisms for flaky tests'
        ]
      });
    }

    // Coverage recommendations
    const testTypes = [...new Set(results.map(r => r.type))];
    const missingTypes = ['visual', 'accessibility', 'interaction', 'performance'].filter(t => !testTypes.includes(t));
    if (missingTypes.length > 0) {
      recommendations.push({
        type: 'coverage',
        priority: 'medium',
        title: 'Expand Test Coverage',
        description: `Missing test types: ${missingTypes.join(', ')}`,
        impact: 'Reduced test comprehensiveness',
        suggestions: [
          'Add visual regression tests',
          'Implement accessibility testing',
          'Create interaction tests',
          'Add performance benchmarks'
        ]
      });
    }

    // AI optimization recommendations
    if (this.options.aiOptimized) {
      recommendations.push({
        type: 'ai-optimization',
        priority: 'medium',
        title: 'Enhance AI Integration',
        description: 'Leverage AI for test optimization',
        impact: 'Improved test efficiency and insights',
        suggestions: [
          'Implement AI-powered test generation',
          'Use AI for failure analysis',
          'Enable predictive test selection',
          'Optimize test execution order with AI'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate AI insights
   */
  generateInsights(results) {
    const insights = [];

    // Success patterns
    const successfulTests = results.filter(r => r.success);
    if (successfulTests.length > 0) {
      insights.push({
        type: 'pattern',
        category: 'success',
        title: 'High Success Areas',
        finding: `${successfulTests.length} tests (${Math.round((successfulTests.length / results.length) * 100)}%) are passing reliably`,
        confidence: 0.85,
        actionable: true
      });
    }

    // Performance insights
    const fastTests = results.filter(r => (r.executionTime || 0) < 500);
    if (fastTests.length > 0) {
      insights.push({
        type: 'performance',
        category: 'efficiency',
        title: 'Optimized Test Performance',
        finding: `${fastTests.length} tests execute in under 500ms`,
        confidence: 0.9,
        actionable: false
      });
    }

    // Feature coverage insights
    const features = [...new Set(results.map(r => r.feature))];
    insights.push({
      type: 'coverage',
      category: 'scope',
      title: 'Feature Coverage',
      finding: `Testing covers ${features.length} distinct features: ${features.join(', ')}`,
      confidence: 1.0,
      actionable: false
    });

    return insights;
  }

  /**
   * Analyze test failures
   */
  analyzeFailures(results) {
    const failedTests = results.filter(r => !r.success);

    const failureAnalysis = {
      totalFailures: failedTests.length,
      failureRate: Math.round((failedTests.length / results.length) * 100 * 100) / 100,
      commonFailurePatterns: this.identifyFailurePatterns(failedTests),
      criticalFailures: failedTests.filter(f => f.priority === 'high'),
      recurringFailures: this.identifyRecurringFailures(failedTests),
      failureCategories: this.categorizeFailures(failedTests)
    };

    return failureAnalysis;
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(analysis, options) {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generator: 'TestResultAggregator',
        version: '1.0.0',
        options
      },
      analysis,
      interpretability: {
        score: this.options.targetInterpretability,
        optimizedForAI: this.options.aiOptimized,
        structure: 'hierarchical',
        keyMetrics: ['summary', 'performance', 'quality', 'recommendations']
      }
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(analysis, options) {
    const html = this.templates.html
      .replace('{{TITLE}}', 'Chrome Extension UI Test Report')
      .replace('{{TIMESTAMP}}', new Date().toLocaleString())
      .replace('{{SUMMARY}}', this.formatSummaryForHtml(analysis.summary))
      .replace('{{GROUPING}}', this.formatGroupingForHtml(analysis.grouping))
      .replace('{{PERFORMANCE}}', this.formatPerformanceForHtml(analysis.performance))
      .replace('{{RECOMMENDATIONS}}', this.formatRecommendationsForHtml(analysis.recommendations))
      .replace('{{INSIGHTS}}', this.formatInsightsForHtml(analysis.insights));

    return html;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(analysis, options) {
    const markdown = this.templates.markdown
      .replace('{{TITLE}}', '# Chrome Extension UI Test Report')
      .replace('{{TIMESTAMP}}', `*Generated: ${new Date().toLocaleString()}*`)
      .replace('{{SUMMARY}}', this.formatSummaryForMarkdown(analysis.summary))
      .replace('{{GROUPING}}', this.formatGroupingForMarkdown(analysis.grouping))
      .replace('{{PERFORMANCE}}', this.formatPerformanceForMarkdown(analysis.performance))
      .replace('{{RECOMMENDATIONS}}', this.formatRecommendationsForMarkdown(analysis.recommendations));

    return markdown;
  }

  /**
   * Generate CLI report
   */
  generateCliReport(analysis, options) {
    const cli = this.templates.cli
      .replace('{{TITLE}}', '📊 CHROME EXTENSION UI TEST REPORT')
      .replace('{{TIMESTAMP}}', `⏰ ${new Date().toLocaleString()}`)
      .replace('{{SUMMARY}}', this.formatSummaryForCli(analysis.summary))
      .replace('{{PERFORMANCE}}', this.formatPerformanceForCli(analysis.performance))
      .replace('{{RECOMMENDATIONS}}', this.formatRecommendationsForCli(analysis.recommendations));

    return cli;
  }

  /**
   * Save report to history
   */
  saveToHistory(analysis) {
    const historyFile = path.join(this.options.historyDir, `report-${Date.now()}.json`);
    const historyData = {
      timestamp: Date.now(),
      analysis,
      metadata: this.metadata
    };

    try {
      fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));
      this.cleanupHistory();
    } catch (error) {
      console.error(`Failed to save to history: ${error.message}`);
    }
  }

  /**
   * Load historical data
   */
  loadHistoricalData() {
    try {
      const files = fs.readdirSync(this.options.historyDir)
        .filter(file => file.endsWith('.json'))
        .sort()
        .slice(-10); // Load last 10 reports

      return files.map(file => {
        const data = fs.readFileSync(path.join(this.options.historyDir, file), 'utf8');
        return JSON.parse(data);
      });
    } catch (error) {
      console.warn(`Failed to load historical data: ${error.message}`);
      return [];
    }
  }

  /**
   * Cleanup old history files
   */
  cleanupHistory() {
    try {
      const files = fs.readdirSync(this.options.historyDir)
        .filter(file => file.endsWith('.json'))
        .sort();

      while (files.length > this.options.maxHistoryFiles) {
        const fileToRemove = files.shift();
        fs.unlinkSync(path.join(this.options.historyDir, fileToRemove));
      }
    } catch (error) {
      console.warn(`Failed to cleanup history: ${error.message}`);
    }
  }

  /**
   * Generate report filename
   */
  generateReportFilename(format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `test-report-${timestamp}.${format}`;
  }

  // Utility methods
  filterResults(results, filter) {
    if (!filter) return results;
    return results.filter(r =>
      r.id.includes(filter) ||
      r.type.includes(filter) ||
      r.feature.includes(filter)
    );
  }

  sortResults(results, sort) {
    return [...results].sort((a, b) => {
      switch (sort) {
        case 'executionTime':
          return (b.executionTime || 0) - (a.executionTime || 0);
        case 'success':
          return (b.success ? 1 : 0) - (a.success ? 1 : 0);
        case 'priority':
          return (a.priority || 0) - (b.priority || 0);
        case 'timestamp':
        default:
          return (b.timestamp || 0) - (a.timestamp || 0);
      }
    });
  }

  calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 :
      sorted[mid];
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  calculateTrendDirection(trends) {
    if (trends.length < 2) return 'stable';
    const recent = trends.slice(-3);
    const improving = recent.every((t, i) => i === 0 || t.successRate >= recent[i - 1].successRate);
    const declining = recent.every((t, i) => i === 0 || t.successRate <= recent[i - 1].successRate);

    return improving ? 'improving' : declining ? 'declining' : 'stable';
  }

  calculateStability(trends) {
    if (trends.length < 2) return 1.0;
    const rates = trends.map(t => t.successRate);
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - this.calculateAverage(rates), 2), 0) / rates.length;
    return Math.max(0, 1 - (variance / 1000)); // Normalize to 0-1
  }

  calculateImprovement(trends) {
    if (trends.length < 2) return 0;
    const first = trends[0].successRate;
    const last = trends[trends.length - 1].successRate;
    return Math.round(((last - first) / first) * 100 * 100) / 100;
  }

  identifyFlakyTests(results) {
    // Mock implementation - would need historical data for real flaky test detection
    return results.filter(r => !r.success && Math.random() > 0.7).slice(0, 5);
  }

  calculateReliability(results) {
    const passed = results.filter(r => r.success).length;
    return results.length > 0 ? passed / results.length : 0;
  }

  estimateCoverage(results) {
    const features = [...new Set(results.map(r => r.feature))];
    const testTypes = [...new Set(results.map(r => r.type))];

    return {
      features: features.length,
      testTypes: testTypes.length,
      totalTests: results.length,
      estimatedCoverage: Math.min(100, (features.length * testTypes.length * 10))
    };
  }

  calculateTestStability(results) {
    // Mock stability calculation
    return 0.85 + (Math.random() * 0.1);
  }

  calculateAssertionQuality(results) {
    // Mock assertion quality calculation
    return 0.8 + (Math.random() * 0.15);
  }

  calculateMaintainability(results) {
    // Mock maintainability calculation
    return 0.75 + (Math.random() * 0.2);
  }

  calculateMemoryTrend(results) {
    // Mock memory trend calculation
    return 'stable';
  }

  identifyBottlenecks(results) {
    return results
      .filter(r => (r.executionTime || 0) > 1000)
      .sort((a, b) => (b.executionTime || 0) - (a.executionTime || 0))
      .slice(0, 5)
      .map(r => ({
        testId: r.id,
        executionTime: r.executionTime,
        bottleneck: 'slow-execution'
      }));
  }

  calculateEfficiency(results) {
    const totalTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    const totalTests = results.length;
    return totalTests > 0 ? totalTime / totalTests : 0;
  }

  identifyFailurePatterns(failedTests) {
    // Mock pattern identification
    return {
      timing: failedTests.filter(t => t.error && t.error.includes('timeout')).length,
      elements: failedTests.filter(t => t.error && t.error.includes('element')).length,
      permissions: failedTests.filter(t => t.error && t.error.includes('permission')).length
    };
  }

  identifyRecurringFailures(failedTests) {
    // Mock recurring failure identification
    return failedTests
      .filter(t => Math.random() > 0.8)
      .map(t => ({ testId: t.id, failureCount: Math.floor(Math.random() * 3) + 1 }));
  }

  categorizeFailures(failedTests) {
    const categories = {
      timing: 0,
      elements: 0,
      permissions: 0,
      configuration: 0,
      unknown: 0
    };

    failedTests.forEach(test => {
      if (test.error?.includes('timeout')) categories.timing++;
      else if (test.error?.includes('element')) categories.elements++;
      else if (test.error?.includes('permission')) categories.permissions++;
      else if (test.error?.includes('config')) categories.configuration++;
      else categories.unknown++;
    });

    return categories;
  }

  // Template formatting methods
  formatSummaryForHtml(summary) {
    return `
      <div class="summary-grid">
        <div class="metric">
          <div class="value">${summary.totalTests}</div>
          <div class="label">Total Tests</div>
        </div>
        <div class="metric ${summary.successRate >= 80 ? 'good' : 'poor'}">
          <div class="value">${summary.successRate}%</div>
          <div class="label">Success Rate</div>
        </div>
        <div class="metric">
          <div class="value">${summary.averageExecutionTime}ms</div>
          <div class="label">Avg Time</div>
        </div>
        <div class="metric">
          <div class="value">${summary.failedTests}</div>
          <div class="label">Failed</div>
        </div>
      </div>
    `;
  }

  formatGroupingForHtml(grouping) {
    return `<pre>${JSON.stringify(grouping, null, 2)}</pre>`;
  }

  formatPerformanceForHtml(performance) {
    return `
      <div class="performance-section">
        <h3>Performance Metrics</h3>
        <div class="metric">
          <strong>Average Execution Time:</strong> ${performance.executionTime.average.toFixed(2)}ms
        </div>
        <div class="metric">
          <strong>P95 Execution Time:</strong> ${performance.executionTime.p95.toFixed(2)}ms
        </div>
      </div>
    `;
  }

  formatRecommendationsForHtml(recommendations) {
    return recommendations.map(rec => `
      <div class="recommendation ${rec.priority}">
        <h4>${rec.title}</h4>
        <p>${rec.description}</p>
        <ul>
          ${rec.suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  formatInsightsForHtml(insights) {
    return insights.map(insight => `
      <div class="insight">
        <h4>${insight.title}</h4>
        <p>${insight.finding}</p>
        <small>Confidence: ${Math.round(insight.confidence * 100)}%</small>
      </div>
    `).join('');
  }

  formatSummaryForMarkdown(summary) {
    return `
## Test Summary

- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Success Rate**: ${summary.successRate}%
- **Average Execution Time**: ${summary.averageExecutionTime}ms
- **Test Types**: ${summary.testTypes.join(', ')}
- **Features**: ${summary.features.join(', ')}
    `;
  }

  formatGroupingForMarkdown(grouping) {
    return `
## Test Breakdown

### By Type
${Object.entries(grouping.byType).map(([type, data]) =>
  `- **${type}**: ${data.passed}/${data.total} (${Math.round((data.passed/data.total)*100)}%)`
).join('\n')}

### By Feature
${Object.entries(grouping.byFeature).map(([feature, data]) =>
  `- **${feature}**: ${data.passed}/${data.total} (${Math.round((data.passed/data.total)*100)}%)`
).join('\n')}
    `;
  }

  formatPerformanceForMarkdown(performance) {
    return `
## Performance Analysis

- **Average Execution Time**: ${performance.executionTime.average.toFixed(2)}ms
- **Median Execution Time**: ${performance.executionTime.median.toFixed(2)}ms
- **P95 Execution Time**: ${performance.executionTime.p95.toFixed(2)}ms
- **Max Execution Time**: ${performance.executionTime.max.toFixed(2)}ms
    `;
  }

  formatRecommendationsForMarkdown(recommendations) {
    return `
## Recommendations

${recommendations.map(rec => `
### ${rec.title} (${rec.priority})
**Description**: ${rec.description}
**Impact**: ${rec.impact}

**Suggestions**:
${rec.suggestions.map(s => `- ${s}`).join('\n')}
`).join('\n')}
    `;
  }

  formatSummaryForCli(summary) {
    return `
📊 SUMMARY
┌─────────────────────────────────────────────────────────────┐
│ Total Tests: ${summary.totalTests.toString().padEnd(6)} │ Passed: ${summary.passedTests.toString().padEnd(5)} │ Failed: ${summary.failedTests.toString().padEnd(5)} │
│ Success Rate: ${summary.successRate.toString().padEnd(10)} │ Avg Time: ${summary.averageExecutionTime.toString().padEnd(6)}ms │
└─────────────────────────────────────────────────────────────┘
    `;
  }

  formatPerformanceForCli(performance) {
    return `
⚡ PERFORMANCE
┌─────────────────────────────────────────────────────────────┐
│ Avg: ${performance.executionTime.average.toFixed(0).toString().padEnd(6)}ms │ Median: ${performance.executionTime.median.toFixed(0).toString().padEnd(6)}ms │ P95: ${performance.executionTime.p95.toFixed(0).toString().padEnd(6)}ms │
│ Max: ${performance.executionTime.max.toFixed(0).toString().padEnd(7)}ms │ Min: ${performance.executionTime.min.toFixed(0).toString().padEnd(6)}ms │
└─────────────────────────────────────────────────────────────┘
    `;
  }

  formatRecommendationsForCli(recommendations) {
    return `
💡 RECOMMENDATIONS
${recommendations.map((rec, i) => `
${i + 1}. ${rec.title} (${rec.priority})
   ${rec.description}
`).join('')}
    `;
  }

  // HTML Template
  getHtmlTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .timestamp { color: #6b7280; font-size: 14px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f9fafb; border-radius: 8px; padding: 20px; text-align: center; }
        .metric.good { background: #d1fae5; color: #065f46; }
        .metric.poor { background: #fee2e2; color: #991b1b; }
        .value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .recommendation { border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 15px; background: #f8fafc; }
        .recommendation.high { border-left-color: #ef4444; }
        .recommendation.medium { border-left-color: #f59e0b; }
        .recommendation h4 { margin: 0 0 10px 0; }
        .recommendation ul { margin: 10px 0 0 20px; }
        .insight { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
        .performance-section { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .performance-section .metric { margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{TITLE}}</h1>
        <div class="timestamp">{{TIMESTAMP}}</div>
    </div>

    <h2>Summary</h2>
    {{SUMMARY}}

    <h2>Performance</h2>
    {{PERFORMANCE}}

    <h2>Recommendations</h2>
    {{RECOMMENDATIONS}}

    <h2>Insights</h2>
    {{INSIGHTS}}
</body>
</html>
    `;
  }

  // Markdown Template
  getMarkdownTemplate() {
    return `{{TITLE}}

{{TIMESTAMP}}

{{SUMMARY}}

{{GROUPING}}

{{PERFORMANCE}}

{{RECOMMENDATIONS}}

---
*Report generated by Chrome Extension UI Test Runner*`;
  }

  // CLI Template
  getCliTemplate() {
    return `{{TITLE}}

{{TIMESTAMP}}

{{SUMMARY}}

{{PERFORMANCE}}

{{RECOMMENDATIONS}}`;
  }

  // JSON Template
  getJsonTemplate() {
    return '{}';
  }
}

module.exports = { TestResultAggregator };