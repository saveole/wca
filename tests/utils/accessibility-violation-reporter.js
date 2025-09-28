/**
 * Accessibility Violation Reporter
 *
 * Comprehensive violation reporting system for accessibility test results
 * with structured reporting, actionable recommendations, and integration
 * with existing error handling and test infrastructure.
 *
 * Features:
 * - Structured violation categorization
 * - Actionable recommendations
 * - Multiple export formats
 * - Performance benchmarking
 * - Integration with WCAG validator
 * - Compliance scoring
 * - Trend analysis
 */

const ErrorHandler = require('./error-handler.js');
const AccessibilityReport = require('../models/AccessibilityReport.js');
const TestConfiguration = require('../models/test-configuration.js');

class AccessibilityViolationReporter {
  constructor(options = {}) {
    this.options = {
      includeRecommendations: true,
      includeCodeSnippets: true,
      includePerformanceMetrics: true,
      exportFormats: ['json', 'html', 'csv'],
      severityThreshold: 'medium',
      complianceTarget: 'WCAG2.1AA',
      maxViolationsPerReport: 1000,
      ...options
    };

    this.errorHandler = new ErrorHandler({
      context: 'AccessibilityViolationReporter',
      logErrors: true
    });

    // Severity levels with colors and weights
    this.severityLevels = {
      critical: { weight: 5, color: '#dc2626', description: 'Blocks access for users with disabilities' },
      serious: { weight: 4, color: '#ea580c', description: 'Major barriers for users with disabilities' },
      moderate: { weight: 3, color: '#f59e0b', description: 'Difficulties for some users with disabilities' },
      minor: { weight: 2, color: '#84cc16', description: 'Minor difficulties for some users' },
      informational: { weight: 1, color: '#06b6d4', description: 'Recommendations for improvement' }
    };

    // Violation categories
    this.categories = {
      'perceivable': {
        description: 'Information and UI components must be presentable in ways users can perceive',
        guidelines: ['1.1', '1.2', '1.3', '1.4']
      },
      'operable': {
        description: 'UI components and navigation must be operable',
        guidelines: ['2.1', '2.2', '2.3', '2.4', '2.5']
      },
      'understandable': {
        description: 'Information and UI operation must be understandable',
        guidelines: ['3.1', '3.2', '3.3']
      },
      'robust': {
        description: 'Content must be robust enough for various assistive technologies',
        guidelines: ['4.1']
      }
    };

    // WCAG success criteria mapping
    this.successCriteria = {
      '1.1.1': 'Non-text Content',
      '1.2.1': 'Audio-only and Video-only (Prerecorded)',
      '1.2.2': 'Captions (Prerecorded)',
      '1.2.3': 'Audio Description or Media Alternative (Prerecorded)',
      '1.2.4': 'Captions (Live)',
      '1.2.5': 'Audio Description (Prerecorded)',
      '1.3.1': 'Info and Relationships',
      '1.3.2': 'Meaningful Sequence',
      '1.3.3': 'Sensory Characteristics',
      '1.4.1': 'Use of Color',
      '1.4.2': 'Audio Control',
      '1.4.3': 'Contrast (Minimum)',
      '1.4.4': 'Resize Text',
      '1.4.5': 'Images of Text',
      '1.4.6': 'Contrast (Enhanced)',
      '1.4.7': 'Low or No Background Audio',
      '1.4.8': 'Visual Presentation',
      '1.4.9': 'Images of Text (No Exception)',
      '1.4.10': 'Reflow',
      '1.4.11': 'Non-text Contrast',
      '1.4.12': 'Text Spacing',
      '1.4.13': 'Content on Hover or Focus',
      '2.1.1': 'Keyboard',
      '2.1.2': 'No Keyboard Trap',
      '2.1.3': 'Keyboard (No Exception)',
      '2.1.4': 'Character Key Shortcuts',
      '2.2.1': 'Timing Adjustable',
      '2.2.2': 'Pause, Stop, Hide',
      '2.3.1': 'Three Flashes or Below Threshold',
      '2.4.1': 'Bypass Blocks',
      '2.4.2': 'Page Titled',
      '2.4.3': 'Focus Order',
      '2.4.4': 'Link Purpose (In Context)',
      '2.4.5': 'Multiple Ways',
      '2.4.6': 'Headings and Labels',
      '2.4.7': 'Focus Visible',
      '2.5.1': 'Pointer Gestures',
      '2.5.2': 'Pointer Cancellation',
      '2.5.3': 'Label in Name',
      '2.5.4': 'Motion Actuation',
      '2.5.5': 'Target Size',
      '2.5.6': 'Concurrent Input Mechanisms',
      '3.1.1': 'Language of Page',
      '3.1.2': 'Language of Parts',
      '3.2.1': 'On Focus',
      '3.2.2': 'On Input',
      '3.2.3': 'Consistent Navigation',
      '3.2.4': 'Consistent Identification',
      '3.3.1': 'Error Identification',
      '3.3.2': 'Labels or Instructions',
      '3.3.3': 'Error Suggestion',
      '3.3.4': 'Error Prevention (Legal, Financial, Data)',
      '3.3.5': 'Help',
      '3.3.6': 'Error Prevention (All)',
      '4.1.1': 'Parsing',
      '4.1.2': 'Name, Role, Value',
      '4.1.3': 'Status Messages'
    };

    // Performance benchmarks
    this.performanceMetrics = {
      reportGeneration: { target: 100, unit: 'ms' },
      violationAnalysis: { target: 50, unit: 'ms' },
      recommendationGeneration: { target: 30, unit: 'ms' },
      exportOperation: { target: 200, unit: 'ms' }
    };
  }

