/**
 * Comprehensive Error Handling and User-Friendly Error Messages Utility
 *
 * Provides sophisticated error handling capabilities including:
 * - Error classification and categorization
 * - User-friendly error message formatting
 * - Error recovery and fallback mechanisms
 * - Error context preservation and reporting
 * - Asynchronous error handling
 * - Cross-component error propagation
 * - Error logging and analytics
 * - Graceful degradation strategies
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Error Classification and Categorization System
 */
class ErrorClassifier {
  constructor(options = {}) {
    this.options = {
      categories: options.categories || [
        'network', 'timeout', 'validation', 'permission', 'resource',
        'system', 'user', 'integration', 'configuration'
      ],
      severityLevels: options.severityLevels || ['low', 'medium', 'high', 'critical'],
      autoCategorization: options.autoCategorization !== false,
      ...options
    };
    this.errorPatterns = this.initializeErrorPatterns();
    this.classificationCache = new Map();
  }

  /**
   * Initialize error classification patterns
   */
  initializeErrorPatterns() {
    return {
      network: [
        /network|connection|fetch|request|http/i,
        /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i,
        /50[0-9]|40[0-9]/i
      ],
      timeout: [
        /timeout|timed out|exceeded|deadline/i,
        /TimeoutError/i
      ],
      validation: [
        /validation|invalid|required|format/i,
        /ValidationError|SchemaError/i
      ],
      permission: [
        /permission|denied|access|unauthorized/i,
        /PermissionError|NotAllowedError/i
      ],
      resource: [
        /memory|disk|cpu|resource|exhausted/i,
        /OutOfMemoryError|ResourceError/i
      ]
    };
  }

  /**
   * Classify error by type and severity
   */
  async classifyError(errorContext) {
    const { error, context } = errorContext;
    const errorKey = this.generateErrorKey(error);

    // Check cache first
    if (this.classificationCache.has(errorKey)) {
      return this.classificationCache.get(errorKey);
    }

    const classification = {
      type: this.extractErrorType(error),
      category: this.determineCategory(error),
      severity: this.assessSeverity(error, context),
      recoverable: this.isRecoverable(error),
      userAction: this.suggestUserAction(error),
      technicalDetails: this.extractTechnicalDetails(error),
      timestamp: Date.now()
    };

    // Cache the classification
    this.classificationCache.set(errorKey, classification);

    return classification;
  }

  /**
   * Extract error type from error object
   */
  extractErrorType(error) {
    if (error.name) return error.name;
    if (error.constructor?.name) return error.constructor.name;
    return error.message?.split(':')[0] || 'UnknownError';
  }

  /**
   * Determine error category based on patterns
   */
  determineCategory(error) {
    const errorMessage = error.message || '';
    const errorName = error.name || '';

    for (const [category, patterns] of Object.entries(this.errorPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(errorMessage) || pattern.test(errorName)) {
          return category;
        }
      }
    }

    return 'system'; // Default category
  }

  /**
   * Assess error severity based on context
   */
  assessSeverity(error, context = {}) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';

    // Critical errors
    if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
      return 'critical';
    }

    // High severity errors
    if (errorName.includes('permission') || errorMessage.includes('denied')) {
      return 'high';
    }

    // Medium severity errors
    if (errorName.includes('timeout') || errorMessage.includes('timeout')) {
      return 'medium';
    }

    // Low severity errors
    if (errorName.includes('validation') || errorMessage.includes('invalid')) {
      return 'low';
    }

    // Default to medium severity
    return 'medium';
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error) {
    const unrecoverableTypes = [
      'CriticalError',
      'FatalError',
      'SecurityError',
      'PermissionDeniedError'
    ];

    return !unrecoverableTypes.includes(error.name);
  }

  /**
   * Suggest user action based on error
   */
  suggestUserAction(error) {
    const errorType = this.extractErrorType(error);
    const errorMessage = error.message?.toLowerCase() || '';

    if (errorMessage.includes('timeout')) return 'retry';
    if (errorMessage.includes('network') || errorMessage.includes('connection')) return 'check-connection';
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) return 'request-permission';
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) return 'fix-input';
    if (errorMessage.includes('memory') || errorMessage.includes('resource')) return 'retry-later';

    return 'contact-support';
  }

  /**
   * Extract technical details from error
   */
  extractTechnicalDetails(error) {
    return {
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    };
  }

  /**
   * Generate cache key for error
   */
  generateErrorKey(error) {
    const errorString = `${error.name}:${error.message}`;
    return crypto.createHash('md5').update(errorString).digest('hex');
  }
}

