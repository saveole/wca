/**
 * Accessibility Violation Reporter Implementation
 *
 * Comprehensive violation reporting system that integrates with WCAG validation
 * to provide structured reporting with actionable recommendations and performance metrics.
 *
 * Dependencies:
 * - WCAGValidator for validation results
 * - AccessibilityReport for report generation
 * - ErrorHandler for error management
 * - Chrome extension context
 */

const ErrorHandler = require('./error-handler.js');
const { AccessibilityReport } = require('../models/AccessibilityReport.js');

/**
 * Accessibility Violation Reporter Class
 *
 * Provides comprehensive violation reporting with:
 * - Structured violation categorization
 * - Actionable recommendations
 * - Performance metrics
 * - Export functionality
 * - Integration with existing reporting infrastructure
 */
class ViolationReporter {
  constructor(options = {}) {
    this.options = {
      includeRecommendations: true,
      includeCodeSnippets: true,
      includePerformanceMetrics: true,
      exportFormats: ['json', 'csv', 'html'],
      severityLevels: ['critical', 'serious', 'moderate', 'minor', 'cosmetic'],
      ...options
    };

    // Error handler for reporting operations
    this.errorHandler = new ErrorHandler({
      context: 'ViolationReporter',
      logErrors: true,
      throwErrors: false
    });

    // Performance metrics
    this.performanceMetrics = {
      validationTime: 0,
      reportingTime: 0,
      exportTime: 0,
      totalViolations: 0,
      violationsBySeverity: {},
      violationsByCategory: {}
    };

    // Violation severity definitions
    this.severityDefinitions = {
      critical: {
        description: 'Prevents access for users with disabilities',
        impact: 'Complete barrier to access',
        urgency: 'Fix immediately',
        examples: ['Missing form labels', 'No keyboard access', 'Empty links']
      },
      serious: {
        description: 'Significantly impacts usability for users with disabilities',
        impact: 'Major difficulty in use',
        urgency: 'Fix soon',
        examples: ['Low contrast text', 'Missing alt text', 'Invalid ARIA attributes']
      },
      moderate: {
        description: 'Creates moderate difficulties for users with disabilities',
        impact: 'Some difficulty in use',
        urgency: 'Fix when possible',
        examples: ['Poor focus management', 'Missing skip links', 'Inconsistent navigation']
      },
      minor: {
        description: 'Minor inconvenience for users with disabilities',
        impact: 'Minor difficulty in use',
        urgency: 'Fix when convenient',
        examples: ['Missing landmarks', 'Poor heading structure', 'Missing language attribute']
      },
      cosmetic: {
        description: 'Visual or cosmetic issues that don\'t impact functionality',
        impact: 'No impact on functionality',
        urgency: 'Fix if time permits',
        examples: ['Visual alignment', 'Color usage', 'Visual spacing']
      }
    };

    // WCAG category mappings
    this.categoryMappings = {
      'text-alternatives': 'Perceivable',
      'time-based-media': 'Perceivable',
      'adaptable': 'Perceivable',
      'distinguishable': 'Perceivable',
      'keyboard-accessible': 'Operable',
      'enough-time': 'Operable',
      'seizures': 'Operable',
      'navigable': 'Operable',
      'input-modalities': 'Operable',
      'readable': 'Understandable',
      'predictable': 'Understandable',
      'input-assistance': 'Understandable',
      'compatible': 'Robust'
    };

    // Recommendation templates
    this.recommendationTemplates = {
      'text-alternatives': {
        fix: 'Provide alternative text that describes the content and function',
        test: 'Verify alt text conveys the same meaning as the visual content',
        examples: [
          'For images: Use descriptive alt text like "Chart showing quarterly revenue growth"',
          'For icons: Use alt text that describes the action like "Save to Notion"',
          'For complex images: Provide detailed description in surrounding text'
        ]
      },
      'contrast': {
        fix: 'Increase contrast ratio to at least 4.5:1 for normal text and 3:1 for large text',
        test: 'Use contrast checker tools to verify WCAG compliance',
        examples: [
          'Text on background: Use darker text on lighter backgrounds or vice versa',
          'Links and buttons: Ensure sufficient contrast in both default and hover states',
          'Form fields: Maintain contrast for placeholder text and input values'
        ]
      },
      'keyboard': {
        fix: 'Ensure all interactive elements are keyboard accessible and follow logical order',
        test: 'Navigate using Tab key and verify all elements are reachable and usable',
        examples: [
          'Form fields: Ensure Tab order matches visual order',
          'Custom widgets: Implement keyboard navigation and interaction',
          'Menus: Provide keyboard access and escape to close'
        ]
      },
      'focus': {
        fix: 'Implement visible focus indicators and logical focus management',
        test: 'Tab through interface and verify focus is always visible and logical',
        examples: [
          'Focus indicators: Use high contrast outlines or backgrounds',
          'Focus management: Prevent focus trapping in modals',
          'Skip links: Provide skip navigation links for keyboard users'
        ]
      },
      'aria': {
        fix: 'Use ARIA attributes correctly and only when necessary',
        test: 'Verify ARIA attributes match the actual state and behavior',
        examples: [
          'Labels: Use aria-label or aria-labelledby when visible labels aren\'t available',
          'States: Ensure aria-expanded matches the actual state',
          'Roles: Use appropriate roles for custom widgets'
        ]
      }
    };
  }