  /**
   * Generate comprehensive accessibility violation report
   */
  async generateReport(violations, options = {}) {
    const startTime = performance.now();

    try {
      const reportOptions = { ...this.options, ...options };

      // Filter violations by severity threshold
      const filteredViolations = this.filterViolationsBySeverity(violations, reportOptions.severityThreshold);

      // Categorize violations
      const categorizedViolations = this.categorizeViolations(filteredViolations);

      // Generate recommendations
      const recommendations = reportOptions.includeRecommendations
        ? await this.generateRecommendations(categorizedViolations)
        : [];

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(categorizedViolations);

      // Analyze trends
      const trends = this.analyzeTrends(categorizedViolations);

      // Generate performance metrics
      const metrics = reportOptions.includePerformanceMetrics
        ? this.generatePerformanceMetrics(startTime)
        : null;

      // Create report structure
      const report = new AccessibilityReport({
        id: `accessibility-report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        violations: categorizedViolations,
        recommendations,
        complianceScore,
        trends,
        metrics,
        summary: {
          totalViolations: filteredViolations.length,
          criticalCount: categorizedViolations.critical?.length || 0,
          seriousCount: categorizedViolations.serious?.length || 0,
          moderateCount: categorizedViolations.moderate?.length || 0,
          minorCount: categorizedViolations.minor?.length || 0,
          informationalCount: categorizedViolations.informational?.length || 0,
          categories: this.getCategorySummary(categorizedViolations),
          complianceLevel: this.getComplianceLevel(complianceScore)
        }
      });

      return report;
    } catch (error) {
      this.errorHandler.handleError('Failed to generate accessibility report', error);
      throw error;
    }
  }

  /**
   * Filter violations by severity threshold
   */
  filterViolationsBySeverity(violations, threshold) {
    const severityOrder = ['critical', 'serious', 'moderate', 'minor', 'informational'];
    const thresholdIndex = severityOrder.indexOf(threshold);

    if (thresholdIndex === -1) {
      return violations;
    }

    return violations.filter(violation => {
      const violationIndex = severityOrder.indexOf(violation.severity);
      return violationIndex <= thresholdIndex;
    });
  }

  /**
   * Categorize violations by severity and category
   */
  categorizeViolations(violations) {
    const categorized = {
      bySeverity: {},
      byCategory: {},
      bySuccessCriterion: {}
    };

    violations.forEach(violation => {
      // Categorize by severity
      if (!categorized.bySeverity[violation.severity]) {
        categorized.bySeverity[violation.severity] = [];
      }
      categorized.bySeverity[violation.severity].push(violation);

      // Categorize by category
      const category = this.determineViolationCategory(violation);
      if (!categorized.byCategory[category]) {
        categorized.byCategory[category] = [];
      }
      categorized.byCategory[category].push(violation);

      // Categorize by success criterion
      const criterion = violation.successCriterion || 'unknown';
      if (!categorized.bySuccessCriterion[criterion]) {
        categorized.bySuccessCriterion[criterion] = [];
      }
      categorized.bySuccessCriterion[criterion].push(violation);
    });

    return categorized;
  }

  /**
   * Determine violation category based on success criterion
   */
  determineViolationCategory(violation) {
    const criterion = violation.successCriterion;
    if (!criterion) return 'unknown';

    const guideline = criterion.split('.')[0];
    switch (guideline) {
      case '1': return 'perceivable';
      case '2': return 'operable';
      case '3': return 'understandable';
      case '4': return 'robust';
      default: return 'unknown';
    }
  }

  /**
   * Generate actionable recommendations for violations
   */
  async generateRecommendations(categorizedViolations) {
    const recommendations = [];

    // Process each severity level
    Object.entries(categorizedViolations.bySeverity || {}).forEach(([severity, violations]) => {
      violations.forEach(violation => {
        const recommendation = this.generateViolationRecommendation(violation);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      });
    });

    // Generate category-specific recommendations
    Object.entries(categorizedViolations.byCategory || {}).forEach(([category, violations]) => {
      const categoryRecommendation = this.generateCategoryRecommendation(category, violations);
      if (categoryRecommendation) {
        recommendations.push(categoryRecommendation);
      }
    });

    return recommendations;
  }

  /**
   * Generate recommendation for a specific violation
   */
  generateViolationRecommendation(violation) {
    const recommendationTemplates = {
      'missing-alt-text': {
        priority: 'high',
        action: 'Add descriptive alt text to images',
        code: `<img src="image.jpg" alt="${this.generateAltTextExample(violation)}">`,
        explanation: 'Alt text provides context for screen reader users and when images fail to load'
      },
      'poor-contrast': {
        priority: 'high',
        action: 'Improve color contrast ratio',
        code: `/* Current contrast: ${violation.details?.contrastRatio || 'unknown'} */
.element {
  color: #333333;  /* Dark text */
  background: #ffffff;  /* Light background */
}`,
        explanation: 'Contrast ratio should be at least 4.5:1 for normal text'
      },
      'missing-form-labels': {
        priority: 'high',
        action: 'Add labels to form inputs',
        code: `<label for="username">Username:</label>
<input type="text" id="username" name="username">`,
        explanation: 'Labels help screen reader users understand form field purposes'
      },
      'keyboard-trap': {
        priority: 'critical',
        action: 'Ensure keyboard navigation can escape all elements',
        code: `// Handle Escape key
element.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    element.blur();
    // Return focus to previous element
  }
});`,
        explanation: 'Users must be able to navigate in and out of all elements using keyboard'
      }
    };

    const template = recommendationTemplates[violation.type] || {
      priority: this.getPriorityFromSeverity(violation.severity),
      action: 'Fix accessibility violation',
      code: violation.codeSnippet || '',
      explanation: violation.description || 'Address this accessibility issue'
    };

    return {
      id: `rec-${violation.id}`,
      violationId: violation.id,
      priority: template.priority,
      action: template.action,
      code: template.code,
      explanation: template.explanation,
      resources: this.getResourcesForViolation(violation),
      estimatedEffort: this.estimateEffort(violation)
    };
  }

  /**
   * Generate category-specific recommendations
   */
  generateCategoryRecommendation(category, violations) {
    const categoryInfo = this.categories[category];
    if (!categoryInfo) return null;

    return {
      id: `rec-category-${category}`,
      type: 'category',
      category,
      priority: 'medium',
      action: `Improve ${category} accessibility`,
      explanation: categoryInfo.description,
      affectedGuidelines: categoryInfo.guidelines,
      violationCount: violations.length,
      resources: this.getResourcesForCategory(category)
    };
  }

  /**
   * Calculate compliance score
   */
  calculateComplianceScore(categorizedViolations) {
    const totalWeight = Object.values(this.severityLevels).reduce((sum, level) => sum + level.weight, 0);
    const violations = categorizedViolations.bySeverity || {};

    let violationWeight = 0;
    Object.entries(violations).forEach(([severity, severityViolations]) => {
      const level = this.severityLevels[severity];
      if (level) {
        violationWeight += severityViolations.length * level.weight;
      }
    });

    // Score is 100 - (violation weight penalty)
    const penalty = Math.min((violationWeight / totalWeight) * 100, 100);
    return Math.max(0, Math.round(100 - penalty));
  }

  /**
   * Analyze trends in violations
   */
  analyzeTrends(categorizedViolations) {
    const trends = {
      severityDistribution: {},
      categoryDistribution: {},
      commonIssues: []
    };

    // Severity distribution
    Object.keys(this.severityLevels).forEach(severity => {
      const count = categorizedViolations.bySeverity?.[severity]?.length || 0;
      trends.severityDistribution[severity] = count;
    });

    // Category distribution
    Object.keys(this.categories).forEach(category => {
      const count = categorizedViolations.byCategory?.[category]?.length || 0;
      trends.categoryDistribution[category] = count;
    });

    // Common issues (simplified - would need historical data for real trends)
    const allViolations = Object.values(categorizedViolations.bySeverity || {}).flat();
    const typeCounts = {};
    allViolations.forEach(violation => {
      typeCounts[violation.type] = (typeCounts[violation.type] || 0) + 1;
    });

    trends.commonIssues = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return trends;
  }

  /**
   * Generate performance metrics
   */
  generatePerformanceMetrics(startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      reportGenerationTime: duration,
      violationsProcessed: Object.values(this.severityLevels).reduce((sum, level) => sum + level.weight, 0),
      recommendationsGenerated: 0, // Will be populated
      benchmarks: {
        reportGeneration: {
          actual: duration,
          target: this.performanceMetrics.reportGeneration.target,
          passed: duration <= this.performanceMetrics.reportGeneration.target
        }
      }
    };
  }

  /**
   * Export report in various formats
   */
  async exportReport(report, format = 'json') {
    const startTime = performance.now();

    try {
      switch (format) {
        case 'json':
          return this.exportToJSON(report);
        case 'html':
          return this.exportToHTML(report);
        case 'csv':
          return this.exportToCSV(report);
        case 'markdown':
          return this.exportToMarkdown(report);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.errorHandler.handleError(`Failed to export report in ${format} format`, error);
      throw error;
    }
  }

  /**
   * Export to JSON format
   */
  exportToJSON(report) {
    return JSON.stringify(report.toJSON ? report.toJSON() : report, null, 2);
  }

  /**
   * Export to HTML format
   */
  exportToHTML(report) {
    const summary = report.summary;
    const score = summary.complianceScore;
    const level = summary.complianceLevel;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${report.id}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .score { font-size: 48px; font-weight: bold; margin: 10px 0; }
        .level { font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .number { font-size: 32px; font-weight: bold; color: #007bff; }
        .violations { margin-bottom: 30px; }
        .violation-section { margin-bottom: 30px; }
        .violation-section h3 { color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; }
        .violation { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .violation.critical { border-left: 4px solid #dc2626; }
        .violation.serious { border-left: 4px solid #ea580c; }
        .violation.moderate { border-left: 4px solid #f59e0b; }
        .violation.minor { border-left: 4px solid #84cc16; }
        .violation.informational { border-left: 4px solid #06b6d4; }
        .recommendations { background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .recommendation { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #28a745; }
        code { background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Report</h1>
        <div class="score">${score}/100</div>
        <div class="level">${level}</div>
        <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Total Violations</h3>
            <div class="number">${summary.totalViolations}</div>
        </div>
        <div class="summary-card">
            <h3>Critical</h3>
            <div class="number" style="color: #dc2626;">${summary.criticalCount}</div>
        </div>
        <div class="summary-card">
            <h3>Serious</h3>
            <div class="number" style="color: #ea580c;">${summary.seriousCount}</div>
        </div>
        <div class="summary-card">
            <h3>Moderate</h3>
            <div class="number" style="color: #f59e0b;">${summary.moderateCount}</div>
        </div>
    </div>

    <div class="violations">
        ${this.generateViolationsHTML(report.violations.bySeverity || {})}
    </div>

    ${this.generateRecommendationsHTML(report.recommendations || [])}

    <div class="summary">
        <div class="summary-card">
            <h3>Compliance Level</h3>
            <div class="number" style="color: ${score >= 90 ? '#28a745' : score >= 70 ? '#ffc107' : '#dc3545'};">
                ${level}
            </div>
        </div>
        <div class="summary-card">
            <h3>WCAG Standard</h3>
            <div class="number">${this.options.complianceTarget}</div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate violations HTML section
   */
  generateViolationsHTML(violationsBySeverity) {
    let html = '';

    Object.entries(violationsBySeverity).forEach(([severity, violations]) => {
      const level = this.severityLevels[severity];
      html += `
        <div class="violation-section">
            <h3 style="color: ${level.color};">${severity.toUpperCase()} (${violations.length})</h3>
            ${violations.map(violation => `
                <div class="violation ${severity}">
                    <h4>${violation.title || 'Unknown Issue'}</h4>
                    <p><strong>Success Criterion:</strong> ${violation.successCriterion || 'Unknown'}</p>
                    <p>${violation.description || 'No description available'}</p>
                    ${violation.codeSnippet ? `<pre><code>${violation.codeSnippet}</code></pre>` : ''}
                </div>
            `).join('')}
        </div>
      `;
    });

    return html;
  }

  /**
   * Generate recommendations HTML section
   */
  generateRecommendationsHTML(recommendations) {
    if (recommendations.length === 0) return '';

    return `
        <div class="recommendations">
            <h3>Recommendations</h3>
            ${recommendations.map(rec => `
                <div class="recommendation">
                    <h4>${rec.action}</h4>
                    <p><strong>Priority:</strong> ${rec.priority}</p>
                    <p>${rec.explanation}</p>
                    ${rec.code ? `<pre><code>${rec.code}</code></pre>` : ''}
                </div>
            `).join('')}
        </div>
    `;
  }

  /**
   * Export to CSV format
   */
  exportToCSV(report) {
    const violations = Object.values(report.violations.bySeverity || {}).flat();
    const headers = ['ID', 'Severity', 'Title', 'Success Criterion', 'Description', 'Category'];

    const rows = violations.map(violation => [
      violation.id,
      violation.severity,
      violation.title || '',
      violation.successCriterion || '',
      violation.description || '',
      this.determineViolationCategory(violation)
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Export to Markdown format
   */
  exportToMarkdown(report) {
    const summary = report.summary;

    let markdown = `# Accessibility Report\n\n`;
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
    markdown += `**Compliance Score:** ${summary.complianceScore}/100\n`;
    markdown += `**Compliance Level:** ${summary.complianceLevel}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `- **Total Violations:** ${summary.totalViolations}\n`;
    markdown += `- **Critical:** ${summary.criticalCount}\n`;
    markdown += `- **Serious:** ${summary.seriousCount}\n`;
    markdown += `- **Moderate:** ${summary.moderateCount}\n`;
    markdown += `- **Minor:** ${summary.minorCount}\n\n`;

    // Add violations by severity
    Object.entries(report.violations.bySeverity || {}).forEach(([severity, violations]) => {
      if (violations.length > 0) {
        markdown += `## ${severity.toUpperCase()} (${violations.length})\n\n`;
        violations.forEach(violation => {
          markdown += `### ${violation.title || 'Unknown Issue'}\n`;
          markdown += `- **Success Criterion:** ${violation.successCriterion || 'Unknown'}\n`;
          markdown += `- **Description:** ${violation.description || 'No description'}\n\n`;
        });
      }
    });

    // Add recommendations
    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.recommendations.forEach(rec => {
        markdown += `### ${rec.action}\n`;
        markdown += `- **Priority:** ${rec.priority}\n`;
        markdown += `- **Explanation:** ${rec.explanation}\n\n`;
      });
    }

    return markdown;
  }

  /**
   * Get compliance level based on score
   */
  getComplianceLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Get category summary
   */
  getCategorySummary(categorizedViolations) {
    const summary = {};
    Object.entries(categorizedViolations.byCategory || {}).forEach(([category, violations]) => {
      summary[category] = violations.length;
    });
    return summary;
  }

  /**
   * Get priority from severity
   */
  getPriorityFromSeverity(severity) {
    const severityToPriority = {
      critical: 'high',
      serious: 'high',
      moderate: 'medium',
      minor: 'low',
      informational: 'low'
    };
    return severityToPriority[severity] || 'medium';
  }

  /**
   * Generate example alt text
   */
  generateAltTextExample(violation) {
    const examples = [
      'Descriptive text explaining the image content',
      'Screenshot of application interface showing main features',
      'Company logo with tagline',
      'Chart showing quarterly revenue growth'
    ];
    return examples[Math.floor(Math.random() * examples.length)];
  }

  /**
   * Get resources for violation type
   */
  getResourcesForViolation(violation) {
    const resources = {
      'missing-alt-text': [
        'https://www.w3.org/WAI/tutorials/images/',
        'https://webaim.org/techniques/alttext/'
      ],
      'poor-contrast': [
        'https://webaim.org/articles/contrast/',
        'https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast'
      ],
      'missing-form-labels': [
        'https://www.w3.org/WAI/tutorials/forms/',
        'https://webaim.org/techniques/forms/'
      ],
      'keyboard-trap': [
        'https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html',
        'https://webaim.org/techniques/keyboard/'
      ]
    };

    return resources[violation.type] || [
      'https://www.w3.org/WAI/WCAG21/quickref/',
      'https://webaim.org/standards/wcag/'
    ];
  }

  /**
   * Get resources for category
   */
  getResourcesForCategory(category) {
    const categoryResources = {
      perceivable: [
        'https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=131',
        'https://webaim.org/standards/wcag/checklist/'
      ],
      operable: [
        'https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=231',
        'https://webaim.org/techniques/keyboard/'
      ],
      understandable: [
        'https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=331',
        'https://webaim.org/techniques/cognitive/'
      ],
      robust: [
        'https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=431',
        'https://webaim.org/standards/wcag/checklist/'
      ]
    };

    return categoryResources[category] || [
      'https://www.w3.org/WAI/WCAG21/quickref/',
      'https://webaim.org/standards/wcag/'
    ];
  }

  /**
   * Estimate effort for fixing violation
   */
  estimateEffort(violation) {
    const effortMap = {
      'missing-alt-text': 'Low (5-15 minutes)',
      'poor-contrast': 'Low (10-30 minutes)',
      'missing-form-labels': 'Medium (30-60 minutes)',
      'keyboard-trap': 'High (1-2 hours)',
      'structural-issues': 'High (2-4 hours)',
      'aria-implementation': 'High (1-3 hours)'
    };

    return effortMap[violation.type] || 'Medium (30-60 minutes)';
  }

  /**
   * Get summary statistics
   */
  getSummaryStatistics(report) {
    return {
      totalViolations: report.summary.totalViolations,
      criticalViolations: report.summary.criticalCount,
      seriousViolations: report.summary.seriousCount,
      moderateViolations: report.summary.moderateCount,
      minorViolations: report.summary.minorCount,
      informationalViolations: report.summary.informationalCount,
      complianceScore: report.summary.complianceScore,
      complianceLevel: report.summary.complianceLevel,
      mostAffectedCategory: this.getMostAffectedCategory(report.violations.byCategory || {}),
      topIssue: this.getTopIssue(report.violations.bySeverity || {})
    };
  }

  /**
   * Get most affected category
   */
  getMostAffectedCategory(categories) {
    let maxCount = 0;
    let mostAffected = 'unknown';

    Object.entries(categories).forEach(([category, violations]) => {
      if (violations.length > maxCount) {
        maxCount = violations.length;
        mostAffected = category;
      }
    });

    return { category: mostAffected, count: maxCount };
  }

  /**
   * Get top issue
   */
  getTopIssue(severities) {
    const severityOrder = ['critical', 'serious', 'moderate', 'minor', 'informational'];

    for (const severity of severityOrder) {
      const violations = severities[severity];
      if (violations && violations.length > 0) {
        return { severity, count: violations.length };
      }
    }

    return { severity: 'none', count: 0 };
  }
}

module.exports = AccessibilityViolationReporter;