/**
 * User-Friendly Error Message Formatter
 */
class MessageFormatter {
  constructor(options = {}) {
    this.options = {
      language: options.language || 'en',
      technicalLevel: options.technicalLevel || 'basic',
      includeSuggestions: options.includeSuggestions !== false,
      maxLength: options.maxLength || 500,
      ...options
    };
    this.messageTemplates = this.initializeMessageTemplates();
  }

  /**
   * Initialize message templates
   */
  initializeMessageTemplates() {
    return {
      en: {
        timeout: {
          title: 'Request Timeout',
          basic: 'The request took too long to complete. Please try again.',
          detailed: 'The operation timed out after {timeout}ms. This may be due to network issues or server load.',
          suggestions: ['Check your internet connection', 'Try again later', 'Contact support if the problem persists']
        },
        network: {
          title: 'Connection Issue',
          basic: 'Unable to connect to the server. Please check your internet connection.',
          detailed: 'Failed to connect to {endpoint}. Status code: {statusCode}.',
          suggestions: ['Check your internet connection', 'Verify the server is running', 'Try again later']
        },
        validation: {
          title: 'Invalid Input',
          basic: 'Please check your input and try again.',
          detailed: 'The {field} field contains invalid data: {issue}.',
          suggestions: ['Review the highlighted fields', 'Check the format requirements', 'See the help documentation']
        },
        permission: {
          title: 'Permission Required',
          basic: 'You need permission to perform this action.',
          detailed: 'Access to {permission} is required for this operation.',
          suggestions: ['Grant the required permission', 'Contact your administrator', 'Use an alternative approach']
        },
        resource: {
          title: 'Resource Unavailable',
          basic: 'The system doesn\'t have enough resources to complete this operation.',
          detailed: 'Insufficient {resource}. Available: {available}, Required: {required}.',
          suggestions: ['Close other applications', 'Try again later', 'Upgrade your system resources']
        }
      }
    };
  }

  /**
   * Format user-friendly error message
   */
  async formatMessage(errorContext) {
    const { error, context, userRole = 'user' } = errorContext;
    const classification = await new ErrorClassifier().classifyError(errorContext);

    const template = this.getMessageTemplate(classification.category);
    const technicalLevel = this.adjustTechnicalLevel(userRole);

    const formattedMessage = {
      title: template.title,
      description: this.formatDescription(template, technicalLevel, {
        ...context,
        ...classification.technicalDetails
      }),
      severity: classification.severity,
      userAction: classification.userAction,
      suggestions: this.options.includeSuggestions ? template.suggestions : [],
      technicalDetails: technicalLevel === 'expert' ? classification.technicalDetails : undefined,
      timestamp: Date.now(),
      id: this.generateMessageId()
    };

    return formattedMessage;
  }

  /**
   * Get message template for category
   */
  getMessageTemplate(category) {
    const templates = this.messageTemplates[this.options.language];
    return templates[category] || templates.system || {
      title: 'Error',
      basic: 'An error occurred. Please try again.',
      detailed: 'An unexpected error occurred: {message}',
      suggestions: ['Try again', 'Contact support', 'Check the logs']
    };
  }

  /**
   * Adjust technical level based on user role
   */
  adjustTechnicalLevel(userRole) {
    const roleToLevel = {
      'developer': 'expert',
      'admin': 'advanced',
      'power-user': 'intermediate',
      'user': 'basic'
    };

    return roleToLevel[userRole] || this.options.technicalLevel;
  }

  /**
   * Format description based on technical level
   */
  formatDescription(template, level, context) {
    const descriptionTemplate = level === 'basic' ? template.basic : template.detailed;

    return descriptionTemplate.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] || match;
    });
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Error Recovery and Fallback Mechanism Manager
 */
