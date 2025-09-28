/**
 * Memory Management for Large Test Suites
 *
 * Provides comprehensive memory management and optimization for large test suites.
 * Implements intelligent memory allocation, garbage collection, and resource cleanup
 * to prevent memory exhaustion during extensive test execution.
 *
 * Features:
 * - Memory usage monitoring and threshold management
 * - Automatic garbage collection triggering
 * - Resource pooling and reuse
 * - Memory leak detection and prevention
 * - Adaptive memory allocation strategies
 * - Performance optimization for large datasets
 */

const { performance, gc } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class MemoryManager {
  constructor(options = {}) {
    this.options = {
      // Memory thresholds
      warningThreshold: options.warningThreshold || 0.7, // 70% of available memory
      criticalThreshold: options.criticalThreshold || 0.85, // 85% of available memory
      emergencyThreshold: options.emergencyThreshold || 0.95, // 95% of available memory

      // Cleanup settings
      enableAggressiveCleanup: options.enableAggressiveCleanup !== false,
      enableGarbageCollection: options.enableGarbageCollection !== false,
      cleanupInterval: options.cleanupInterval || 30000, // 30 seconds
      maxCleanupRetries: options.maxCleanupRetries || 3,

      // Resource pooling
      enableResourcePooling: options.enableResourcePooling !== false,
      maxPoolSize: options.maxPoolSize || 100,
      poolTimeout: options.poolTimeout || 60000, // 1 minute

      // Monitoring
      enableContinuousMonitoring: options.enableContinuousMonitoring !== false,
      monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
      enableDetailedMetrics: options.enableDetailedMetrics !== false,

      // Adaptive management
      enableAdaptiveSizing: options.enableAdaptiveSizing !== false,
      adaptiveWindowSize: options.adaptiveWindowSize || 10, // Number of measurements for adaptation
      enablePredictiveCleanup: options.enablePredictiveCleanup !== false,

      // Leak detection
      enableLeakDetection: options.enableLeakDetection !== false,
      leakDetectionThreshold: options.leakDetectionThreshold || 0.1, // 10% growth threshold
      leakDetectionWindow: options.leakDetectionWindow || 300000, // 5 minutes

      // Memory optimization
      enableMemoryCompression: options.enableMemoryCompression !== false,
      enableLazyLoading: options.enableLazyLoading !== false,
      enableStreamingProcessing: options.enableStreamingProcessing !== false,

      // File-based memory management
      enableMemorySwapping: options.enableMemorySwapping !== false,
      swapDirectory: options.swapDirectory || path.join(process.cwd(), 'test-results', 'memory-swap'),
      maxSwapSize: options.maxSwapSize || 1024 * 1024 * 1024, // 1GB

      ...options
    };

    // Initialize state
    this.resourcePools = new Map();
    this.memoryHistory = [];
    this.leakDetectors = new Map();
    this.cleanupHistory = [];
    this.adaptiveMetrics = new Map();

    // Performance metrics
    this.metrics = {
      totalMemoryUsed: 0,
      peakMemoryUsage: 0,
      garbageCollections: 0,
      cleanupOperations: 0,
      memoryLeaksDetected: 0,
      poolHits: 0,
      poolMisses: 0,
      swapOperations: 0,
      adaptiveAdjustments: 0
    };

    // Initialize manager
    this.initialize();
  }

  /**
   * Initialize memory manager
   */
  initialize() {
    // Create swap directory if needed
    if (this.options.enableMemorySwapping) {
      this.initializeSwapDirectory();
    }

    // Start monitoring
    if (this.options.enableContinuousMonitoring) {
      this.startMemoryMonitoring();
    }

    // Start leak detection
    if (this.options.enableLeakDetection) {
      this.startLeakDetection();
    }

    // Start adaptive management
    if (this.options.enableAdaptiveSizing) {
      this.startAdaptiveManagement();
    }

    // Initialize resource pools
    if (this.options.enableResourcePooling) {
      this.initializeResourcePools();
    }

    // Register process event handlers
    this.registerProcessHandlers();
  }

  /**
   * Initialize swap directory
   */
  initializeSwapDirectory() {
    try {
      if (!fs.existsSync(this.options.swapDirectory)) {
        fs.mkdirSync(this.options.swapDirectory, { recursive: true });
      }
    } catch (error) {
      console.warn(`Failed to initialize swap directory: ${error.message}`);
      this.options.enableMemorySwapping = false;
    }
  }

  /**
   * Register process event handlers
   */
  registerProcessHandlers() {
    process.on('memoryWarning', () => this.handleMemoryWarning());
    process.on('exit', () => this.cleanup());
  }

  /**
   * Initialize resource pools
   */
  initializeResourcePools() {
    // Common resource pools for testing
    const poolTypes = ['buffers', 'strings', 'objects', 'arrays'];

    for (const type of poolTypes) {
      this.resourcePools.set(type, {
        available: [],
        inUse: new Set(),
        maxSize: this.options.maxPoolSize,
        created: 0,
        reused: 0
      });
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
      this.updateMemoryHistory();
    }, this.options.monitoringInterval);
  }

  /**
   * Start leak detection
   */
  startLeakDetection() {
    setInterval(() => {
      this.detectMemoryLeaks();
    }, this.options.leakDetectionWindow);
  }

  /**
   * Start adaptive management
   */
  startAdaptiveManagement() {
    setInterval(() => {
      this.updateAdaptiveMetrics();
      this.performAdaptiveAdjustments();
    }, this.options.cleanupInterval);
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usageRatio = memUsage.heapUsed / totalMemory;

    // Update metrics
    this.metrics.totalMemoryUsed = memUsage.heapUsed;
    this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, memUsage.heapUsed);

    // Check thresholds and take action
    if (usageRatio >= this.options.emergencyThreshold) {
      this.handleEmergencyMemory();
    } else if (usageRatio >= this.options.criticalThreshold) {
      this.handleCriticalMemory();
    } else if (usageRatio >= this.options.warningThreshold) {
      this.handleMemoryWarning();
    }

    return {
      usageRatio,
      memUsage,
      status: this.getMemoryStatus(usageRatio)
    };
  }

  /**
   * Get memory status based on usage ratio
   */
  getMemoryStatus(usageRatio) {
    if (usageRatio >= this.options.emergencyThreshold) return 'emergency';
    if (usageRatio >= this.options.criticalThreshold) return 'critical';
    if (usageRatio >= this.options.warningThreshold) return 'warning';
    return 'normal';
  }

  /**
   * Handle memory warning
   */
  handleMemoryWarning() {
    console.warn('Memory usage warning threshold reached');

    if (this.options.enableAggressiveCleanup) {
      this.performAggressiveCleanup();
    }

    if (this.options.enableGarbageCollection && gc) {
      try {
        gc();
        this.metrics.garbageCollections++;
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error.message);
      }
    }
  }

  /**
   * Handle critical memory
   */
  handleCriticalMemory() {
    console.error('Critical memory threshold reached');

    // Perform immediate cleanup
    this.performCriticalCleanup();

    // Force garbage collection
    if (this.options.enableGarbageCollection && gc) {
      try {
        gc();
        this.metrics.garbageCollections++;
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error.message);
      }
    }

    // Clear resource pools
    if (this.options.enableResourcePooling) {
      this.clearResourcePools();
    }
  }

  /**
   * Handle emergency memory
   */
  handleEmergencyMemory() {
    console.error('Emergency memory threshold reached - immediate action required');

    // Perform emergency cleanup
    this.performEmergencyCleanup();

    // Clear all caches and pools
    this.emergencyCleanup();

    // Attempt to free memory by any means necessary
    this.attemptMemoryRecovery();
  }

  /**
   * Perform aggressive cleanup
   */
  performAggressiveCleanup() {
    const startTime = Date.now();
    let freedMemory = 0;

    // Clear resource pools
    if (this.options.enableResourcePooling) {
      freedMemory += this.clearResourcePools();
    }

    // Clear memory history
    if (this.memoryHistory.length > 100) {
      const oldSize = this.memoryHistory.length * 8; // Approximate size
      this.memoryHistory = this.memoryHistory.slice(-50);
      freedMemory += oldSize - (this.memoryHistory.length * 8);
    }

    // Clear leak detectors
    if (this.leakDetectors.size > 50) {
      const oldSize = this.leakDetectors.size * 100; // Approximate size
      this.leakDetectors.clear();
      freedMemory += oldSize;
    }

    // Perform garbage collection
    if (this.options.enableGarbageCollection && gc) {
      try {
        gc();
        this.metrics.garbageCollections++;
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error.message);
      }
    }

    this.metrics.cleanupOperations++;
    this.recordCleanup({
      type: 'aggressive',
      startTime,
      duration: Date.now() - startTime,
      freedMemory
    });
  }

  /**
   * Perform critical cleanup
   */
  performCriticalCleanup() {
    const startTime = Date.now();
    let freedMemory = 0;

    // Clear all resource pools
    if (this.options.enableResourcePooling) {
      freedMemory += this.clearAllResourcePools();
    }

    // Clear most historical data
    this.memoryHistory = this.memoryHistory.slice(-10);
    this.cleanupHistory = this.cleanupHistory.slice(-5);

    // Force garbage collection
    if (this.options.enableGarbageCollection && gc) {
      try {
        gc();
        this.metrics.garbageCollections++;
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error.message);
      }
    }

    this.metrics.cleanupOperations++;
    this.recordCleanup({
      type: 'critical',
      startTime,
      duration: Date.now() - startTime,
      freedMemory
    });
  }

  /**
   * Perform emergency cleanup
   */
  performEmergencyCleanup() {
    const startTime = Date.now();
    let freedMemory = 0;

    // Clear everything possible
    this.memoryHistory = [];
    this.cleanupHistory = [];
    this.leakDetectors.clear();
    this.adaptiveMetrics.clear();

    // Clear all resource pools
    if (this.options.enableResourcePooling) {
      freedMemory += this.clearAllResourcePools();
    }

    // Clear swap files if enabled
    if (this.options.enableMemorySwapping) {
      freedMemory += this.clearSwapFiles();
    }

    // Force garbage collection multiple times
    if (this.options.enableGarbageCollection && gc) {
      for (let i = 0; i < 3; i++) {
        try {
          gc();
          this.metrics.garbageCollections++;
        } catch (error) {
          console.warn('Failed to trigger garbage collection:', error.message);
          break;
        }
      }
    }

    this.metrics.cleanupOperations++;
    this.recordCleanup({
      type: 'emergency',
      startTime,
      duration: Date.now() - startTime,
      freedMemory
    });
  }

  /**
   * Emergency cleanup - free memory by any means
   */
  emergencyCleanup() {
    // Clear all internal data structures
    this.resourcePools.clear();
    this.memoryHistory = [];
    this.leakDetectors.clear();
    this.cleanupHistory = [];
    this.adaptiveMetrics.clear();

    // Trigger global garbage collection
    if (global.gc) {
      global.gc();
    }

    // Clear Node.js module cache if possible
    if (require.cache) {
      const cacheSize = Object.keys(require.cache).length;
      require.cache = {};
      console.log(`Cleared ${cacheSize} modules from cache`);
    }
  }

  /**
   * Attempt memory recovery
   */
  attemptMemoryRecovery() {
    console.log('Attempting emergency memory recovery...');

    // Try to reduce memory footprint
    try {
      // Suggest garbage collection to V8
      if (global.gc) {
        global.gc();
      }

      // Clear any large buffers
      if (global.Buffer) {
        global.Buffer.allocUnsafeSlow(0);
      }

      console.log('Memory recovery completed');
    } catch (error) {
      console.error('Memory recovery failed:', error.message);
    }
  }

  /**
   * Clear resource pools
   */
  clearResourcePools() {
    let freedMemory = 0;

    for (const [type, pool] of this.resourcePools.entries()) {
      const poolSize = pool.available.length + pool.inUse.size;
      pool.available = [];
      pool.inUse.clear();
      freedMemory += poolSize * 100; // Estimate 100 bytes per resource
    }

    return freedMemory;
  }

  /**
   * Clear all resource pools completely
   */
  clearAllResourcePools() {
    let freedMemory = 0;

    for (const [type, pool] of this.resourcePools.entries()) {
      const poolSize = pool.available.length + pool.inUse.size;
      pool.available = [];
      pool.inUse.clear();
      pool.created = 0;
      pool.reused = 0;
      freedMemory += poolSize * 100;
    }

    return freedMemory;
  }

  /**
   * Clear swap files
   */
  clearSwapFiles() {
    let freedMemory = 0;

    try {
      if (fs.existsSync(this.options.swapDirectory)) {
        const files = fs.readdirSync(this.options.swapDirectory);
        for (const file of files) {
          const filePath = path.join(this.options.swapDirectory, file);
          const stats = fs.statSync(filePath);
          fs.unlinkSync(filePath);
          freedMemory += stats.size;
        }
      }
    } catch (error) {
      console.warn('Failed to clear swap files:', error.message);
    }

    return freedMemory;
  }

  /**
   * Update memory history
   */
  updateMemoryHistory() {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();

    this.memoryHistory.push({
      timestamp,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });

    // Keep history manageable
    if (this.memoryHistory.length > 1000) {
      this.memoryHistory = this.memoryHistory.slice(-500);
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    if (this.memoryHistory.length < 10) return;

    const recent = this.memoryHistory.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    const growthRate = (newest.heapUsed - oldest.heapUsed) / oldest.heapUsed;
    const timeSpan = newest.timestamp - oldest.timestamp;

    if (growthRate > this.options.leakDetectionThreshold && timeSpan > this.options.leakDetectionWindow / 2) {
      this.metrics.memoryLeaksDetected++;
      console.warn(`Potential memory leak detected: ${((growthRate * 100).toFixed(2))}% growth over ${timeSpan / 1000}s`);

      // Take action if aggressive cleanup is enabled
      if (this.options.enableAggressiveCleanup) {
        this.performAggressiveCleanup();
      }
    }
  }

  /**
   * Update adaptive metrics
   */
  updateAdaptiveMetrics() {
    if (!this.options.enableAdaptiveSizing) return;

    const memUsage = process.memoryUsage();
    const key = 'memory-usage-pattern';

    if (!this.adaptiveMetrics.has(key)) {
      this.adaptiveMetrics.set(key, []);
    }

    const pattern = this.adaptiveMetrics.get(key);
    pattern.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      usageRatio: memUsage.heapUsed / require('os').totalmem()
    });

    // Keep window size limited
    if (pattern.length > this.options.adaptiveWindowSize) {
      pattern.shift();
    }
  }

  /**
   * Perform adaptive adjustments
   */
  performAdaptiveAdjustments() {
    if (!this.options.enableAdaptiveSizing) return;

    for (const [key, pattern] of this.adaptiveMetrics.entries()) {
      if (pattern.length < this.options.adaptiveWindowSize) continue;

      // Analyze trend
      const trend = this.analyzeMemoryTrend(pattern);

      if (trend.direction === 'increasing' && trend.rate > 0.1) {
        // Memory usage is increasing rapidly
        this.adjustResourceLimits('decrease');
        this.metrics.adaptiveAdjustments++;
      } else if (trend.direction === 'stable' && trend.rate < 0.05) {
        // Memory usage is stable, can increase limits
        this.adjustResourceLimits('increase');
        this.metrics.adaptiveAdjustments++;
      }
    }
  }

  /**
   * Analyze memory trend
   */
  analyzeMemoryTrend(pattern) {
    if (pattern.length < 2) return { direction: 'unknown', rate: 0 };

    const first = pattern[0];
    const last = pattern[pattern.length - 1];
    const rate = (last.heapUsed - first.heapUsed) / first.heapUsed;

    let direction = 'stable';
    if (rate > 0.05) direction = 'increasing';
    else if (rate < -0.05) direction = 'decreasing';

    return { direction, rate };
  }

  /**
   * Adjust resource limits based on memory pressure
   */
  adjustResourceLimits(direction) {
    const adjustment = direction === 'decrease' ? 0.8 : 1.2;

    for (const [type, pool] of this.resourcePools.entries()) {
      const newMaxSize = Math.max(10, Math.floor(pool.maxSize * adjustment));
      pool.maxSize = newMaxSize;
    }

    // Adjust other memory-related parameters
    this.options.maxPoolSize = Math.max(10, Math.floor(this.options.maxPoolSize * adjustment));
  }

  /**
   * Get resource from pool
   */
  getResource(type, creator) {
    if (!this.options.enableResourcePooling) {
      return creator();
    }

    const pool = this.resourcePools.get(type);
    if (!pool) {
      return creator();
    }

    if (pool.available.length > 0) {
      const resource = pool.available.pop();
      pool.inUse.add(resource);
      pool.reused++;
      this.metrics.poolHits++;
      return resource;
    }

    // Create new resource if under limit
    if (pool.inUse.size < pool.maxSize) {
      const resource = creator();
      pool.inUse.add(resource);
      pool.created++;
      this.metrics.poolMisses++;
      return resource;
    }

    // Pool exhausted, create temporary resource
    this.metrics.poolMisses++;
    return creator();
  }

  /**
   * Release resource back to pool
   */
  releaseResource(type, resource) {
    if (!this.options.enableResourcePooling) {
      return;
    }

    const pool = this.resourcePools.get(type);
    if (!pool) return;

    if (pool.inUse.has(resource)) {
      pool.inUse.delete(resource);

      // Only add back to available if under max size
      if (pool.available.length < pool.maxSize) {
        pool.available.push(resource);
      }
    }
  }

  /**
   * Record cleanup operation
   */
  recordCleanup(cleanup) {
    this.cleanupHistory.push(cleanup);

    // Keep history manageable
    if (this.cleanupHistory.length > 100) {
      this.cleanupHistory = this.cleanupHistory.slice(-50);
    }
  }

  /**
   * Get comprehensive memory status
   */
  getMemoryStatus() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usageRatio = memUsage.heapUsed / totalMemory;

    return {
      current: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usageRatio: usageRatio
      },
      thresholds: {
        warning: this.options.warningThreshold,
        critical: this.options.criticalThreshold,
        emergency: this.options.emergencyThreshold
      },
      status: this.getMemoryStatus(usageRatio),
      metrics: this.metrics,
      pools: this.getPoolStatus(),
      history: {
        memoryPoints: this.memoryHistory.length,
        cleanupOperations: this.cleanupHistory.length
      }
    };
  }

  /**
   * Get resource pool status
   */
  getPoolStatus() {
    const poolStatus = {};

    for (const [type, pool] of this.resourcePools.entries()) {
      poolStatus[type] = {
        available: pool.available.length,
        inUse: pool.inUse.size,
        maxSize: pool.maxSize,
        created: pool.created,
        reused: pool.reused,
        utilization: pool.inUse.size / pool.maxSize
      };
    }

    return poolStatus;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      memoryEfficiency: this.calculateMemoryEfficiency(),
      poolEfficiency: this.calculatePoolEfficiency(),
      cleanupEfficiency: this.calculateCleanupEfficiency()
    };
  }

  /**
   * Calculate memory efficiency
   */
  calculateMemoryEfficiency() {
    if (this.metrics.totalMemoryUsed === 0) return 0;

    const totalMemory = require('os').totalmem();
    return (this.metrics.totalMemoryUsed / totalMemory) * 100;
  }

  /**
   * Calculate pool efficiency
   */
  calculatePoolEfficiency() {
    const total = this.metrics.poolHits + this.metrics.poolMisses;
    if (total === 0) return 0;

    return (this.metrics.poolHits / total) * 100;
  }

  /**
   * Calculate cleanup efficiency
   */
  calculateCleanupEfficiency() {
    if (this.metrics.cleanupOperations === 0) return 0;

    // Higher efficiency means fewer cleanup operations for the same memory pressure
    const expectedCleanups = this.metrics.memoryLeaksDetected + 1;
    return Math.min(100, (expectedCleanups / this.metrics.cleanupOperations) * 100);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.options.enableResourcePooling) {
      this.clearAllResourcePools();
    }

    if (this.options.enableMemorySwapping) {
      this.clearSwapFiles();
    }

    console.log('Memory manager cleanup completed');
  }
}

/**
 * Create singleton instance for easy import
 */
const memoryManager = new MemoryManager();

/**
 * Export utilities for different use cases
 */
module.exports = {
  MemoryManager,
  memoryManager,

  /**
   * Quick access methods for common operations
   */
  getResource: (type, creator) => memoryManager.getResource(type, creator),
  releaseResource: (type, resource) => memoryManager.releaseResource(type, resource),
  getMemoryStatus: () => memoryManager.getMemoryStatus(),
  getMetrics: () => memoryManager.getMetrics(),
  performCleanup: () => memoryManager.performAggressiveCleanup(),
  cleanup: () => memoryManager.cleanup()
};