  /**
   * Generate comprehensive violation report from validation results
   * @param {Object} validationResults - Results from WCAG validation
   * @param {Object} options - Reporting options
   * @returns {Promise<Object>} Complete violation report
   */
  async generateReport(validationResults, options = {}) {
    const startTime = performance.now();

    try {
      const reportOptions = { ...this.options, ...options };

      // Initialize report structure
      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          validator: 'WCAGValidator',
          standard: 'WCAG 2.1 Level AA',
          reportVersion: '1.0.0',
          options: reportOptions
        },
        summary: this.generateSummary(validationResults),
        violations: this.processViolations(validationResults.violations || []),
        recommendations: reportOptions.includeRecommendations ?
          this.generateRecommendations(validationResults.violations || []) : [],
        performance: this.generatePerformanceMetrics(validationResults),
        codeSnippets: reportOptions.includeCodeSnippets ?
          this.generateCodeSnippets(validationResults.violations || []) : []
      };

      // Update performance metrics
      this.performanceMetrics.reportingTime = performance.now() - startTime;
      this.performanceMetrics.totalViolations = report.violations.length;

      return report;
    } catch (error) {
      this.errorHandler.handleError('Failed to generate violation report', error);
      throw error;
    }
  }

  /**
   * Generate report summary
   * @param {Object} validationResults - Validation results
   * @returns {Object} Report summary
   */
  generateSummary(validationResults) {
    const violations = validationResults.violations || [];

    const summary = {
      totalViolations: violations.length,
      violationsBySeverity: {},
      violationsByCategory: {},
      violationsByRule: {},
      passRate: validationResults.passRate || 0,
      testCount: validationResults.testCount || 0,
      criticalIssues: 0,
      seriousIssues: 0,
      complianceLevel: this.calculateComplianceLevel(violations)
    };

    // Categorize violations
    violations.forEach(violation => {
      const severity = violation.severity || 'minor';
      const category = this.categoryMappings[violation.rule] || 'Unknown';
      const rule = violation.rule || 'unknown';

      // Count by severity
      summary.violationsBySeverity[severity] = (summary.violationsBySeverity[severity] || 0) + 1;

      // Count by category
      summary.violationsByCategory[category] = (summary.violationsByCategory[category] || 0) + 1;

      // Count by rule
      summary.violationsByRule[rule] = (summary.violationsByRule[rule] || 0) + 1;

      // Count critical and serious issues
      if (severity === 'critical') summary.criticalIssues++;
      if (severity === 'serious') summary.seriousIssues++;
    });

    return summary;
  }

  /**
   * Process and categorize violations
   * @param {Array} violations - Array of violation objects
   * @returns {Array} Processed violations with enhanced information
   */
  processViolations(violations) {
    return violations.map(violation => {
      const severity = this.determineSeverity(violation);
      const category = this.categoryMappings[violation.rule] || 'Unknown';

      const processedViolation = {
        id: violation.id || this.generateViolationId(violation),
        rule: violation.rule,
        title: violation.title || this.generateViolationTitle(violation),
        description: violation.description || '',
        severity: severity,
        category: category,
        impact: this.severityDefinitions[severity].impact,
        urgency: this.severityDefinitions[severity].urgency,
        targets: violation.targets || [],
        help: violation.help || '',
        helpUrl: violation.helpUrl || '',
        tags: this.generateViolationTags(violation),
        reproducible: this.isReproducible(violation),
        fixable: this.isFixable(violation),
        recommendation: this.options.includeRecommendations ?
          this.generateViolationRecommendation(violation) : null
      };

      return processedViolation;
    });
  }

  /**
   * Generate actionable recommendations
   * @param {Array} violations - Array of violations
   * @returns {Array} Actionable recommendations
   */
  generateRecommendations(violations) {
    const recommendations = [];
    const processedRules = new Set();

    violations.forEach(violation => {
      if (!processedRules.has(violation.rule)) {
        const recommendation = this.generateViolationRecommendation(violation);
        if (recommendation) {
          recommendations.push({
            rule: violation.rule,
            category: this.categoryMappings[violation.rule] || 'Unknown',
            priority: this.determineRecommendationPriority(violation),
            recommendation: recommendation,
            estimatedEffort: this.estimateFixEffort(violation),
            affectedElements: violation.targets ? violation.targets.length : 0,
            resources: this.getFixResources(violation)
          });
          processedRules.add(violation.rule);
        }
      }
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate violation-specific recommendation
   * @param {Object} violation - Violation object
   * @returns {Object} Recommendation object
   */
  generateViolationRecommendation(violation) {
    const rule = violation.rule;
    const template = this.recommendationTemplates[rule];

    if (template) {
      return {
        fix: template.fix,
        test: template.test,
        examples: template.examples,
        impact: this.severityDefinitions[this.determineSeverity(violation)].description,
        tools: this.getRecommendedTools(rule)
      };
    }

    // Generic recommendation for unknown rules
    return {
      fix: 'Review and fix the accessibility issue based on WCAG guidelines',
      test: 'Test with assistive technologies to verify the fix',
      examples: ['Consult WCAG documentation for specific guidance'],
      impact: this.severityDefinitions[this.determineSeverity(violation)].description,
      tools: this.getRecommendedTools('generic')
    };
  }

  /**
   * Generate performance metrics
   * @param {Object} validationResults - Validation results
   * @returns {Object} Performance metrics
   */
  generatePerformanceMetrics(validationResults) {
    return {
      validationTime: validationResults.validationTime || 0,
      reportingTime: this.performanceMetrics.reportingTime,
      totalProcessingTime: (validationResults.validationTime || 0) + this.performanceMetrics.reportingTime,
      violationsPerSecond: this.calculateViolationsPerSecond(validationResults),
      memoryUsage: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate code snippets for violations
   * @param {Array} violations - Array of violations
   * @returns {Array} Code snippets
   */
  generateCodeSnippets(violations) {
    return violations.map(violation => {
      return {
        violationId: violation.id || this.generateViolationId(violation),
        problematicCode: this.extractProblematicCode(violation),
        suggestedFix: this.generateSuggestedFix(violation),
        explanation: this.generateCodeExplanation(violation)
      };
    }).filter(snippet => snippet.problematicCode || snippet.suggestedFix);
  }

  /**
   * Export report in specified format
   * @param {Object} report - Complete violation report
   * @param {string} format - Export format ('json', 'csv', 'html')
   * @returns {Promise<string>} Exported report content
   */
  async exportReport(report, format = 'json') {
    const startTime = performance.now();

    try {
      let exportedContent;

      switch (format.toLowerCase()) {
        case 'json':
          exportedContent = JSON.stringify(report, null, 2);
          break;
        case 'csv':
          exportedContent = this.exportToCsv(report);
          break;
        case 'html':
          exportedContent = this.exportToHtml(report);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      this.performanceMetrics.exportTime = performance.now() - startTime;
      return exportedContent;
    } catch (error) {
      this.errorHandler.handleError(`Failed to export report in ${format} format`, error);
      throw error;
    }
  }

  /**
   * Export report to CSV format
   * @param {Object} report - Complete violation report
   * @returns {string} CSV content
   */
  exportToCsv(report) {
    const headers = [
      'ID', 'Rule', 'Title', 'Severity', 'Category', 'Impact', 'Urgency',
      'Description', 'Recommendation', 'Fixable', 'Reproducible'
    ];

    const rows = report.violations.map(violation => [
      violation.id,
      violation.rule,
      `"${violation.title}"`,
      violation.severity,
      violation.category,
      `"${violation.impact}"`,
      violation.urgency,
      `"${violation.description}"`,
      `"${violation.recommendation?.fix || ''}"`,
      violation.fixable,
      violation.reproducible
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Export report to HTML format
   * @param {Object} report - Complete violation report
   * @returns {string} HTML content
   */
  exportToHtml(report) {
    const { summary, violations, recommendations } = report;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Violation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .summary-card.critical { border-left-color: #dc3545; }
        .summary-card.serious { border-left-color: #fd7e14; }
        .severity-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
        .severity-critical { background: #dc3545; }
        .severity-serious { background: #fd7e14; }
        .severity-moderate { background: #ffc107; color: #212529; }
        .severity-minor { background: #6c757d; }
        .severity-cosmetic { background: #17a2b8; }
        .violation { background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 20px; padding: 20px; }
        .violation-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .violation-title { font-weight: bold; color: #333; }
        .violation-description { color: #666; margin-bottom: 15px; }
        .recommendation { background: #e8f5e8; padding: 15px; border-radius: 4px; margin-top: 15px; }
        .recommendation h4 { margin-top: 0; color: #155724; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Accessibility Violation Report</h1>
            <p>Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
            <p>Standard: ${report.metadata.standard}</p>
        </div>

        <div class="section">
            <h2>Summary</h2>
            <div class="summary">
                <div class="summary-card">
                    <h3>Total Violations</h3>
                    <p style="font-size: 24px; font-weight: bold;">${summary.totalViolations}</p>
                </div>
                <div class="summary-card critical">
                    <h3>Critical Issues</h3>
                    <p style="font-size: 24px; font-weight: bold;">${summary.criticalIssues}</p>
                </div>
                <div class="summary-card serious">
                    <h3>Serious Issues</h3>
                    <p style="font-size: 24px; font-weight: bold;">${summary.seriousIssues}</p>
                </div>
                <div class="summary-card">
                    <h3>Compliance Level</h3>
                    <p style="font-size: 24px; font-weight: bold;">${summary.complianceLevel}%</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Violations (${violations.length})</h2>
            ${violations.map(violation => `
                <div class="violation">
                    <div class="violation-header">
                        <div class="violation-title">${violation.title}</div>
                        <span class="severity-badge severity-${violation.severity}">${violation.severity.toUpperCase()}</span>
                    </div>
                    <div><strong>Rule:</strong> ${violation.rule}</div>
                    <div><strong>Category:</strong> ${violation.category}</div>
                    <div><strong>Impact:</strong> ${violation.impact}</div>
                    <div><strong>Urgency:</strong> ${violation.urgency}</div>
                    <div class="violation-description">${violation.description}</div>
                    ${violation.recommendation ? `
                        <div class="recommendation">
                            <h4>Recommendation</h4>
                            <p><strong>Fix:</strong> ${violation.recommendation.fix}</p>
                            <p><strong>Test:</strong> ${violation.recommendation.test}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        ${recommendations.length > 0 ? `
        <div class="section">
            <h2>Recommendations (${recommendations.length})</h2>
            ${recommendations.map(rec => `
                <div class="recommendation">
                    <h4>${rec.rule} (${rec.category})</h4>
                    <p><strong>Priority:</strong> ${rec.priority}/5</p>
                    <p><strong>Estimated Effort:</strong> ${rec.estimatedEffort}</p>
                    <p><strong>Fix:</strong> ${rec.recommendation.fix}</p>
                    <p><strong>Test:</strong> ${rec.recommendation.test}</p>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }

  // Helper methods

  determineSeverity(violation) {
    if (violation.severity) return violation.severity;

    // Determine severity based on rule and impact
    const criticalRules = ['keyboard-accessible', 'text-alternatives'];
    const seriousRules = ['contrast', 'focus', 'aria'];

    if (criticalRules.includes(violation.rule)) return 'critical';
    if (seriousRules.includes(violation.rule)) return 'serious';

    return 'moderate';
  }

  generateViolationId(violation) {
    return `${violation.rule}-${violation.targets?.[0]?.selector || 'unknown'}-${Date.now()}`;
  }

  generateViolationTitle(violation) {
    const rule = violation.rule.replace(/-/g, ' ');
    return rule.charAt(0).toUpperCase() + rule.slice(1) + ' violation';
  }

  generateViolationTags(violation) {
    const tags = [];
    tags.push(violation.severity);
    tags.push(this.categoryMappings[violation.rule] || 'Unknown');

    if (violation.targets && violation.targets.length > 1) {
      tags.push('multiple-elements');
    }

    return tags;
  }

  isReproducible(violation) {
    return violation.targets && violation.targets.length > 0;
  }

  isFixable(violation) {
    // Most accessibility violations are fixable
    return true;
  }

  determineRecommendationPriority(violation) {
    const severity = this.determineSeverity(violation);
    const priorityMap = {
      critical: 1,
      serious: 2,
      moderate: 3,
      minor: 4,
      cosmetic: 5
    };
    return priorityMap[severity] || 3;
  }

  estimateFixEffort(violation) {
    const severity = this.determineSeverity(violation);
    const effortMap = {
      critical: 'High',
      serious: 'Medium-High',
      moderate: 'Medium',
      minor: 'Low',
      cosmetic: 'Very Low'
    };
    return effortMap[severity] || 'Medium';
  }

  getFixResources(violation) {
    return [
      'WCAG 2.1 Guidelines',
      'WAI-ARIA Authoring Practices',
      'Accessibility testing tools documentation'
    ];
  }

  getRecommendedTools(rule) {
    const tools = {
      'text-alternatives': ['Screen readers', 'Alt text testers'],
      'contrast': ['Color contrast analyzers', 'Color blindness simulators'],
      'keyboard': ['Keyboard navigation testing', 'Screen reader testing'],
      'focus': ['Visual focus indicators testing', 'Keyboard navigation testing'],
      'aria': ['ARIA validation tools', 'Screen reader testing']
    };

    return tools[rule] || ['General accessibility testing tools'];
  }

  calculateComplianceLevel(violations) {
    const totalTests = 100; // This would be dynamic in real implementation
    const passedTests = totalTests - violations.length;
    return Math.round((passedTests / totalTests) * 100);
  }

  calculateViolationsPerSecond(validationResults) {
    const time = validationResults.validationTime || 1000;
    const violations = validationResults.violations?.length || 0;
    return violations > 0 ? (violations / (time / 1000)).toFixed(2) : 0;
  }

  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
      };
    }
    return 'N/A';
  }

  extractProblematicCode(violation) {
    // This would extract actual HTML/CSS code from violation targets
    return violation.targets?.[0]?.html || 'Code snippet not available';
  }

  generateSuggestedFix(violation) {
    // This would generate actual code fixes
    return 'Fix suggestion based on violation type';
  }

  generateCodeExplanation(violation) {
    return `This code violates ${violation.rule} because ${violation.description}`;
  }
}

// Export for use in test files
module.exports = {
  ViolationReporter
};