class RecoveryManager {
  constructor(options = {}) {
    this.options = {
      strategies: options.strategies || ['retry', 'fallback', 'degradation', 'skip'],
      maxRecoveryAttempts: options.maxRecoveryAttempts || 3,
      recoveryTimeout: options.recoveryTimeout || 30000,
      ...options
    };
    this.recoveryStrategies = this.initializeRecoveryStrategies();
    this.recoveryHistory = new Map();
  }

  /**
   * Initialize recovery strategies
   */
  initializeRecoveryStrategies() {
    return {
      retry: this.retryStrategy.bind(this),
      fallback: this.fallbackStrategy.bind(this),
      degradation: this.degradationStrategy.bind(this),
      skip: this.skipStrategy.bind(this)
    };
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(errorContext) {
    const { error, context, originalFunction } = errorContext;
    const classification = await new ErrorClassifier().classifyError(errorContext);

    const recoveryResult = {
      success: false,
      recoveryStrategy: null,
      attempts: 0,
      finalResult: null,
      error: null
    };

    // Try recovery strategies in order
    for (const strategyName of this.options.strategies) {
      if (recoveryResult.success) break;

      try {
        recoveryResult.attempts++;
        const strategy = this.recoveryStrategies[strategyName];
        const result = await strategy(errorContext, classification);

        if (result.success) {
          recoveryResult.success = true;
          recoveryResult.recoveryStrategy = strategyName;
          recoveryResult.finalResult = result.value;
          break;
        }
      } catch (recoveryError) {
        recoveryResult.error = recoveryError.message;
      }
    }

    // Record recovery attempt
    this.recordRecoveryAttempt(errorContext, recoveryResult);

    return recoveryResult;
  }

  /**
   * Retry strategy
   */
  async retryStrategy(errorContext, classification) {
    if (!classification.recoverable || classification.userAction !== 'retry') {
      return { success: false };
    }

    const { context, originalFunction } = errorContext;
    const maxAttempts = this.options.maxRecoveryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Add exponential backoff
        if (attempt > 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), this.options.recoveryTimeout);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await originalFunction(context);
        return { success: true, value: result, attempt };
      } catch (retryError) {
        if (attempt === maxAttempts) {
          return { success: false, error: retryError };
        }
      }
    }

    return { success: false };
  }

  /**
   * Fallback strategy
   */
  async fallbackStrategy(errorContext, classification) {
    const { context } = errorContext;
    const fallbacks = this.getFallbackOptions(classification.category);

    for (const fallback of fallbacks) {
      try {
        const result = await this.executeFallback(fallback, context);
        if (result.success) {
          return { success: true, value: result.value, fallback: fallback.name };
        }
      } catch (fallbackError) {
        // Continue to next fallback option
      }
    }

    return { success: false };
  }

  /**
   * Get fallback options for category
   */
  getFallbackOptions(category) {
    const fallbackMap = {
      network: [
        { name: 'cached-response', fn: this.getCachedResponse.bind(this) },
        { name: 'offline-mode', fn: this.enableOfflineMode.bind(this) }
      ],
      timeout: [
        { name: 'reduced-timeout', fn: this.executeWithReducedTimeout.bind(this) },
        { name: 'async-operation', fn: this.executeAsync.bind(this) }
      ],
      validation: [
        { name: 'default-values', fn: this.useDefaultValues.bind(this) },
        { name: 'skip-validation', fn: this.skipValidation.bind(this) }
      ]
    };

    return fallbackMap[category] || [];
  }

  /**
   * Degradation strategy
   */
  async degradationStrategy(errorContext, classification) {
    const degradation = new GracefulDegradation({
      preserveCoreFeatures: ['basic-testing', 'error-reporting']
    });

    return await degradation.degradeGracefully({
      failedFeature: errorContext.context?.operation || 'unknown',
      failureType: classification.category,
      availableResources: this.getAvailableResources()
    });
  }

  /**
   * Skip strategy
   */
  async skipStrategy(errorContext, classification) {
    return {
      success: true,
      value: { skipped: true, reason: classification.type },
      message: 'Operation skipped due to error'
    };
  }

  /**
   * Record recovery attempt
   */
  recordRecoveryAttempt(errorContext, result) {
    const key = this.generateRecoveryKey(errorContext);

    if (!this.recoveryHistory.has(key)) {
      this.recoveryHistory.set(key, []);
    }

    this.recoveryHistory.get(key).push({
      timestamp: Date.now(),
      ...result
    });
  }

  /**
   * Generate recovery key
   */
  generateRecoveryKey(errorContext) {
    const { error, context } = errorContext;
    const keyString = `${error.name}:${context?.operation || 'unknown'}`;
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  // Placeholder fallback methods
  async getCachedResponse(context) {
    return { success: false };
  }

  async enableOfflineMode(context) {
    return { success: false };
  }

  async executeWithReducedTimeout(context) {
    return { success: false };
  }

  async executeAsync(context) {
    return { success: false };
  }

  async useDefaultValues(context) {
    return { success: false };
  }

  async skipValidation(context) {
    return { success: false };
  }

  getAvailableResources() {
    return {
      memory: '100MB',
      cpu: '50%'
    };
  }
}

