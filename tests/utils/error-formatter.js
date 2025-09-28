/**
 * User-Friendly Error Message Formatting
 *
 * Provides comprehensive error message formatting for different audiences
 * with clear explanations, actionable suggestions, and context-aware output.
 */

import { TestError, ERROR_SEVERITY, ERROR_CATEGORIES } from './error-handler.js';

/**
 * Error formatting configuration
 */
const ERROR_FORMATTER_CONFIG = {
  // Output formats
  formats: {
    CONSOLE: 'console',           // Rich console output with colors
    JSON: 'json',                 // Structured JSON for AI tools
    MARKDOWN: 'markdown',         // Markdown for documentation
    HTML: 'html',                 // HTML for web interfaces
    PLAIN_TEXT: 'plain_text'       // Simple text output
  },

  // Audience types
  audiences: {
    DEVELOPER: 'developer',         // Technical developers
    TESTER: 'tester',              // QA engineers
    CI_SYSTEM: 'ci_system',        // CI/CD systems
    AI_TOOL: 'ai_tool',           // AI coding tools
    END_USER: 'end_user'          // Non-technical users
  },

  // Verbosity levels
  verbosity: {
    MINIMAL: 0,                    // Essential information only
    NORMAL: 1,                    // Standard output with context
    DETAILED: 2,                  // Full information with debugging
    DEBUG: 3                      // Everything including internal state
  },

  // Formatting options
  options: {
    includeStack: true,
    includeContext: true,
    includeSuggestions: true,
    includeRecoveryInfo: true,
    includeMetrics: true,
    maxContextDepth: 3,
    maxSuggestions: 3,
    truncateLongMessages: true,
    maxMessageLength: 200
  }
};

/**
 * Error category templates
 */
const CATEGORY_TEMPLATES = {
  [ERROR_CATEGORIES.SCREENSHOT]: {
    title: 'Screenshot Error',
    icon: '📸',
    color: '#FF6B6B',
    description: 'Failed to capture or compare screenshot images',
    commonCauses: [
      'Element not visible or available',
      'Page still loading or unstable',
      'Viewport size mismatch',
      'File permission issues',
      'Image format incompatibility'
    ],
    quickFixes: [
      'Increase timeout before screenshot',
      'Wait for element to be visible',
      'Check viewport configuration',
      'Verify file system permissions'
    ]
  },

  [ERROR_CATEGORIES.ACCESSIBILITY]: {
    title: 'Accessibility Error',
    icon: '♿',
    color: '#4ECDC4',
    description: 'WCAG accessibility compliance issue detected',
    commonCauses: [
      'Missing ARIA labels',
      'Insufficient color contrast',
      'Keyboard navigation issues',
      'Missing form labels',
      'Improper heading structure'
    ],
    quickFixes: [
      'Add appropriate ARIA attributes',
      'Improve color contrast ratios',
      'Ensure keyboard accessibility',
      'Add proper form labels',
      'Review heading hierarchy'
    ]
  },

  [ERROR_CATEGORIES.TIMEOUT]: {
    title: 'Timeout Error',
    icon: '⏰',
    color: '#FFA726',
    description: 'Operation exceeded allowed time limit',
    commonCauses: [
      'Slow network connection',
      'Complex page rendering',
      'Element not appearing',
      'Heavy JavaScript processing',
      'Server response delays'
    ],
    quickFixes: [
      'Increase timeout values',
      'Optimize test performance',
      'Check network connectivity',
      'Simplify test steps',
      'Add explicit waits'
    ]
  },

  [ERROR_CATEGORIES.CONFIGURATION]: {
    title: 'Configuration Error',
    icon: '⚙️',
    color: '#AB47BC',
    description: 'Invalid or missing configuration settings',
    commonCauses: [
      'Missing required settings',
      'Invalid configuration format',
      'Environment variable issues',
      'File permission problems',
      'Conflicting settings'
    ],
    quickFixes: [
      'Verify configuration syntax',
      'Check required parameters',
      'Review environment settings',
      'Validate file permissions',
      'Resolve conflicts'
    ]
  },

  [ERROR_CATEGORIES.NETWORK]: {
    title: 'Network Error',
    icon: '🌐',
    color: '#42A5F5',
    description: 'Network connectivity or API communication failed',
    commonCauses: [
      'No internet connection',
      'API server down',
      'Firewall blocking requests',
      'Invalid API credentials',
      'Rate limiting exceeded'
    ],
    quickFixes: [
      'Check network connectivity',
      'Verify API server status',
      'Review firewall settings',
      'Validate API credentials',
      'Reduce request frequency'
    ]
  },

  [ERROR_CATEGORIES.FILE_SYSTEM]: {
    title: 'File System Error',
    icon: '📁',
    color: '#66BB6A',
    description: 'File or directory operation failed',
    commonCauses: [
      'Insufficient permissions',
      'Disk space exhausted',
      'File locked by another process',
      'Invalid file path',
      'Directory not found'
    ],
    quickFixes: [
      'Check file permissions',
      'Free up disk space',
      'Close competing processes',
      'Verify file paths',
      'Create required directories'
    ]
  },

  [ERROR_CATEGORIES.PERFORMANCE]: {
    title: 'Performance Error',
    icon: '📊',
    color: '#FFCA28',
    description: 'Performance threshold exceeded',
    commonCauses: [
      'Too many simultaneous tests',
      'Complex visual comparisons',
      'Large screenshot images',
      'Memory limitations',
      'CPU resource constraints'
    ],
    quickFixes: [
      'Reduce test concurrency',
      'Optimize screenshot settings',
      'Increase memory limits',
      'Simplify test operations',
      'Use smaller viewports'
    ]
  },

  [ERROR_CATEGORIES.VALIDATION]: {
    title: 'Validation Error',
    icon: '✅',
    color: '#EF5350',
    description: 'Input validation or data format error',
    commonCauses: [
      'Invalid data format',
      'Missing required fields',
      'Data type mismatch',
      'Value out of range',
      'Schema validation failed'
    ],
    quickFixes: [
      'Verify data format requirements',
      'Provide all required fields',
      'Check data types',
      'Ensure values are in valid range',
      'Review schema definition'
    ]
  }
};

