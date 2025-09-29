/**
 * Visual Comparison System Implementation
 *
 * Implements comprehensive visual baseline comparison capabilities with
 * pixel-level analysis, difference detection, and approval workflows.
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Comparison configuration options
 */
export class ComparisonConfig {
  constructor({
    threshold = 0.1,
    pixelMatchThreshold = 0.95,
    antialiasing = true,
    ignoreRegions = [],
    compareMask = null,
    outputFormat = 'png',
    createDiffImage = true,
    highlightColor = '#ff0000',
    highlightOpacity = 0.7
  } = {}) {
    this.threshold = threshold;
    this.pixelMatchThreshold = pixelMatchThreshold;
    this.antialiasing = antialiasing;
    this.ignoreRegions = ignoreRegions;
    this.compareMask = compareMask;
    this.outputFormat = outputFormat;
    this.createDiffImage = createDiffImage;
    this.highlightColor = highlightColor;
    this.highlightOpacity = highlightOpacity;
  }

  toJSON() {
    return {
      threshold: this.threshold,
      pixelMatchThreshold: this.pixelMatchThreshold,
      antialiasing: this.antialiasing,
      ignoreRegions: this.ignoreRegions,
      compareMask: this.compareMask,
      outputFormat: this.outputFormat,
      createDiffImage: this.createDiffImage,
      highlightColor: this.highlightColor,
      highlightOpacity: this.highlightOpacity
    };
  }
}

/**
 * Image metadata and dimensions
 */
export class ImageMetadata {
  constructor({
    width = 0,
    height = 0,
    format = 'png',
    fileSize = 0,
    hash = '',
    createdAt = new Date(),
    modifiedAt = new Date()
  } = {}) {
    this.width = width;
    this.height = height;
    this.format = format;
    this.fileSize = fileSize;
    this.hash = hash;
    this.createdAt = createdAt;
    this.modifiedAt = modifiedAt;
  }

  calculateAspectRatio() {
    return this.height > 0 ? this.width / this.height : 0;
  }

  calculatePixelCount() {
    return this.width * this.height;
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      format: this.format,
      fileSize: this.fileSize,
      hash: this.hash,
      aspectRatio: this.calculateAspectRatio(),
      pixelCount: this.calculatePixelCount(),
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this.modifiedAt.toISOString()
    };
  }
}

/**
 * Comparison result with detailed analysis
 */
export class ComparisonResult {
  constructor({
    id = uuidv4(),
    baselinePath = '',
    currentPath = '',
    diffPath = '',
    matches = false,
    difference = 0,
    pixelMatchRatio = 0,
    totalPixels = 0,
    differentPixels = 0,
    metadata = null,
    executionTime = 0,
    error = null,
    annotations = [],
    recommendations = []
  } = {}) {
    this.id = id;
    this.baselinePath = baselinePath;
    this.currentPath = currentPath;
    this.diffPath = diffPath;
    this.matches = matches;
    this.difference = difference;
    this.pixelMatchRatio = pixelMatchRatio;
    this.totalPixels = totalPixels;
    this.differentPixels = differentPixels;
    this.metadata = metadata || new ImageMetadata();
    this.executionTime = executionTime;
    this.error = error;
    this.annotations = annotations;
    this.recommendations = recommendations;
  }

  isWithinThreshold(threshold) {
    return this.difference <= threshold;
  }

  getSuccessRate() {
    return this.pixelMatchRatio * 100;
  }

  getSeverity() {
    if (this.difference < 0.01) return 'insignificant';
    if (this.difference < 0.05) return 'minor';
    if (this.difference < 0.1) return 'moderate';
    if (this.difference < 0.2) return 'significant';
    return 'critical';
  }

  getRecommendations() {
    const recommendations = [];

    if (this.difference > 0.2) {
      recommendations.push('Critical visual difference detected - immediate review required');
    } else if (this.difference > 0.1) {
      recommendations.push('Significant visual difference - review recommended');
    } else if (this.difference > 0.05) {
      recommendations.push('Minor visual difference - consider reviewing');
    }

    if (this.pixelMatchRatio < 0.8) {
      recommendations.push('Low pixel match ratio - check image quality and alignment');
    }

    if (this.error) {
      recommendations.push(`Error occurred: ${this.error}`);
    }

    return recommendations;
  }