/**
 * Graceful Degradation Strategy
 */
class GracefulDegradation {
  constructor(options = {}) {
    this.options = {
      degradationLevels: options.degradationLevels || ['none', 'partial', 'significant', 'critical'],
      preserveCoreFeatures: options.preserveCoreFeatures || ['basic-testing'],
      fallbackMechanisms: options.fallbackMechanisms || {},
      ...options
    };
  }

  /**
   * Degrade gracefully based on error
   */
  async degradeGracefully(degradationContext) {
    const { failedFeature, failureType, availableResources } = degradationContext;

    const degradationLevel = this.assessDegradationLevel(failureType, availableResources);
    const activeFeatures = this.determineActiveFeatures(degradationLevel);
    const fallbackMechanisms = this.selectFallbackMechanisms(failedFeature, degradationLevel);

    return {
      degradationLevel,
      activeFeatures,
      fallbackMechanisms,
      userExperience: this.calculateUserExperienceImpact(degradationLevel),
      preservedCoreFunctionality: this.checkCoreFunctionalityPreserved(activeFeatures)
    };
  }

  /**
   * Assess degradation level based on failure
   */
  assessDegradationLevel(failureType, availableResources) {
    const resourceLevels = {
      memory: this.parseResourceLevel(availableResources.memory),
      cpu: this.parseResourceLevel(availableResources.cpu)
    };

    // Critical failures
    if (failureType === 'permission' || resourceLevels.memory === 'critical') {
      return 'critical';
    }

    // Significant failures
    if (failureType === 'resource' || resourceLevels.cpu === 'critical') {
      return 'significant';
    }

    // Partial failures
    if (failureType === 'network' || failureType === 'timeout') {
      return 'partial';
    }

    return 'none';
  }

  /**
   * Parse resource level from string
   */
  parseResourceLevel(resourceString) {
    const value = parseInt(resourceString);
    if (value < 100) return 'critical';
    if (value < 500) return 'low';
    return 'normal';
  }

  /**
   * Determine active features based on degradation level
   */
  determineActiveFeatures(degradationLevel) {
    const featureMap = {
      none: ['all-features'],
      partial: ['basic-testing', 'error-reporting', 'simple-comparison'],
      significant: ['basic-testing', 'error-reporting'],
      critical: ['basic-testing']
    };

    return featureMap[degradationLevel] || [];
  }

  /**
   * Select fallback mechanisms
   */
  selectFallbackMechanisms(failedFeature, degradationLevel) {
    const mechanismMap = {
      'visual-comparison': {
        partial: 'basic-screenshot',
        significant: 'skip-comparison',
        critical: 'disabled'
      },
      'ai-analysis': {
        partial: 'rule-based',
        significant: 'skip-analysis',
        critical: 'disabled'
      }
    };

    return {
      failedFeature,
      used: mechanismMap[failedFeature]?.[degradationLevel] || 'disabled'
    };
  }

  /**
   * Calculate user experience impact
   */
  calculateUserExperienceImpact(degradationLevel) {
    const impactMap = {
      none: { impact: 'none', usability: 100, performance: 100 },
      partial: { impact: 'minimal', usability: 85, performance: 80 },
      significant: { impact: 'moderate', usability: 60, performance: 50 },
      critical: { impact: 'severe', usability: 30, performance: 20 }
    };

    return impactMap[degradationLevel];
  }