/**
 * Error severity levels
 */
const SEVERITY_LEVELS = {
  [ERROR_SEVERITY.CRITICAL]: {
    level: 4,
    label: 'Critical',
    emoji: '🚨',
    color: '#D32F2F',
    action: 'Requires immediate attention'
  },
  [ERROR_SEVERITY.HIGH]: {
    level: 3,
    label: 'High',
    emoji: '⚠️',
    color: '#F57C00',
    action: 'Should be addressed soon'
  },
  [ERROR_SEVERITY.MEDIUM]: {
    level: 2,
    label: 'Medium',
    emoji: '⚡',
    color: '#FBC02D',
    action: 'Should be addressed when convenient'
  },
  [ERROR_SEVERITY.LOW]: {
    level: 1,
    label: 'Low',
    emoji: 'ℹ️',
    color: '#689F38',
    action: 'Informational, can be deferred'
  },
  [ERROR_SEVERITY.INFO]: {
    level: 0,
    label: 'Info',
    emoji: '💡',
    color: '#1976D2',
    action: 'For information only'
  }
};

/**
 * Error formatter class
 */
class ErrorFormatter {
  constructor(config = {}) {
    this.config = { ...ERROR_FORMATTER_CONFIG, ...config };
  }

  /**
   * Format error for specific audience and format
   */
  formatError(error, options = {}) {
    const {
      audience = this.config.audiences.DEVELOPER,
      format = this.config.formats.CONSOLE,
      verbosity = this.config.verbosity.NORMAL,
      ...formatOptions
    } = options;

    const effectiveConfig = { ...this.config.options, ...formatOptions };

    // Ensure we have a TestError
    const testError = error instanceof TestError ? error : TestError.fromError(error);

    // Get category template
    const categoryTemplate = CATEGORY_TEMPLATES[testError.category] || CATEGORY_TEMPLATES[ERROR_CATEGORIES.UNKNOWN];

    // Get severity info
    const severityInfo = SEVERITY_LEVELS[testError.severity] || SEVERITY_LEVELS[ERROR_SEVERITY.MEDIUM];

    // Format based on requested format
    switch (format) {
      case this.config.formats.CONSOLE:
        return this.formatConsole(testError, categoryTemplate, severityInfo, audience, verbosity, effectiveConfig);

      case this.config.formats.JSON:
        return this.formatJSON(testError, categoryTemplate, severityInfo, audience, verbosity, effectiveConfig);

      case this.config.formats.MARKDOWN:
        return this.formatMarkdown(testError, categoryTemplate, severityInfo, audience, verbosity, effectiveConfig);

      case this.config.formats.HTML:
        return this.formatHTML(testError, categoryTemplate, severityInfo, audience, verbosity, effectiveConfig);

      case this.config.formats.PLAIN_TEXT:
        return this.formatPlainText(testError, categoryTemplate, severityInfo, audience, verbosity, effectiveConfig);

      default:
        return this.formatConsole(testError, categoryTemplate, severityInfo, audience, verbosity, effectiveConfig);
    }
  }