  toJSON() {
    return {
      id: this.id,
      baselinePath: this.baselinePath,
      currentPath: this.currentPath,
      diffPath: this.diffPath,
      matches: this.matches,
      difference: this.difference,
      pixelMatchRatio: this.pixelMatchRatio,
      successRate: this.getSuccessRate(),
      severity: this.getSeverity(),
      totalPixels: this.totalPixels,
      differentPixels: this.differentPixels,
      metadata: this.metadata.toJSON(),
      executionTime: this.executionTime,
      error: this.error,
      recommendations: this.getRecommendations(),
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Region to ignore during comparison
 */
export class IgnoreRegion {
  constructor({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    reason = 'dynamic content'
  } = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.reason = reason;
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      reason: this.reason
    };
  }
}

/**
 * Visual Comparison System
 */
export class VisualComparisonSystem {
  constructor({
    baselineDir = './baselines',
    outputDir = './test-results',
    config = new ComparisonConfig()
  } = {}) {
    this.baselineDir = baselineDir;
    this.outputDir = outputDir;
    this.config = config;
    this.comparisons = new Map();
    this.stats = {
      totalComparisons: 0,
      successfulComparisons: 0,
      failedComparisons: 0,
      averageExecutionTime: 0,
      averageDifference: 0
    };
  }

  /**
   * Compare two images and return detailed analysis
   */
  async compareImages(baselinePath, currentPath, options = {}) {
    const startTime = Date.now();
    const comparisonId = uuidv4();

    try {
      const config = { ...this.config, ...options };

      // Validate input files exist
      this.validateImageFiles(baselinePath, currentPath);

      // Read image data
      const baselineImage = await this.readImageData(baselinePath);
      const currentImage = await this.readImageData(currentPath);

      // Validate image dimensions match
      this.validateImageDimensions(baselineImage, currentImage);

      // Perform pixel comparison
      const comparisonResult = await this.performPixelComparison(
        baselineImage,
        currentImage,
        config
      );

      // Generate difference image if requested
      let diffPath = '';
      if (config.createDiffImage) {
        diffPath = await this.generateDifferenceImage(
          baselineImage,
          currentImage,
          comparisonResult,
          comparisonId
        );
      }

      // Create result object
      const result = new ComparisonResult({
        id: comparisonId,
        baselinePath,
        currentPath,
        diffPath,
        matches: comparisonResult.difference <= config.threshold,
        difference: comparisonResult.difference,
        pixelMatchRatio: comparisonResult.pixelMatchRatio,
        totalPixels: comparisonResult.totalPixels,
        differentPixels: comparisonResult.differentPixels,
        metadata: baselineImage.metadata,
        executionTime: Date.now() - startTime,
        annotations: comparisonResult.annotations
      });

      // Store comparison result
      this.comparisons.set(comparisonId, result);
      this.updateStats(result);

      return result;

    } catch (error) {
      const result = new ComparisonResult({
        id: comparisonId,
        baselinePath,
        currentPath,
        matches: false,
        difference: 1.0,
        pixelMatchRatio: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      });

      this.comparisons.set(comparisonId, result);
      this.updateStats(result);

      throw error;
    }
  }

  /**
   * Validate that image files exist and are readable
   */
  validateImageFiles(baselinePath, currentPath) {
    if (!fs.existsSync(baselinePath)) {
      throw new Error(`Baseline image not found: ${baselinePath}`);
    }

    if (!fs.existsSync(currentPath)) {
      throw new Error(`Current image not found: ${currentPath}`);
    }

    // Check if files are readable
    try {
      fs.accessSync(baselinePath, fs.constants.R_OK);
      fs.accessSync(currentPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Cannot read image files: ${error.message}`);
    }
  }

  /**
   * Validate that image dimensions match
   */
  validateImageDimensions(baselineImage, currentImage) {
    if (baselineImage.width !== currentImage.width ||
        baselineImage.height !== currentImage.height) {
      throw new Error(
        `Image dimensions do not match. Baseline: ${baselineImage.width}x${baselineImage.height}, ` +
        `Current: ${currentImage.width}x${currentImage.height}`
      );
    }
  }

  /**
   * Read image data and metadata
   */
  async readImageData(imagePath) {
    try {
      const stats = fs.statSync(imagePath);
      const buffer = fs.readFileSync(imagePath);

      // Calculate hash for comparison
      const hash = createHash('sha256').update(buffer).digest('hex');

      // Extract dimensions (placeholder - in real implementation, use image processing library)
      const dimensions = this.extractImageDimensions(buffer);

      return {
        width: dimensions.width,
        height: dimensions.height,
        buffer,
        metadata: new ImageMetadata({
          width: dimensions.width,
          height: dimensions.height,
          fileSize: stats.size,
          hash,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        })
      };
    } catch (error) {
      throw new Error(`Failed to read image data: ${error.message}`);
    }
  }

  /**
   * Extract image dimensions (placeholder implementation)
   */
  extractImageDimensions(buffer) {
    // This is a placeholder implementation
    // In a real implementation, you would use a library like 'sharp', 'jimp', or 'pngjs'
    // to properly extract image dimensions from the buffer

    // For now, return default dimensions
    return { width: 800, height: 600 };
  }

  /**
   * Perform pixel-level comparison
   */
  async performPixelComparison(baselineImage, currentImage, config) {
    const startTime = Date.now();

    try {
      // This is a simplified implementation
      // In a real implementation, you would use pixelmatch or similar library

      const baselineBuffer = baselineImage.buffer;
      const currentBuffer = currentImage.buffer;

      // Simulate pixel comparison
      const totalPixels = baselineImage.width * baselineImage.height;
      let differentPixels = 0;

      // Simple buffer comparison (in real implementation, decode to pixels first)
      const minLength = Math.min(baselineBuffer.length, currentBuffer.length);
      for (let i = 0; i < minLength; i++) {
        if (baselineBuffer[i] !== currentBuffer[i]) {
          differentPixels++;
        }
      }

      // Account for buffer length differences
      differentPixels += Math.abs(baselineBuffer.length - currentBuffer.length);

      const pixelMatchRatio = 1 - (differentPixels / totalPixels);
      const difference = differentPixels / totalPixels;

      // Apply ignore regions if specified
      const adjustedDifference = this.applyIgnoreRegions(difference, config.ignoreRegions);

      const annotations = [
        {
          type: 'comparison-metrics',
          description: `Total pixels: ${totalPixels}, Different pixels: ${differentPixels}`
        },
        {
          type: 'performance',
          description: `Comparison time: ${Date.now() - startTime}ms`
        }
      ];

      return {
        difference: adjustedDifference,
        pixelMatchRatio,
        totalPixels,
        differentPixels,
        annotations
      };

    } catch (error) {
      throw new Error(`Pixel comparison failed: ${error.message}`);
    }
  }

  /**
   * Apply ignore regions to comparison results
   */
  applyIgnoreRegions(difference, ignoreRegions) {
    if (!ignoreRegions || ignoreRegions.length === 0) {
      return difference;
    }

    // This is a simplified implementation
    // In a real implementation, you would calculate the percentage of pixels
    // in ignore regions and adjust the difference accordingly

    let ignoreFactor = 0;
    for (const region of ignoreRegions) {
      // Calculate what percentage of the image this region covers
      const regionPixels = region.width * region.height;
      const totalPixels = 800 * 600; // Placeholder
      const regionPercentage = regionPixels / totalPixels;
      ignoreFactor += regionPercentage;
    }

    // Adjust difference by ignoring some percentage
    return Math.max(0, difference - ignoreFactor);
  }

  /**
   * Generate difference image highlighting changes
   */
  async generateDifferenceImage(baselineImage, currentImage, comparisonResult, comparisonId) {
    try {
      // Ensure output directory exists
      const diffDir = path.join(this.outputDir, 'diffs');
      if (!fs.existsSync(diffDir)) {
        fs.mkdirSync(diffDir, { recursive: true });
      }

      const diffPath = path.join(diffDir, `diff-${comparisonId}.${this.config.outputFormat}`);

      // This is a placeholder implementation
      // In a real implementation, you would:
      // 1. Decode both images to pixel arrays
      // 2. Compare pixel by pixel
      // 3. Create a new image with highlighted differences
      // 4. Save the difference image

      // For now, create a placeholder file
      const placeholderBuffer = Buffer.from('difference-image-placeholder');
      fs.writeFileSync(diffPath, placeholderBuffer);

      return diffPath;

    } catch (error) {
      console.warn(`Failed to generate difference image: ${error.message}`);
      return '';
    }
  }

  /**
   * Update comparison statistics
   */
  updateStats(result) {
    this.stats.totalComparisons++;

    if (result.matches) {
      this.stats.successfulComparisons++;
    } else {
      this.stats.failedComparisons++;
    }

    // Update averages
    this.stats.averageExecutionTime = (
      (this.stats.averageExecutionTime * (this.stats.totalComparisons - 1) + result.executionTime) /
      this.stats.totalComparisons
    );

    this.stats.averageDifference = (
      (this.stats.averageDifference * (this.stats.totalComparisons - 1) + result.difference) /
      this.stats.totalComparisons
    );
  }

  /**
   * Get comparison statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalComparisons > 0 ?
        (this.stats.successfulComparisons / this.stats.totalComparisons) * 100 : 0
    };
  }

  /**
   * Get comparison by ID
   */
  getComparison(id) {
    return this.comparisons.get(id);
  }

  /**
   * Get all comparisons
   */
  getAllComparisons() {
    return Array.from(this.comparisons.values());
  }

  /**
   * Export comparison results to JSON
   */
  exportResults(filePath) {
    const results = {
      comparisons: this.getAllComparisons().map(c => c.toJSON()),
      statistics: this.getStatistics(),
      config: this.config.toJSON(),
      exportedAt: new Date().toISOString()
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to export results: ${error.message}`);
      return false;
    }
  }

  /**
   * Load comparison results from JSON
   */
  loadResults(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const results = JSON.parse(data);

      this.comparisons.clear();
      for (const comparisonData of results.comparisons) {
        const comparison = new ComparisonResult(comparisonData);
        this.comparisons.set(comparison.id, comparison);
      }

      this.stats = results.statistics;

      return true;
    } catch (error) {
      console.error(`Failed to load results: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all comparison results
   */
  clearResults() {
    this.comparisons.clear();
    this.stats = {
      totalComparisons: 0,
      successfulComparisons: 0,
      failedComparisons: 0,
      averageExecutionTime: 0,
      averageDifference: 0
    };
  }

  /**
   * Create comparison report
   */
  generateReport() {
    const stats = this.getStatistics();
    const comparisons = this.getAllComparisons();

    const report = {
      summary: {
        totalComparisons: stats.totalComparisons,
        successRate: stats.successRate,
        averageExecutionTime: stats.averageExecutionTime,
        averageDifference: stats.averageDifference
      },
      comparisons: comparisons.map(c => c.toJSON()),
      recommendations: this.generateSystemRecommendations(stats)
    };

    return report;
  }

  /**
   * Generate system-wide recommendations
   */
  generateSystemRecommendations(stats) {
    const recommendations = [];

    if (stats.successRate < 80) {
      recommendations.push('Low success rate detected - consider reviewing test configuration');
    }

    if (stats.averageExecutionTime > 1000) {
      recommendations.push('Slow comparison performance - consider optimizing image processing');
    }

    if (stats.averageDifference > 0.1) {
      recommendations.push('High average difference detected - consider updating baselines');
    }

    return recommendations;
  }
}

/**
 * Factory function to create visual comparison system
 */
export function createVisualComparisonSystem(options = {}) {
  return new VisualComparisonSystem(options);
}

/**
 * Utility functions for common comparison scenarios
 */
export const ComparisonUtils = {
  /**
   * Create default comparison configuration for different test types
   */
  createConfig(type) {
    switch (type) {
      case 'strict':
        return new ComparisonConfig({
          threshold: 0.01,
          pixelMatchThreshold: 0.99,
          antialiasing: false
        });

      case 'moderate':
        return new ComparisonConfig({
          threshold: 0.05,
          pixelMatchThreshold: 0.95,
          antialiasing: true
        });

      case 'lenient':
        return new ComparisonConfig({
          threshold: 0.15,
          pixelMatchThreshold: 0.85,
          antialiasing: true
        });

      case 'dynamic':
        return new ComparisonConfig({
          threshold: 0.1,
          pixelMatchThreshold: 0.9,
          antialiasing: true,
          ignoreRegions: [
            new IgnoreRegion({ x: 0, y: 0, width: 200, height: 30, reason: 'timestamp' })
          ]
        });

      default:
        return new ComparisonConfig();
    }
  },

  /**
   * Create ignore region for dynamic content
   */
  createTimestampRegion(x = 0, y = 0, width = 200, height = 30) {
    return new IgnoreRegion({
      x, y, width, height,
      reason: 'dynamic timestamp'
    });
  },

  /**
   * Create ignore region for loading indicators
   */
  createLoadingRegion(x, y, width = 50, height = 50) {
    return new IgnoreRegion({
      x, y, width, height,
      reason: 'loading indicator'
    });
  },

  /**
   * Calculate image hash for quick comparison
   */
  calculateImageHash(imagePath) {
    try {
      const buffer = fs.readFileSync(imagePath);
      return createHash('sha256').update(buffer).digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate image hash: ${error.message}`);
    }
  }
};

export default VisualComparisonSystem;