  /**
   * Check if core functionality is preserved
   */
  checkCoreFunctionalityPreserved(activeFeatures) {
    return this.options.preserveCoreFeatures.every(feature =>
      activeFeatures.includes(feature)
    );
  }
}

/**
 * Error Context Preserver
 */
class ErrorContextPreserver {
  constructor(options = {}) {
    this.options = {
      preserveStackTrace: options.preserveStackTrace !== false,
      preserveEnvironment: options.preserveEnvironment !== false,
      preserveUserState: options.preserveUserState !== false,
      maxContextSize: options.maxContextSize || 1024 * 1024, // 1MB
      ...options
    };
  }

  /**
   * Enrich error with context
   */
  async enrichErrorWithContext(errorContext) {
    const { error, context } = errorContext;

    const enrichedError = {
      originalError: {
        name: error.name,
        message: error.message,
        stack: this.options.preserveStackTrace ? error.stack : undefined
      },
      context: {
        ...context,
        environment: this.options.preserveEnvironment ? this.getEnvironmentInfo() : undefined,
        userState: this.options.preserveUserState ? this.getUserState() : undefined
      },
      enrichmentTimestamp: Date.now(),
      contextHash: this.generateContextHash(context)
    };

    // Compress if too large
    if (JSON.stringify(enrichedError).length > this.options.maxContextSize) {
      return await this.compressContext(enrichedError);
    }

    return enrichedError;
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Get user state (simplified)
   */
  getUserState() {
    return {
      sessionId: this.generateSessionId(),
      timestamp: Date.now(),
      activeOperations: []
    };
  }

  /**
   * Generate context hash
   */
  generateContextHash(context) {
    const contextString = JSON.stringify(context);
    return crypto.createHash('sha256').update(contextString).digest('hex');
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Compress context if needed
   */
  async compressContext(context) {
    // For now, just truncate non-essential parts
    const simplified = {
      ...context,
      // Remove large arrays or objects
      largeArrays: undefined,
      detailedLogs: undefined
    };

    return simplified;
  }
}

/**
 * Async Error Handler
 */
class AsyncErrorHandler {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000,
      retryCount: options.retryCount || 3,
      fallbackStrategy: options.fallbackStrategy || 'skip',
      ...options
    };
  }

  /**
   * Handle async operation with error recovery
   */
  async handleAsyncOperation(asyncFunction, context = {}) {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts <= this.options.retryCount) {
      attempts++;

      try {
        // Add timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
        );

        const result = await Promise.race([
          asyncFunction(context),
          timeoutPromise
        ]);

        return {
          success: true,
          result,
          attempts,
          executionTime: Date.now() - startTime
        };

      } catch (error) {
        if (attempts <= this.options.retryCount && this.isRetryableError(error)) {
          // Add exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }

        // Final attempt failed
        const classification = await new ErrorClassifier().classifyError({ error, context });
        const recovery = await new RecoveryManager().attemptRecovery({ error, context });

        return {
          success: false,
          error,
          classification,
          recovery,
          attempts,
          executionTime: Date.now() - startTime,
          fallbackUsed: recovery.recoveryStrategy || this.options.fallbackStrategy
        };
      }
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'TemporaryError'
    ];

    return retryableErrors.some(type => error.name?.includes(type)) ||
           error.message?.toLowerCase().includes('timeout');
  }
}

/**
 * Error Logger and Analytics
 */
class ErrorLogger {
  constructor(options = {}) {
    this.options = {
      logLevel: options.logLevel || 'detailed',
      includeStackTraces: options.includeStackTraces !== false,
      includeEnvironment: options.includeEnvironment !== false,
      aggregationWindow: options.aggregationWindow || 60000,
      ...options
    };
    this.logBuffer = [];
    this.errorPatterns = new Map();
  }

  /**
   * Log error with comprehensive details
   */
  async logError(errorContext) {
    const { error, context, severity = 'medium', category = 'system' } = errorContext;

    const logEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: this.options.includeStackTraces ? error.stack : undefined
      },
      context,
      severity,
      category,
      environment: this.options.includeEnvironment ? this.getEnvironmentInfo() : undefined,
      userSession: this.getUserSession()
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Update error patterns
    this.updateErrorPatterns(logEntry);