  /**
   * Format for console output with colors and rich formatting
   */
  formatConsole(error, categoryTemplate, severityInfo, audience, verbosity, config) {
    const lines = [];

    // Header with emoji and color
    lines.push(`${severityInfo.emoji} ${categoryTemplate.icon} ${categoryTemplate.title}`);

    // Severity and category info
    lines.push(`   Severity: ${severityInfo.label} (${error.category})`);
    lines.push(`   Action: ${severityInfo.action}`);

    // Main message
    const message = config.truncateLongMessages && error.message.length > config.maxMessageLength
      ? error.message.substring(0, config.maxMessageLength) + '...'
      : error.message;
    lines.push(`   Message: ${message}`);

    // Context information
    if (config.includeContext && error.context && verbosity >= this.config.verbosity.NORMAL) {
      lines.push(`   Context: ${this.formatContext(error.context, config)}`);
    }

    // Suggestions
    if (config.includeSuggestions && error.suggestions.length > 0 && verbosity >= this.config.verbosity.NORMAL) {
      lines.push('   Suggestions:');
      error.suggestions.slice(0, config.maxSuggestions).forEach((suggestion, index) => {
        lines.push(`     ${index + 1}. ${suggestion}`);
      });
    }

    // Category-specific information
    if (verbosity >= this.config.verbosity.DETAILED) {
      lines.push(`   Description: ${categoryTemplate.description}`);

      if (audience === this.config.audiences.DEVELOPER) {
        lines.push('   Common Causes:');
        categoryTemplate.commonCauses.forEach(cause => {
          lines.push(`     - ${cause}`);
        });

        lines.push('   Quick Fixes:');
        categoryTemplate.quickFixes.forEach(fix => {
          lines.push(`     - ${fix}`);
        });
      }
    }

    // Recovery information
    if (config.includeRecoveryInfo && verbosity >= this.config.verbosity.NORMAL) {
      lines.push(`   Recoverable: ${error.recoverable ? 'Yes' : 'No'}`);
      lines.push(`   Strategy: ${error.recoveryStrategy}`);
      if (error.retryCount > 0) {
        lines.push(`   Retries: ${error.retryCount}`);
      }
    }

    // Stack trace for developers
    if (config.includeStack && error.stack && audience === this.config.audiences.DEVELOPER && verbosity >= this.config.verbosity.DETAILED) {
      lines.push('   Stack Trace:');
      error.stack.split('\n').forEach(line => {
        lines.push(`     ${line}`);
      });
    }

    // Metrics
    if (config.includeMetrics && verbosity >= this.config.verbosity.DEBUG) {
      lines.push(`   Error ID: ${error.id}`);
      lines.push(`   Timestamp: ${error.timestamp}`);
      lines.push(`   Test ID: ${error.context?.testId || 'unknown'}`);
    }

    return lines.join('\n');
  }

