/**
 * Screenshot Utility for Visual Regression Testing
 *
 * Provides functionality for capturing, comparing, and managing screenshots
 * for visual regression testing of Chrome extension UI components.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Compare two screenshots and determine if they match within tolerance
 * @param {Object} options - Comparison options
 * @param {Buffer} options.screenshot - Current screenshot buffer
 * @param {string} options.baselinePath - Path to baseline image
 * @param {string} options.testName - Name of the test for logging
 * @param {number} options.tolerance - Pixel difference tolerance (0-1)
 * @returns {Promise<Object>} Comparison result
 */
export async function compareScreenshots(options) {
  const {
    screenshot,
    baselinePath,
    testName,
    tolerance = 0.1
  } = options;

  try {
    // Check if baseline exists
    if (!fs.existsSync(baselinePath)) {
      return {
        passed: false,
        message: `Baseline not found: ${baselinePath}`,
        difference: 1.0,
        suggestions: [
          'Run test with --update-baselines to create new baseline',
          'Verify baseline path is correct'
        ]
      };
    }

    // Read baseline image
    const baselineData = fs.readFileSync(baselinePath);
    const baselineImage = PNG.sync.read(baselineData);

    // Parse current screenshot
    const currentImage = PNG.sync.read(screenshot);

    // Check image dimensions match
    if (baselineImage.width !== currentImage.width ||
        baselineImage.height !== currentImage.height) {
      return {
        passed: false,
        message: `Image dimensions differ: baseline ${baselineImage.width}x${baselineImage.height}, current ${currentImage.width}x${currentImage.height}`,
        difference: 1.0,
        suggestions: [
          'Check viewport configuration',
          'Verify screenshot capture settings',
          'Consider responsive design changes'
        ]
      };
    }

    // Create diff image
    const diffImage = new PNG({ width: baselineImage.width, height: baselineImage.height });
    const diffPixels = pixelmatch(
      baselineImage.data,
      currentImage.data,
      diffImage.data,
      baselineImage.width,
      baselineImage.height,
      { threshold: 0.1 }
    );

    // Calculate difference percentage
    const totalPixels = baselineImage.width * baselineImage.height;
    const differencePercentage = diffPixels / totalPixels;

    // Determine if test passes
    const passed = differencePercentage <= tolerance;

    // Save diff image if test failed
    let diffPath = null;
    if (!passed) {
      diffPath = baselinePath.replace('.png', '-diff.png');
      fs.writeFileSync(diffPath, PNG.sync.write(diffImage));
    }

    return {
      passed,
      message: passed
        ? `Visual match: ${Math.round(differencePercentage * 100)}% pixel difference`
        : `Visual difference: ${Math.round(differencePercentage * 100)}% pixel difference (tolerance: ${Math.round(tolerance * 100)}%)`,
      difference: differencePercentage,
      diffPixels,
      totalPixels,
      diffPath,
      baselinePath,
      currentWidth: currentImage.width,
      currentHeight: currentImage.height,
      baselineWidth: baselineImage.width,
      baselineHeight: baselineImage.height,
      tolerance
    };

  } catch (error) {
    return {
      passed: false,
      message: `Screenshot comparison failed: ${error.message}`,
      error: error.stack,
      suggestions: [
        'Check screenshot capture functionality',
        'Verify image file formats',
        'Ensure required dependencies are installed'
      ]
    };
  }
}

/**
 * Save current screenshot for comparison
 * @param {Object} options - Save options
 * @param {Buffer} options.screenshot - Screenshot buffer to save
 * @param {string} options.outputPath - Path where to save the screenshot
 * @param {string} options.testName - Name of the test
 * @returns {Promise<Object>} Save result
 */
export async function saveCurrentScreenshot(options) {
  const {
    screenshot,
    outputPath,
    testName
  } = options;

  try {
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save screenshot
    fs.writeFileSync(outputPath, screenshot);

    return {
      success: true,
      path: outputPath,
      message: `Screenshot saved: ${outputPath}`,
      size: screenshot.length,
      testName
    };

  } catch (error) {
    return {
      success: false,
      path: outputPath,
      message: `Failed to save screenshot: ${error.message}`,
      error: error.stack,
      testName
    };
  }
}

/**
 * Create or update baseline screenshot
 * @param {Object} options - Baseline options
 * @param {Buffer} options.screenshot - New baseline screenshot
 * @param {string} options.baselinePath - Path to baseline image
 * @param {string} options.testName - Test name
 * @param {string} options.reason - Reason for baseline update
 * @returns {Promise<Object>} Update result
 */
export async function updateBaseline(options) {
  const {
    screenshot,
    baselinePath,
    testName,
    reason = 'Baseline update'
  } = options;

  try {
    // Ensure directory exists
    const baselineDir = path.dirname(baselinePath);
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    // Backup existing baseline if it exists
    if (fs.existsSync(baselinePath)) {
      const backupPath = baselinePath.replace('.png', '-backup.png');
      fs.copyFileSync(baselinePath, backupPath);
    }

    // Save new baseline
    fs.writeFileSync(baselinePath, screenshot);

    return {
      success: true,
      path: baselinePath,
      message: `Baseline updated: ${baselinePath}`,
      reason,
      testName,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      path: baselinePath,
      message: `Failed to update baseline: ${error.message}`,
      error: error.stack,
      testName
    };
  }
}

/**
 * Get baseline information
 * @param {string} baselinePath - Path to baseline image
 * @returns {Promise<Object>} Baseline information
 */
export async function getBaselineInfo(baselinePath) {
  try {
    if (!fs.existsSync(baselinePath)) {
      return {
        exists: false,
        path: baselinePath,
        message: 'Baseline does not exist'
      };
    }

    const stats = fs.statSync(baselinePath);
    const imageData = fs.readFileSync(baselinePath);
    const pngImage = PNG.sync.read(imageData);

    return {
      exists: true,
      path: baselinePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      width: pngImage.width,
      height: pngImage.height,
      pixelCount: pngImage.width * pngImage.height
    };

  } catch (error) {
    return {
      exists: false,
      path: baselinePath,
      message: `Error reading baseline: ${error.message}`,
      error: error.stack
    };
  }
}

/**
 * Generate visual test report
 * @param {Array} results - Array of comparison results
 * @returns {Object} Formatted report
 */
export function generateVisualReport(results) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  const summary = {
    total,
    passed,
    failed,
    successRate: total > 0 ? passed / total : 0
  };

  const failures = results.filter(r => !r.passed).map(r => ({
    testName: r.testName || 'Unknown',
    message: r.message,
    difference: r.difference,
    tolerance: r.tolerance,
    diffPath: r.diffPath,
    suggestions: r.suggestions || []
  }));

  return {
    type: 'visual',
    executionId: generateUUID(),
    status: failed > 0 ? 'failed' : 'passed',
    timestamp: new Date().toISOString(),
    summary,
    failures,
    results: results.map(r => ({
      testName: r.testName || 'Unknown',
      status: r.passed ? 'passed' : 'failed',
      difference: r.difference,
      message: r.message,
      baselinePath: r.baselinePath
    }))
  };
}

/**
 * Generate UUID for test execution
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export utility functions
export default {
  compareScreenshots,
  saveCurrentScreenshot,
  updateBaseline,
  getBaselineInfo,
  generateVisualReport
};