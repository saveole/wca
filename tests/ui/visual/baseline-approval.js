/**
 * Baseline Approval Workflow Utilities
 *
 * Implements comprehensive workflow for managing visual baselines including
 * approval processes, versioning, and management utilities.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VisualBaseline } from '../../models/VisualBaseline.js';
import { ComparisonResult } from './visual-comparison.js';

/**
 * Approval workflow status
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  SUPERSEDED: 'superseded'
};

/**
 * Approval decision types
 */
export const DECISION_TYPE = {
  MANUAL: 'manual',
  AUTOMATIC: 'automatic',
  BULK: 'bulk',
  EMERGENCY: 'emergency'
};

/**
 * Approval request metadata
 */
export class ApprovalRequest {
  constructor({
    id = uuidv4(),
    baselineId = '',
    requester = '',
    reason = '',
    priority = 'medium',
    comparisonResults = [],
    suggestedChanges = [],
    createdAt = new Date(),
    expiresAt = null,
    assignedTo = '',
    tags = []
  } = {}) {
    this.id = id;
    this.baselineId = baselineId;
    this.requester = requester;
    this.reason = reason;
    this.priority = priority;
    this.comparisonResults = comparisonResults;
    this.suggestedChanges = suggestedChanges;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.assignedTo = assignedTo;
    this.tags = tags;
    this.status = APPROVAL_STATUS.PENDING;
    this.decisionType = DECISION_TYPE.MANUAL;
    this.approvedBy = '';
    this.rejectedBy = '';
    this.decisionAt = null;
    this.comments = [];
    this.metadata = {};
  }

  isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  isAssigned() {
    return this.assignedTo && this.assignedTo.length > 0;
  }

  canApprove(user) {
    return this.status === APPROVAL_STATUS.PENDING &&
           !this.isExpired() &&
           (!this.assignedTo || this.assignedTo === user);
  }

  canReject(user) {
    return this.canApprove(user);
  }

  approve(approvedBy, comments = '', decisionType = DECISION_TYPE.MANUAL) {
    if (!this.canApprove(approvedBy)) {
      throw new Error('Cannot approve this request');
    }

    this.status = APPROVAL_STATUS.APPROVED;
    this.approvedBy = approvedBy;
    this.decisionAt = new Date();
    this.decisionType = decisionType;
    this.addComment(approvedBy, comments, 'approval');
  }

  reject(rejectedBy, comments = '', decisionType = DECISION_TYPE.MANUAL) {
    if (!this.canReject(rejectedBy)) {
      throw new Error('Cannot reject this request');
    }

    this.status = APPROVAL_STATUS.REJECTED;
    this.rejectedBy = rejectedBy;
    this.decisionAt = new Date();
    this.decisionType = decisionType;
    this.addComment(rejectedBy, comments, 'rejection');
  }

  addComment(user, comment, type = 'general') {
    this.comments.push({
      id: uuidv4(),
      user,
      comment,
      type,
      timestamp: new Date()
    });
  }

  addSuggestion(change) {
    this.suggestedChanges.push({
      id: uuidv4(),
      ...change,
      suggestedAt: new Date()
    });
  }

  toJSON() {
    return {
      id: this.id,
      baselineId: this.baselineId,
      requester: this.requester,
      reason: this.reason,
      priority: this.priority,
      status: this.status,
      decisionType: this.decisionType,
      approvedBy: this.approvedBy,
      rejectedBy: this.rejectedBy,
      decisionAt: this.decisionAt?.toISOString(),
      assignedTo: this.assignedTo,
      tags: this.tags,
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt?.toISOString(),
      isExpired: this.isExpired(),
      isAssigned: this.isAssigned(),
      comparisonResults: this.comparisonResults.map(r => r.toJSON()),
      suggestedChanges: this.suggestedChanges,
      comments: this.comments,
      metadata: this.metadata
    };
  }
}

/**
 * Approval workflow configuration
 */