  /**
   * Format as structured JSON for AI tools
   */
  formatJSON(error, categoryTemplate, severityInfo, audience, verbosity, config) {
    const result = {
      error: {
        id: error.id,
        type: 'TestError',
        category: error.category,
        severity: error.severity,
        message: error.message,
        recoverable: error.recoverable,
        recoveryStrategy: error.recoveryStrategy,
        retryCount: error.retryCount,
        timestamp: error.timestamp
      },
      classification: {
        title: categoryTemplate.title,
        description: categoryTemplate.description,
        severityLevel: severityInfo.level,
        requiredAction: severityInfo.action
      },
      actionable: {
        suggestions: error.suggestions.slice(0, config.maxSuggestions),
        commonCauses: categoryTemplate.commonCauses,
        quickFixes: categoryTemplate.quickFixes
      }
    };

    // Add context based on verbosity
    if (config.includeContext && error.context && verbosity >= this.config.verbosity.NORMAL) {
      result.context = this.formatContextForJSON(error.context, config);
    }

    // Add technical details for developers
    if (audience === this.config.audiences.DEVELOPER && verbosity >= this.config.verbosity.DETAILED) {
      if (config.includeStack && error.stack) {
        result.error.stack = error.stack;
      }
    }

    // Add metrics for debugging
    if (config.includeMetrics && verbosity >= this.config.verbosity.DEBUG) {
      result.metrics = {
        timestamp: error.timestamp,
        errorId: error.id,
        audience,
        verbosity,
        formattedAt: new Date().toISOString()
      };
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Format as Markdown for documentation
   */
  formatMarkdown(error, categoryTemplate, severityInfo, audience, verbosity, config) {
    const lines = [];

    // Header
    lines.push(`# ${severityInfo.emoji} ${categoryTemplate.title}`);
    lines.push('');

    // Severity badge
    lines.push(`**Severity:** ${severityInfo.label} (${error.category})`);
    lines.push('');

    // Message
    lines.push('**Message:**');
    lines.push('```');
    lines.push(error.message);
    lines.push('```');
    lines.push('');

    // Description
    lines.push('**Description:**');
    lines.push(categoryTemplate.description);
    lines.push('');

    // Required action
    lines.push('**Required Action:**');
    lines.push(severityInfo.action);
    lines.push('');

    // Suggestions
    if (config.includeSuggestions && error.suggestions.length > 0) {
      lines.push('**Suggestions:**');
      lines.push('');
      error.suggestions.slice(0, config.maxSuggestions).forEach((suggestion, index) => {
        lines.push(`${index + 1}. ${suggestion}`);
      });
      lines.push('');
    }

    // Context
    if (config.includeContext && error.context && verbosity >= this.config.verbosity.NORMAL) {
      lines.push('**Context:**');
      lines.push('```json');
      lines.push(JSON.stringify(error.context, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Recovery info
    if (config.includeRecoveryInfo && verbosity >= this.config.verbosity.NORMAL) {
      lines.push('**Recovery Information:**');
      lines.push(`- Recoverable: ${error.recoverable ? 'Yes' : 'No'}`);
      lines.push(`- Strategy: ${error.recoveryStrategy}`);
      if (error.retryCount > 0) {
        lines.push(`- Retries attempted: ${error.retryCount}`);
      }
      lines.push('');
    }

    // Technical details
    if (audience === this.config.audiences.DEVELOPER && verbosity >= this.config.verbosity.DETAILED) {
      lines.push('## Technical Details');
      lines.push('');

      lines.push('### Common Causes');
      categoryTemplate.commonCauses.forEach(cause => {
        lines.push(`- ${cause}`);
      });
      lines.push('');

      lines.push('### Quick Fixes');
      categoryTemplate.quickFixes.forEach(fix => {
        lines.push(`- ${fix}`);
      });
      lines.push('');

      if (config.includeStack && error.stack) {
        lines.push('### Stack Trace');
        lines.push('```');
        lines.push(error.stack);
        lines.push('```');
      }
    }

    return lines.join('\n');
  }

  /**
   * Format as HTML for web interfaces
   */
  formatHTML(error, categoryTemplate, severityInfo, audience, verbosity, config) {
    const severityColor = severityInfo.color;
    const categoryColor = categoryTemplate.color;

    let html = `
<div class="error-container" style="border-left: 4px solid ${severityColor}; margin: 10px 0; padding: 15px; background: #f8f9fa;">
  <div class="error-header" style="display: flex; align-items: center; margin-bottom: 10px;">
    <span class="error-emoji" style="font-size: 24px; margin-right: 10px;">${severityInfo.emoji}</span>
    <div>
      <h3 class="error-title" style="margin: 0; color: ${severityColor};">
        ${categoryTemplate.icon} ${categoryTemplate.title}
      </h3>
      <div class="error-severity" style="font-size: 12px; color: #666;">
        Severity: <span style="color: ${severityColor}; font-weight: bold;">${severityInfo.label}</span>
        (${error.category}) - ${severityInfo.action}
      </div>
    </div>
  </div>

  <div class="error-message" style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px; border: 1px solid #ddd;">
    <strong>Message:</strong><br>
    ${this.escapeHtml(error.message)}
  </div>
`;

    // Add suggestions
    if (config.includeSuggestions && error.suggestions.length > 0) {
      html += `
  <div class="error-suggestions" style="margin: 10px 0;">
    <strong>Suggestions:</strong>
    <ul style="margin: 5px 0; padding-left: 20px;">
`;
      error.suggestions.slice(0, config.maxSuggestions).forEach(suggestion => {
        html += `      <li>${this.escapeHtml(suggestion)}</li>\n`;
      });
      html += `
    </ul>
  </div>
`;
    }

    // Add context
    if (config.includeContext && error.context && verbosity >= this.config.verbosity.NORMAL) {
      html += `
  <div class="error-context" style="margin: 10px 0;">
    <strong>Context:</strong>
    <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${this.escapeHtml(JSON.stringify(error.context, null, 2))}</pre>
  </div>
`;
    }

    // Add recovery info
    if (config.includeRecoveryInfo && verbosity >= this.config.verbosity.NORMAL) {
      html += `
  <div class="error-recovery" style="margin: 10px 0; font-size: 12px; color: #666;">
    <strong>Recovery:</strong>
    Recoverable: ${error.recoverable ? 'Yes' : 'No'} |
    Strategy: ${error.recoveryStrategy}
    ${error.retryCount > 0 ? ` | Retries: ${error.retryCount}` : ''}
  </div>
`;
    }

    html += '</div>';
    return html;
  }

  /**
   * Format as plain text for simple output
   */
  formatPlainText(error, categoryTemplate, severityInfo, audience, verbosity, config) {
    const lines = [];

    // Header
    lines.push(`${categoryTemplate.title} (${severityInfo.label})`);
    lines.push('');

    // Message
    lines.push(`Message: ${error.message}`);
    lines.push('');

    // Description
    if (verbosity >= this.config.verbosity.NORMAL) {
      lines.push(`Description: ${categoryTemplate.description}`);
      lines.push('');
    }

    // Required action
    lines.push(`Required Action: ${severityInfo.action}`);
    lines.push('');

    // Suggestions
    if (config.includeSuggestions && error.suggestions.length > 0) {
      lines.push('Suggestions:');
      error.suggestions.slice(0, config.maxSuggestions).forEach((suggestion, index) => {
        lines.push(`  ${index + 1}. ${suggestion}`);
      });
      lines.push('');
    }

    // Recovery info
    if (config.includeRecoveryInfo && verbosity >= this.config.verbosity.NORMAL) {
      lines.push(`Recovery: ${error.recoverable ? 'Recoverable' : 'Not recoverable'}`);
      lines.push(`Strategy: ${error.recoveryStrategy}`);
      if (error.retryCount > 0) {
        lines.push(`Retries: ${error.retryCount}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format context object for display
   */
  formatContext(context, config) {
    if (!context || typeof context !== 'object') {
      return String(context);
    }

    const formatted = {};
    let depth = 0;

    function formatObject(obj, currentDepth) {
      if (currentDepth >= config.maxContextDepth) {
        return '[max depth reached]';
      }

      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.length > 5 ? `[Array with ${obj.length} items]` : obj;
      }

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = formatObject(value, currentDepth + 1);
      }

      return result;
    }

    return JSON.stringify(formatObject(context, depth), null, 2);
  }

  /**
   * Format context for JSON output
   */
  formatContextForJSON(context, config) {
    // Simplify context for JSON to avoid circular references
    const simplified = {};

    function simplify(obj, currentDepth = 0) {
      if (currentDepth >= config.maxContextDepth) {
        return '[max depth reached]';
      }

      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => simplify(item, currentDepth + 1));
      }

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = simplify(value, currentDepth + 1);
      }

      return result;
    }

    return simplify(context);
  }

  /**
   * Escape HTML content
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format multiple errors for batch output
   */
  formatErrors(errors, options = {}) {
    return errors.map(error => this.formatError(error, options)).join('\n\n---\n\n');
  }

  /**
   * Create a summary of multiple errors
   */
  formatErrorSummary(errors, options = {}) {
    const { format = this.config.formats.CONSOLE } = options;

    // Group by category
    const byCategory = {};
    const bySeverity = {};

    errors.forEach(error => {
      const category = error.category || ERROR_CATEGORIES.UNKNOWN;
      const severity = error.severity || ERROR_SEVERITY.MEDIUM;

      byCategory[category] = (byCategory[category] || 0) + 1;
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    });

    if (format === this.config.formats.JSON) {
      return JSON.stringify({
        totalErrors: errors.length,
        byCategory,
        bySeverity,
        summary: this.generateSummaryText(byCategory, bySeverity)
      }, null, 2);
    }

    // Text summary
    const lines = [
      `Error Summary (${errors.length} errors):`,
      '',
      'By Category:',
      ...Object.entries(byCategory).map(([category, count]) => {
        const template = CATEGORY_TEMPLATES[category];
        return `  ${template?.icon || '❓'} ${category}: ${count}`;
      }),
      '',
      'By Severity:',
      ...Object.entries(bySeverity).map(([severity, count]) => {
        const info = SEVERITY_LEVELS[severity];
        return `  ${info?.emoji || '❓'} ${severity}: ${count}`;
      }),
      '',
      this.generateSummaryText(byCategory, bySeverity)
    ];

    return lines.join('\n');
  }

  /**
   * Generate summary text
   */
  generateSummaryText(byCategory, bySeverity) {
    const lines = [];

    // Most critical issues
    const criticalCount = bySeverity[ERROR_SEVERITY.CRITICAL] || 0;
    if (criticalCount > 0) {
      lines.push(`🚨 ${criticalCount} critical error${criticalCount > 1 ? 's' : ''} require immediate attention`);
    }

    // Most common category
    const mostCommon = Object.entries(byCategory).sort(([,a], [,b]) => b - a)[0];
    if (mostCommon) {
      const [category, count] = mostCommon;
      const template = CATEGORY_TEMPLATES[category];
      lines.push(`${template?.icon || '❓'} Most common issue: ${category} (${count} occurrence${count > 1 ? 's' : ''})`);
    }

    return lines.join('\n');
  }
}

/**
 * Global formatter instance
 */
const globalErrorFormatter = new ErrorFormatter();

/**
 * Format error with global formatter
 */
export function formatError(error, options = {}) {
  return globalErrorFormatter.formatError(error, options);
}

/**
 * Format multiple errors
 */
export function formatErrors(errors, options = {}) {
  return globalErrorFormatter.formatErrors(errors, options);
}

/**
 * Format error summary
 */
export function formatErrorSummary(errors, options = {}) {
  return globalErrorFormatter.formatErrorSummary(errors, options);
}

/**
 * Get user-friendly message
 */
export function getUserFriendlyMessage(error, options = {}) {
  const formatter = new ErrorFormatter({
    ...ERROR_FORMATTER_CONFIG,
    options: {
      ...ERROR_FORMATTER_CONFIG.options,
      includeStack: false,
      includeContext: false,
      maxSuggestions: 1,
      ...options
    }
  });

  return formatter.formatError(error, {
    audience: ERROR_FORMATTER_CONFIG.audiences.END_USER,
    format: ERROR_FORMATTER_CONFIG.formats.PLAIN_TEXT,
    verbosity: ERROR_FORMATTER_CONFIG.verbosity.MINIMAL
  });
}

export default {
  ErrorFormatter,
  formatError,
  formatErrors,
  formatErrorSummary,
  getUserFriendlyMessage,
  globalErrorFormatter,
  ERROR_FORMATTER_CONFIG,
  CATEGORY_TEMPLATES,
  SEVERITY_LEVELS
};