    // Write to persistent storage (simulated)
    await this.writeToPersistentStorage(logEntry);

    return {
      success: true,
      logId: logEntry.id,
      timestamp: logEntry.timestamp,
      compressedSize: JSON.stringify(logEntry).length
    };
  }

  /**
   * Generate log ID
   */
  generateLogId() {
    return `error_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Update error patterns for analytics
   */
  updateErrorPatterns(logEntry) {
    const patternKey = `${logEntry.category}:${logEntry.severity}`;

    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        count: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        contexts: []
      });
    }

    const pattern = this.errorPatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = Date.now();
    pattern.contexts.push(logEntry.context);

    // Keep only recent contexts
    if (pattern.contexts.length > 100) {
      pattern.contexts = pattern.contexts.slice(-100);
    }
  }

  /**
   * Get environment info
   */
  getEnvironmentInfo() {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      platform: process.platform
    };
  }

  /**
   * Get user session info
   */
  getUserSession() {
    return {
      sessionId: this.generateSessionId(),
      timestamp: Date.now()
    };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Write to persistent storage (simulated)
   */
  async writeToPersistentStorage(logEntry) {
    // In a real implementation, this would write to a database or file
    const logLine = JSON.stringify(logEntry) + '\n';

    // Simulate async storage operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Get error analytics report
   */
  getAnalyticsReport() {
    const totalErrors = Array.from(this.errorPatterns.values())
      .reduce((sum, pattern) => sum + pattern.count, 0);

    const errorRates = {};
    for (const [pattern, data] of this.errorPatterns) {
      const timeSpan = Date.now() - data.firstSeen;
      const rate = data.count / (timeSpan / 1000 / 60); // errors per minute
      errorRates[pattern] = rate;
    }

    return {
      totalErrors,
      uniqueErrorTypes: this.errorPatterns.size,
      errorRates,
      recentPatterns: this.getRecentPatterns(),
      topErrors: this.getTopErrors()
    };
  }

  /**
   * Get recent error patterns
   */
  getRecentPatterns() {
    const recent = [];
    const now = Date.now();

    for (const [pattern, data] of this.errorPatterns) {
      if (now - data.lastSeen < 3600000) { // Last hour
        recent.push({ pattern, ...data });
      }
    }

    return recent.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Get top errors by frequency
   */
  getTopErrors() {
    return Array.from(this.errorPatterns.entries())
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

/**
 * Main Error Handling Utils Module
 */
module.exports = {
  ErrorClassifier,
  MessageFormatter,
  RecoveryManager,
  GracefulDegradation,
  ErrorContextPreserver,
  AsyncErrorHandler,
  ErrorLogger,

  // Factory functions for easier usage
  createErrorClassifier: (options) => new ErrorClassifier(options),
  createMessageFormatter: (options) => new MessageFormatter(options),
  createRecoveryManager: (options) => new RecoveryManager(options),
  createGracefulDegradation: (options) => new GracefulDegradation(options),
  createErrorContextPreserver: (options) => new ErrorContextPreserver(options),
  createAsyncErrorHandler: (options) => new AsyncErrorHandler(options),
  createErrorLogger: (options) => new ErrorLogger(options),

  // Convenience functions
  handleError: async (error, context = {}) => {
    const classifier = new ErrorClassifier();
    const formatter = new MessageFormatter();
    const logger = new ErrorLogger();

    const classification = await classifier.classifyError({ error, context });
    const formattedMessage = await formatter.formatMessage({ error, context });
    const logResult = await logger.logError({ error, context, ...classification });

    return {
      classification,
      formattedMessage,
      logResult,
      handled: true
    };
  },

  handleAsyncError: async (asyncFunction, context = {}) => {
    const handler = new AsyncErrorHandler();
    return await handler.handleAsyncOperation(asyncFunction, context);
  },

  createRecoverableOperation: (operation, options = {}) => {
    const recoveryManager = new RecoveryManager(options);

    return async (context) => {
      try {
        return await operation(context);
      } catch (error) {
        const recoveryResult = await recoveryManager.attemptRecovery({
          error,
          context,
          originalFunction: operation
        });

        if (recoveryResult.success) {
          return recoveryResult.finalResult;
        }

        throw error;
      }
    };
  }
};