export class ApprovalConfig {
  constructor({
    autoApprovalThreshold = 0.01,
    autoRejectionThreshold = 0.2,
    defaultExpirationHours = 24,
    requiredApprovers = 1,
    enableNotifications = true,
    enableEmailNotifications = false,
    enableBulkApproval = true,
    enableEmergencyApproval = true,
    maxPendingRequests = 10,
    approvalHistoryLimit = 100
  } = {}) {
    this.autoApprovalThreshold = autoApprovalThreshold;
    this.autoRejectionThreshold = autoRejectionThreshold;
    this.defaultExpirationHours = defaultExpirationHours;
    this.requiredApprovers = requiredApprovers;
    this.enableNotifications = enableNotifications;
    this.enableEmailNotifications = enableEmailNotifications;
    this.enableBulkApproval = enableBulkApproval;
    this.enableEmergencyApproval = enableEmergencyApproval;
    this.maxPendingRequests = maxPendingRequests;
    this.approvalHistoryLimit = approvalHistoryLimit;
  }

  shouldAutoApprove(difference) {
    return difference <= this.autoApprovalThreshold;
  }

  shouldAutoReject(difference) {
    return difference >= this.autoRejectionThreshold;
  }

  toJSON() {
    return {
      autoApprovalThreshold: this.autoApprovalThreshold,
      autoRejectionThreshold: this.autoRejectionThreshold,
      defaultExpirationHours: this.defaultExpirationHours,
      requiredApprovers: this.requiredApprovers,
      enableNotifications: this.enableNotifications,
      enableEmailNotifications: this.enableEmailNotifications,
      enableBulkApproval: this.enableBulkApproval,
      enableEmergencyApproval: this.enableEmergencyApproval,
      maxPendingRequests: this.maxPendingRequests,
      approvalHistoryLimit: this.approvalHistoryLimit
    };
  }
}

/**
 * Baseline approval workflow manager
 */
