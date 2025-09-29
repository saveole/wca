/**
 * Screenshot Caching Mechanism for Repeated Tests
 *
 * Provides intelligent caching of screenshots to improve performance
 * during repeated test executions. Implements cache invalidation,
 * compression, and memory management for optimal performance.
 *
 * Features:
 * - In-memory caching with configurable TTL
 * - File-based persistent caching with compression
 * - Cache invalidation based on file changes and test configurations
 * - Memory usage monitoring and automatic cleanup
 * - Cache statistics and performance metrics
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

class ScreenshotCache {
  constructor(options = {}) {
    this.options = {
      // Cache configuration
      maxMemorySize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB default
      maxCacheEntries: options.maxCacheEntries || 1000,
      defaultTTL: options.defaultTTL || 3600000, // 1 hour default
      compressionLevel: options.compressionLevel || 6,

      // Cache directories
      cacheDirectory: options.cacheDirectory || path.join(process.cwd(), 'test-results', 'screenshot-cache'),
      tempDirectory: options.tempDirectory || path.join(process.cwd(), 'test-results', 'temp'),

      // Performance settings
      enableCompression: options.enableCompression !== false,
      enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
      enablePersistentCache: options.enablePersistentCache !== false,

      // Cache invalidation
      enableHashValidation: options.enableHashValidation !== false,
      enableDependencyTracking: options.enableDependencyTracking !== false,

      ...options
    };

    // Initialize cache storage
    this.memoryCache = new Map();
    this.accessTimes = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      compressionRatio: 0
    };

    // Initialize directories
    this.initializeDirectories();

    // Start monitoring if enabled
    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Initialize cache directories
   */
  initializeDirectories() {
    try {
      if (!fs.existsSync(this.options.cacheDirectory)) {
        fs.mkdirSync(this.options.cacheDirectory, { recursive: true });
      }

      if (!fs.existsSync(this.options.tempDirectory)) {
        fs.mkdirSync(this.options.tempDirectory, { recursive: true });
      }
    } catch (error) {
      console.warn(`Failed to initialize cache directories: ${error.message}`);
    }
  }

  /**
   * Generate cache key for screenshot
   */
  generateCacheKey(component, viewport, theme, options = {}) {
    const keyData = {
      component,
      viewport: `${viewport.width}x${viewport.height}`,
      theme,
      timestamp: options.timestamp || Date.now(),
      options: JSON.stringify(options || {}),
      dependencies: this.getDependencyHash(options.dependencies || [])
    };

    return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Get dependency hash for cache invalidation
   */
  getDependencyHash(dependencies) {
    if (!dependencies || dependencies.length === 0) {
      return 'no-deps';
    }

    const dependencyHashes = dependencies.map(dep => {
      try {
        if (fs.existsSync(dep)) {
          const stats = fs.statSync(dep);
          return `${dep}:${stats.mtime.getTime()}:${stats.size}`;
        }
        return `${dep}:missing`;
      } catch (error) {
        return `${dep}:error:${error.message}`;
      }
    });

    return crypto.createHash('md5').update(dependencyHashes.join('|')).digest('hex').substring(0, 8);
  }

  /**
   * Store screenshot in cache
   */
  async cacheScreenshot(key, screenshot, metadata = {}) {
    const startTime = Date.now();

    try {
      // Validate screenshot buffer
      if (!Buffer.isBuffer(screenshot)) {
        throw new Error('Screenshot must be a Buffer');
      }

      // Prepare cache entry
      const cacheEntry = {
        key,
        screenshot,
        metadata: {
          ...metadata,
          cachedAt: Date.now(),
          size: screenshot.length,
          hash: crypto.createHash('md5').update(screenshot).digest('hex')
        }
      };

      // Compress if enabled
      if (this.options.enableCompression) {
        cacheEntry.screenshot = await this.compressScreenshot(screenshot);
        cacheEntry.metadata.compressed = true;
        cacheEntry.metadata.originalSize = metadata.size || screenshot.length;
      }

      // Store in memory cache
      await this.storeInMemoryCache(key, cacheEntry);

      // Store in persistent cache if enabled
      if (this.options.enablePersistentCache) {
        await this.storeInPersistentCache(key, cacheEntry);
      }

      // Update statistics
      this.cacheStats.size = this.calculateTotalCacheSize();
      this.cacheStats.compressionRatio = this.calculateCompressionRatio();

      // Perform cache cleanup if needed
      await this.performCacheCleanup();

      return {
        success: true,
        key,
        cached: true,
        executionTime: Date.now() - startTime,
        cacheSize: this.cacheStats.size
      };

    } catch (error) {
      console.warn(`Failed to cache screenshot: ${error.message}`);
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Retrieve screenshot from cache
   */
  async getCachedScreenshot(key) {
    const startTime = Date.now();

    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValidCacheEntry(memoryEntry)) {
        this.updateAccessTime(key);
        this.cacheStats.hits++;

        return {
          success: true,
          screenshot: await this.decompressScreenshot(memoryEntry.screenshot, memoryEntry.metadata),
          metadata: memoryEntry.metadata,
          source: 'memory',
          executionTime: Date.now() - startTime
        };
      }

      // Check persistent cache if enabled
      if (this.options.enablePersistentCache) {
        const persistentEntry = await this.getFromPersistentCache(key);
        if (persistentEntry && this.isValidCacheEntry(persistentEntry)) {
          // Restore to memory cache
          await this.storeInMemoryCache(key, persistentEntry);
          this.updateAccessTime(key);
          this.cacheStats.hits++;

          return {
            success: true,
            screenshot: await this.decompressScreenshot(persistentEntry.screenshot, persistentEntry.metadata),
            metadata: persistentEntry.metadata,
            source: 'persistent',
            executionTime: Date.now() - startTime
          };
        }
      }

      this.cacheStats.misses++;
      return {
        success: false,
        error: 'Cache miss',
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      this.cacheStats.misses++;
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Store entry in memory cache
   */
  async storeInMemoryCache(key, entry) {
    // Check memory limits
    if (this.cacheStats.size >= this.options.maxMemorySize) {
      await this.evictFromMemoryCache();
    }

    this.memoryCache.set(key, entry);
    this.updateAccessTime(key);
  }

  /**
   * Store entry in persistent cache
   */
  async storeInPersistentCache(key, entry) {
    try {
      const cacheFile = path.join(this.options.cacheDirectory, `${key}.cache`);
      const cacheData = JSON.stringify({
        metadata: entry.metadata,
        screenshot: entry.screenshot.toString('base64')
      });

      await fs.promises.writeFile(cacheFile, cacheData);
    } catch (error) {
      console.warn(`Failed to store in persistent cache: ${error.message}`);
    }
  }

  /**
   * Get entry from persistent cache
   */
  async getFromPersistentCache(key) {
    try {
      const cacheFile = path.join(this.options.cacheDirectory, `${key}.cache`);

      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const cacheData = await fs.promises.readFile(cacheFile, 'utf8');
      const parsed = JSON.parse(cacheData);

      return {
        metadata: parsed.metadata,
        screenshot: Buffer.from(parsed.screenshot, 'base64')
      };
    } catch (error) {
      console.warn(`Failed to get from persistent cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Compress screenshot
   */
  async compressScreenshot(screenshot) {
    return new Promise((resolve, reject) => {
      zlib.gzip(screenshot, { level: this.options.compressionLevel }, (error, compressed) => {
        if (error) {
          reject(error);
        } else {
          resolve(compressed);
        }
      });
    });
  }

  /**
   * Decompress screenshot
   */
  async decompressScreenshot(screenshot, metadata = {}) {
    if (!metadata.compressed) {
      return screenshot;
    }

    return new Promise((resolve, reject) => {
      zlib.gunzip(screenshot, (error, decompressed) => {
        if (error) {
          reject(error);
        } else {
          resolve(decompressed);
        }
      });
    });
  }

  /**
   * Check if cache entry is valid
   */
  isValidCacheEntry(entry) {
    if (!entry || !entry.metadata) {
      return false;
    }

    // Check TTL
    const now = Date.now();
    const age = now - entry.metadata.cachedAt;
    if (age > this.options.defaultTTL) {
      return false;
    }

    // Check hash integrity if available
    if (entry.metadata.hash && entry.screenshot) {
      const currentHash = crypto.createHash('md5').update(entry.screenshot).digest('hex');
      return currentHash === entry.metadata.hash;
    }

    return true;
  }

  /**
   * Update access time for LRU eviction
   */
  updateAccessTime(key) {
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Evict entries from memory cache (LRU)
   */
  async evictFromMemoryCache() {
    if (this.memoryCache.size === 0) {
      return;
    }

    // Sort by access time (LRU)
    const sortedKeys = Array.from(this.accessTimes.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => key);

    // Evict 25% of entries
    const evictCount = Math.max(1, Math.floor(sortedKeys.length * 0.25));

    for (let i = 0; i < evictCount; i++) {
      const key = sortedKeys[i];
      this.memoryCache.delete(key);
      this.accessTimes.delete(key);
      this.cacheStats.evictions++;
    }

    this.cacheStats.size = this.calculateTotalCacheSize();
  }

  /**
   * Perform cache cleanup
   */
  async performCacheCleanup() {
    // Memory cache cleanup
    if (this.cacheStats.size > this.options.maxMemorySize) {
      await this.evictFromMemoryCache();
    }

    // Entry count cleanup
    if (this.memoryCache.size > this.options.maxCacheEntries) {
      await this.evictFromMemoryCache();
    }

    // Persistent cache cleanup
    if (this.options.enablePersistentCache) {
      await this.cleanupPersistentCache();
    }
  }

  /**
   * Cleanup persistent cache files
   */
  async cleanupPersistentCache() {
    try {
      const files = await fs.promises.readdir(this.options.cacheDirectory);
      const cacheFiles = files.filter(file => file.endsWith('.cache'));

      if (cacheFiles.length > this.options.maxCacheEntries) {
        // Sort by modification time and remove oldest
        const fileStats = await Promise.all(
          cacheFiles.map(async file => {
            const filePath = path.join(this.options.cacheDirectory, file);
            const stats = await fs.promises.stat(filePath);
            return { file, mtime: stats.mtime };
          })
        );

        fileStats.sort((a, b) => a.mtime - b.mtime);

        const filesToRemove = fileStats.slice(0, cacheFiles.length - this.options.maxCacheEntries);

        await Promise.all(
          filesToRemove.map(({ file }) =>
            fs.promises.unlink(path.join(this.options.cacheDirectory, file))
          )
        );
      }
    } catch (error) {
      console.warn(`Failed to cleanup persistent cache: ${error.message}`);
    }
  }

  /**
   * Calculate total cache size
   */
  calculateTotalCacheSize() {
    let totalSize = 0;

    for (const entry of this.memoryCache.values()) {
      if (entry.screenshot) {
        totalSize += entry.screenshot.length;
      }
    }

    return totalSize;
  }

  /**
   * Calculate compression ratio
   */
  calculateCompressionRatio() {
    let compressedSize = 0;
    let originalSize = 0;
    let compressedCount = 0;

    for (const entry of this.memoryCache.values()) {
      if (entry.metadata && entry.metadata.compressed) {
        compressedSize += entry.screenshot.length;
        originalSize += entry.metadata.originalSize || 0;
        compressedCount++;
      }
    }

    if (compressedCount === 0 || originalSize === 0) {
      return 0;
    }

    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsed = memUsage.heapUsed;
      const heapTotal = memUsage.heapTotal;
      const usagePercent = (heapUsed / heapTotal) * 100;

      // Perform aggressive cleanup if memory usage is high
      if (usagePercent > 80) {
        this.evictFromMemoryCache().catch(console.warn);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Clear cache
   */
  async clearCache() {
    // Clear memory cache
    this.memoryCache.clear();
    this.accessTimes.clear();

    // Clear persistent cache
    if (this.options.enablePersistentCache) {
      try {
        const files = await fs.promises.readdir(this.options.cacheDirectory);
        await Promise.all(
          files
            .filter(file => file.endsWith('.cache'))
            .map(file =>
              fs.promises.unlink(path.join(this.options.cacheDirectory, file))
            )
        );
      } catch (error) {
        console.warn(`Failed to clear persistent cache: ${error.message}`);
      }
    }

    // Reset statistics
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      compressionRatio: 0
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
      : 0;

    return {
      ...this.cacheStats,
      hitRate: hitRate.toFixed(2) + '%',
      memoryEntries: this.memoryCache.size,
      config: {
        maxMemorySize: this.options.maxMemorySize,
        maxCacheEntries: this.options.maxCacheEntries,
        compressionEnabled: this.options.enableCompression
      }
    };
  }

  /**
   * Prefetch screenshots for upcoming tests
   */
  async prefetchScreenshots(testConfigs) {
    const prefetchPromises = testConfigs.map(async config => {
      const key = this.generateCacheKey(
        config.component,
        config.viewport,
        config.theme,
        config.options
      );

      const cached = await this.getCachedScreenshot(key);
      if (!cached.success) {
        // Trigger background capture if not cached
        this.triggerBackgroundCapture(config).catch(console.warn);
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Trigger background screenshot capture
   */
  async triggerBackgroundCapture(config) {
    // This would be implemented to integrate with the screenshot utility
    // For now, it's a placeholder for background caching functionality
    console.log(`Background capture triggered for ${config.component}`);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.clearCache();
  }
}

/**
 * Create singleton instance for easy import
 */
const screenshotCache = new ScreenshotCache();

/**
 * Export utilities for different use cases
 */
module.exports = {
  ScreenshotCache,
  screenshotCache,

  /**
   * Quick access methods for common operations
   */
  cacheScreenshot: (key, screenshot, metadata) => screenshotCache.cacheScreenshot(key, screenshot, metadata),
  getCachedScreenshot: (key) => screenshotCache.getCachedScreenshot(key),
  generateCacheKey: (component, viewport, theme, options) => screenshotCache.generateCacheKey(component, viewport, theme, options),
  getCacheStats: () => screenshotCache.getCacheStats(),
  clearCache: () => screenshotCache.clearCache(),
  prefetchScreenshots: (configs) => screenshotCache.prefetchScreenshots(configs),
  cleanup: () => screenshotCache.cleanup()
};