export class BaselineApprovalWorkflow {
  constructor({
    storagePath = './approvals',
    config = new ApprovalConfig(),
    notificationHandler = null
  } = {}) {
    this.storagePath = storagePath;
    this.config = config;
    this.notificationHandler = notificationHandler;
    this.requests = new Map();
    this.history = [];
    this.stats = {
      totalRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      pendingRequests: 0,
      expiredRequests: 0,
      averageProcessingTime: 0
    };

    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  initializeStorage() {
    const dirs = [
      this.storagePath,
      path.join(this.storagePath, 'pending'),
      path.join(this.storagePath, 'approved'),
      path.join(this.storagePath, 'rejected'),
      path.join(this.storagePath, 'history')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.loadRequests();
    this.cleanupExpiredRequests();
  }

  /**
   * Create new approval request
   */
  async createApprovalRequest({
    baselineId,
    requester,
    reason,
    comparisonResults = [],
    priority = 'medium',
    expiresAt = null,
    assignedTo = '',
    tags = []
  }) {
    // Validate we don't exceed max pending requests
    if (this.getPendingRequests().length >= this.config.maxPendingRequests) {
      throw new Error('Maximum pending requests limit reached');
    }

    // Check for duplicate requests
    const existingRequest = this.getPendingRequestForBaseline(baselineId);
    if (existingRequest) {
      throw new Error(`Approval request already exists for baseline ${baselineId}`);
    }

    // Set expiration if not provided
    if (!expiresAt) {
      expiresAt = new Date(Date.now() + this.config.defaultExpirationHours * 60 * 60 * 1000);
    }

    const request = new ApprovalRequest({
      baselineId,
      requester,
      reason,
      comparisonResults,
      priority,
      expiresAt,
      assignedTo,
      tags
    });

    // Check for automatic approval/rejection
    const avgDifference = this.calculateAverageDifference(comparisonResults);

    if (this.config.shouldAutoApprove(avgDifference)) {
      request.approve('system', `Auto-approved: difference ${avgDifference} below threshold`, DECISION_TYPE.AUTOMATIC);
    } else if (this.config.shouldAutoReject(avgDifference)) {
      request.reject('system', `Auto-rejected: difference ${avgDifference} above threshold`, DECISION_TYPE.AUTOMATIC);
    }

    this.requests.set(request.id, request);
    this.saveRequest(request);
    this.updateStats(request);

    // Send notification if enabled
    if (this.config.enableNotifications && this.notificationHandler) {
      await this.sendNotification('created', request);
    }

    return request;
  }

  /**
   * Approve a pending request
   */
  async approveRequest(requestId, approver, comments = '', decisionType = DECISION_TYPE.MANUAL) {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    request.approve(approver, comments, decisionType);
    this.saveRequest(request);
    this.updateStats(request);

    // Send notification if enabled
    if (this.config.enableNotifications && this.notificationHandler) {
      await this.sendNotification('approved', request);
    }

    return request;
  }

  /**
   * Reject a pending request
   */
  async rejectRequest(requestId, rejector, comments = '', decisionType = DECISION_TYPE.MANUAL) {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    request.reject(rejector, comments, decisionType);
    this.saveRequest(request);
    this.updateStats(request);

    // Send notification if enabled
    if (this.config.enableNotifications && this.notificationHandler) {
      await this.sendNotification('rejected', request);
    }

    return request;
  }

  /**
   * Add comment to request
   */
  async addComment(requestId, user, comment, type = 'general') {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    request.addComment(user, comment, type);
    this.saveRequest(request);

    return request;
  }

  /**
   * Get pending requests
   */
  getPendingRequests(user = null) {
    const pending = Array.from(this.requests.values())
      .filter(req => req.status === APPROVAL_STATUS.PENDING && !req.isExpired());

    if (user) {
      return pending.filter(req => !req.assignedTo || req.assignedTo === user);
    }

    return pending;
  }

  /**
   * Get request by ID
   */
  getRequest(requestId) {
    return this.requests.get(requestId);
  }

  /**
   * Get pending request for specific baseline
   */
  getPendingRequestForBaseline(baselineId) {
    return Array.from(this.requests.values())
      .find(req => req.baselineId === baselineId &&
                   req.status === APPROVAL_STATUS.PENDING &&
                   !req.isExpired());
  }

  /**
   * Get all requests
   */
  getAllRequests() {
    return Array.from(this.requests.values());
  }

  /**
   * Bulk approve requests
   */
  async bulkApprove(requestIds, approver, comments = '') {
    if (!this.config.enableBulkApproval) {
      throw new Error('Bulk approval is disabled');
    }

    const results = [];
    const errors = [];

    for (const requestId of requestIds) {
      try {
        const request = await this.approveRequest(
          requestId,
          approver,
          comments + ' (Bulk approval)',
          DECISION_TYPE.BULK
        );
        results.push(request);
      } catch (error) {
        errors.push({ requestId, error: error.message });
      }
    }

    return { results, errors };
  }

  /**
   * Emergency approval request
   */
  async emergencyApprove(baselineId, approver, reason) {
    if (!this.config.enableEmergencyApproval) {
      throw new Error('Emergency approval is disabled');
    }

    // Create emergency request
    const request = await this.createApprovalRequest({
      baselineId,
      requester: approver,
      reason: `EMERGENCY: ${reason}`,
      priority: 'critical',
      tags: ['emergency']
    });

    // Auto-approve
    await this.approveRequest(
      request.id,
      approver,
      `Emergency approval: ${reason}`,
      DECISION_TYPE.EMERGENCY
    );

    return request;
  }

  /**
   * Calculate average difference from comparison results
   */
  calculateAverageDifference(comparisonResults) {
    if (!comparisonResults || comparisonResults.length === 0) {
      return 0;
    }

    const totalDifference = comparisonResults.reduce((sum, result) => sum + result.difference, 0);
    return totalDifference / comparisonResults.length;
  }

  /**
   * Send notification
   */
  async sendNotification(type, request) {
    if (!this.notificationHandler) {
      return;
    }

    const notification = {
      type,
      request: request.toJSON(),
      timestamp: new Date()
    };

    try {
      await this.notificationHandler(notification);
    } catch (error) {
      console.warn(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Save request to storage
   */
  saveRequest(request) {
    const statusDir = request.status === APPROVAL_STATUS.PENDING ? 'pending' :
                      request.status === APPROVAL_STATUS.APPROVED ? 'approved' : 'rejected';

    const filePath = path.join(this.storagePath, statusDir, `${request.id}.json`);

    try {
      fs.writeFileSync(filePath, JSON.stringify(request.toJSON(), null, 2));
    } catch (error) {
      console.error(`Failed to save request: ${error.message}`);
    }

    // Add to history
    this.addToHistory(request);
  }

  /**
   * Load requests from storage
   */
  loadRequests() {
    const statuses = ['pending', 'approved', 'rejected'];

    for (const status of statuses) {
      const statusDir = path.join(this.storagePath, status);
      if (!fs.existsSync(statusDir)) continue;

      const files = fs.readdirSync(statusDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(statusDir, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const requestData = JSON.parse(data);

            const request = new ApprovalRequest({
              ...requestData,
              createdAt: new Date(requestData.createdAt),
              expiresAt: requestData.expiresAt ? new Date(requestData.expiresAt) : null,
              decisionAt: requestData.decisionAt ? new Date(requestData.decisionAt) : null
            });

            this.requests.set(request.id, request);
          } catch (error) {
            console.error(`Failed to load request from ${file}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Add request to history
   */
  addToHistory(request) {
    this.history.push({
      id: request.id,
      baselineId: request.baselineId,
      status: request.status,
      decisionType: request.decisionType,
      requester: request.requester,
      approvedBy: request.approvedBy,
      rejectedBy: request.rejectedBy,
      timestamp: new Date()
    });

    // Limit history size
    if (this.history.length > this.config.approvalHistoryLimit) {
      this.history = this.history.slice(-this.config.approvalHistoryLimit);
    }

    // Save history
    this.saveHistory();
  }

  /**
   * Save history to storage
   */
  saveHistory() {
    const historyPath = path.join(this.storagePath, 'history', 'approval-history.json');

    try {
      fs.writeFileSync(historyPath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error(`Failed to save history: ${error.message}`);
    }
  }

  /**
   * Load history from storage
   */
  loadHistory() {
    const historyPath = path.join(this.storagePath, 'history', 'approval-history.json');

    if (!fs.existsSync(historyPath)) {
      return;
    }

    try {
      const data = fs.readFileSync(historyPath, 'utf8');
      this.history = JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load history: ${error.message}`);
    }
  }

  /**
   * Clean up expired requests
   */
  cleanupExpiredRequests() {
    const expired = Array.from(this.requests.values())
      .filter(req => req.isExpired() && req.status === APPROVAL_STATUS.PENDING);

    for (const request of expired) {
      request.status = APPROVAL_STATUS.EXPIRED;
      this.saveRequest(request);
    }

    return expired.length;
  }

  /**
   * Update statistics
   */
  updateStats(request) {
    this.stats.totalRequests++;

    switch (request.status) {
      case APPROVAL_STATUS.APPROVED:
        this.stats.approvedRequests++;
        break;
      case APPROVAL_STATUS.REJECTED:
        this.stats.rejectedRequests++;
        break;
      case APPROVAL_STATUS.PENDING:
        this.stats.pendingRequests++;
        break;
      case APPROVAL_STATUS.EXPIRED:
        this.stats.expiredRequests++;
        break;
    }

    // Update average processing time for completed requests
    const completedRequests = Array.from(this.requests.values())
      .filter(req => req.decisionAt && req.status !== APPROVAL_STATUS.PENDING);

    if (completedRequests.length > 0) {
      const totalTime = completedRequests.reduce((sum, req) => {
        return sum + (req.decisionAt - req.createdAt);
      }, 0);

      this.stats.averageProcessingTime = totalTime / completedRequests.length;
    }
  }

  /**
   * Get workflow statistics
   */
  getStatistics() {
    const pendingCount = this.getPendingRequests().length;

    return {
      ...this.stats,
      pendingRequests: pendingCount,
      approvalRate: this.stats.totalRequests > 0 ?
        (this.stats.approvedRequests / this.stats.totalRequests) * 100 : 0,
      rejectionRate: this.stats.totalRequests > 0 ?
        (this.stats.rejectedRequests / this.stats.totalRequests) * 100 : 0
    };
  }

  /**
   * Generate approval workflow report
   */
  generateReport() {
    const stats = this.getStatistics();
    const pending = this.getPendingRequests();
    const recent = this.history.slice(-10);

    return {
      summary: {
        totalRequests: stats.totalRequests,
        approvalRate: stats.approvalRate,
        rejectionRate: stats.rejectionRate,
        pendingRequests: stats.pendingRequests,
        averageProcessingTime: stats.averageProcessingTime
      },
      pendingRequests: pending.map(req => req.toJSON()),
      recentActivity: recent,
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Generate workflow recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.approvalRate < 70) {
      recommendations.push('Low approval rate detected - review baseline quality criteria');
    }

    if (stats.averageProcessingTime > 24 * 60 * 60 * 1000) { // 24 hours
      recommendations.push('Slow approval processing - consider increasing approvers or auto-approval thresholds');
    }

    if (stats.pendingRequests > this.config.maxPendingRequests * 0.8) {
      recommendations.push('High pending request volume - consider workflow optimization');
    }

    return recommendations;
  }

  /**
   * Export workflow data
   */
  exportData(filePath) {
    const data = {
      requests: Array.from(this.requests.values()).map(req => req.toJSON()),
      history: this.history,
      statistics: this.getStatistics(),
      config: this.config.toJSON(),
      exportedAt: new Date().toISOString()
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to export workflow data: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all workflow data
   */
  clearData() {
    this.requests.clear();
    this.history = [];
    this.stats = {
      totalRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      pendingRequests: 0,
      expiredRequests: 0,
      averageProcessingTime: 0
    };

    // Clear storage directories (except structure)
    const statuses = ['pending', 'approved', 'rejected'];
    for (const status of statuses) {
      const statusDir = path.join(this.storagePath, status);
      if (fs.existsSync(statusDir)) {
        const files = fs.readdirSync(statusDir);
        for (const file of files) {
          fs.unlinkSync(path.join(statusDir, file));
        }
      }
    }
  }
}

/**
 * Factory function to create approval workflow
 */
export function createBaselineApprovalWorkflow(options = {}) {
  return new BaselineApprovalWorkflow(options);
}

/**
 * Default notification handler
 */
export function createDefaultNotificationHandler() {
  return async (notification) => {
    console.log(`[${notification.type.toUpperCase()}] Approval notification:`, {
      requestId: notification.request.id,
      baselineId: notification.request.baselineId,
      status: notification.request.status,
      requester: notification.request.requester,
      timestamp: notification.timestamp
    });
  };
}

/**
 * Email notification handler (placeholder implementation)
 */
export function createEmailNotificationHandler(config) {
  return async (notification) => {
    // This is a placeholder implementation
    // In a real implementation, you would integrate with an email service

    console.log(`[EMAIL] Would send ${notification.type} notification for request ${notification.request.id}`);

    // Example email structure:
    const email = {
      to: notification.request.assignedTo || 'approver@example.com',
      subject: `Baseline Approval ${notification.type}: ${notification.request.baselineId}`,
      body: `
        Approval request ${notification.type} for baseline ${notification.request.baselineId}

        Requester: ${notification.request.requester}
        Reason: ${notification.request.reason}
        Status: ${notification.request.status}

        View details in the approval dashboard.
      `
    };

    // Send email using your preferred email service
    // await sendEmail(email);
  };
}

export default BaselineApprovalWorkflow;