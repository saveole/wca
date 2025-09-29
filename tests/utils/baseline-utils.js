/**
 * Baseline Management Utility
 *
 * Provides comprehensive baseline management for visual regression testing
 * including versioning, approval workflows, and storage management.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Baseline management configuration
 */
const BASELINE_CONFIG = {
  // Storage structure
  directories: {
    baseline: 'tests/ui/visual/baseline',
    current: 'tests/ui/visual/current',
    diffs: 'tests/ui/visual/diffs',
    archive: 'tests/ui/visual/archive',
    metadata: 'tests/ui/visual/metadata'
  },

  // File naming conventions
  naming: {
    baseline: '{testName}-{viewport}-{theme}.png',
    current: '{testName}-{viewport}-{theme}-current.png',
    diff: '{testName}-{viewport}-{theme}-diff.png',
    metadata: '{testName}-{viewport}-{theme}-meta.json'
  },

  // Version management
  versioning: {
    enabled: true,
    maxVersions: 5,
    namingPattern: '{testName}-{viewport}-{theme}-v{version}.png',
    metadataFile: 'versions.json'
  },

  // Approval workflow
  approval: {
    required: true,
    autoApproveThreshold: 0.001, // 0.1% difference
    manualReviewRequired: 0.01,  // 1% difference
    approvalFile: 'approvals.json',
    commentRequired: true
  },

  // Cleanup and maintenance
  cleanup: {
    enabled: true,
    maxAgeDays: 30,
    maxSizeMB: 100,
    keepApproved: true,
    archiveRejected: true
  }
};

/**
 * Baseline metadata structure
 */
class BaselineMetadata {
  constructor({
    testId,
    testName,
    viewport,
    theme,
    version = 1,
    created = new Date().toISOString(),
    modified = new Date().toISOString(),
    author = 'system',
    approved = false,
    approvedBy = null,
    approvedAt = null,
    approvalComment = null,
    tags = [],
    description = '',
    environment = {},
    screenshotInfo = {},
    difference = 0,
    status = 'pending'
  } = {}) {
    this.testId = testId;
    this.testName = testName;
    this.viewport = viewport;
    this.theme = theme;
    this.version = version;
    this.created = created;
    this.modified = modified;
    this.author = author;
    this.approved = approved;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
    this.approvalComment = approvalComment;
    this.tags = tags;
    this.description = description;
    this.environment = environment;
    this.screenshotInfo = screenshotInfo;
    this.difference = difference;
    this.status = status;
  }

  toJSON() {
    return {
      testId: this.testId,
      testName: this.testName,
      viewport: this.viewport,
      theme: this.theme,
      version: this.version,
      created: this.created,
      modified: this.modified,
      author: this.author,
      approved: this.approved,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      approvalComment: this.approvalComment,
      tags: this.tags,
      description: this.description,
      environment: this.environment,
      screenshotInfo: this.screenshotInfo,
      difference: this.difference,
      status: this.status
    };
  }

  static fromJSON(data) {
    return new BaselineMetadata(data);
  }
}

/**
 * Initialize baseline directory structure
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeBaselines(options = {}) {
  const {
    config = BASELINE_CONFIG,
    force = false,
    verbose = false
  } = options;

  try {
    const results = {
      directories: [],
      errors: [],
      success: false
    };

    // Create all required directories
    for (const [key, dirPath] of Object.entries(config.directories)) {
      try {
        if (!fs.existsSync(dirPath) || force) {
          fs.mkdirSync(dirPath, { recursive: true });
          results.directories.push({
            name: key,
            path: dirPath,
            status: 'created'
          });

          if (verbose) {
            console.log(`Created directory: ${dirPath}`);
          }
        } else {
          results.directories.push({
            name: key,
            path: dirPath,
            status: 'exists'
          });
        }
      } catch (error) {
        results.errors.push({
          type: 'directory',
          path: dirPath,
          error: error.message
        });
      }
    }

    // Initialize version tracking
    if (config.versioning.enabled) {
      const versionFile = path.join(config.directories.metadata, config.versioning.metadataFile);
      if (!fs.existsSync(versionFile) || force) {
        const versionData = {
          versions: {},
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

        if (verbose) {
          console.log(`Created version tracking file: ${versionFile}`);
        }
      }
    }

    // Initialize approval tracking
    if (config.approval.required) {
      const approvalFile = path.join(config.directories.metadata, config.approval.approvalFile);
      if (!fs.existsSync(approvalFile) || force) {
        const approvalData = {
          approvals: {},
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(approvalFile, JSON.stringify(approvalData, null, 2));

        if (verbose) {
          console.log(`Created approval tracking file: ${approvalFile}`);
        }
      }
    }

    results.success = results.errors.length === 0;
    return results;

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Create a new baseline
 * @param {Object} options - Baseline creation options
 * @returns {Promise<Object>} Creation result
 */
export async function createBaseline(options = {}) {
  const {
    screenshot,
    testName,
    viewport,
    theme,
    description = '',
    author = 'system',
    tags = [],
    environment = {},
    config = BASELINE_CONFIG
  } = options;

  try {
    // Validate inputs
    if (!screenshot || !testName || !viewport || !theme) {
      throw new Error('Missing required parameters: screenshot, testName, viewport, theme');
    }

    // Generate file paths
    const baselinePath = generateBaselinePath(testName, viewport, theme, config);
    const metadataPath = generateMetadataPath(testName, viewport, theme, config);

    // Check if baseline already exists
    if (fs.existsSync(baselinePath)) {
      // Create version backup if versioning is enabled
      if (config.versioning.enabled) {
        await createVersionBackup(baselinePath, metadataPath, config);
      }
    }

    // Save baseline image
    fs.writeFileSync(baselinePath, screenshot);

    // Create metadata
    const metadata = new BaselineMetadata({
      testId: generateTestId(testName, viewport, theme),
      testName,
      viewport,
      theme,
      description,
      author,
      tags,
      environment,
      screenshotInfo: {
        size: screenshot.length,
        path: baselinePath,
        format: 'png'
      },
      status: 'pending'
    });

    // Save metadata
    fs.writeFileSync(metadataPath, JSON.stringify(metadata.toJSON(), null, 2));

    // Update version tracking
    if (config.versioning.enabled) {
      await updateVersionTracking(metadata, config);
    }

    return {
      success: true,
      baselinePath,
      metadataPath,
      metadata: metadata.toJSON(),
      message: `Baseline created: ${baselinePath}`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Get baseline information
 * @param {string} testName - Test name
 * @param {string} viewport - Viewport configuration
 * @param {string} theme - Theme name
 * @param {Object} config - Baseline configuration
 * @returns {Promise<Object>} Baseline information
 */
export async function getBaseline(testName, viewport, theme, config = BASELINE_CONFIG) {
  try {
    const baselinePath = generateBaselinePath(testName, viewport, theme, config);
    const metadataPath = generateMetadataPath(testName, viewport, theme, config);

    if (!fs.existsSync(baselinePath)) {
      return {
        exists: false,
        reason: 'Baseline not found'
      };
    }

    // Read baseline info
    const stats = fs.statSync(baselinePath);
    const imageData = fs.readFileSync(baselinePath);

    // Read metadata if it exists
    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      const metadataData = fs.readFileSync(metadataPath, 'utf8');
      metadata = JSON.parse(metadataData);
    }

    return {
      exists: true,
      path: baselinePath,
      metadataPath,
      metadata,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      imageSize: imageData.length,
      width: metadata?.screenshotInfo?.width || 0,
      height: metadata?.screenshotInfo?.height || 0
    };

  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Approve a baseline
 * @param {Object} options - Approval options
 * @returns {Promise<Object>} Approval result
 */
export async function approveBaseline(options = {}) {
  const {
    testName,
    viewport,
    theme,
    approvedBy,
    approvalComment = '',
    force = false,
    config = BASELINE_CONFIG
  } = options;

  try {
    // Get baseline metadata
    const baselineInfo = await getBaseline(testName, viewport, theme, config);
    if (!baselineInfo.exists) {
      throw new Error('Baseline not found');
    }

    const metadata = baselineInfo.metadata || new BaselineMetadata({
      testName,
      viewport,
      theme
    });

    // Check if already approved
    if (metadata.approved && !force) {
      return {
        success: false,
        message: 'Baseline is already approved',
        baseline: metadata
      };
    }

    // Update approval status
    metadata.approved = true;
    metadata.approvedBy = approvedBy;
    metadata.approvedAt = new Date().toISOString();
    metadata.approvalComment = approvalComment;
    metadata.status = 'approved';
    metadata.modified = new Date().toISOString();

    // Save updated metadata
    const metadataPath = generateMetadataPath(testName, viewport, theme, config);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata.toJSON(), null, 2));

    // Update approval tracking
    if (config.approval.required) {
      await updateApprovalTracking(metadata, config);
    }

    return {
      success: true,
      baseline: metadata.toJSON(),
      message: `Baseline approved by ${approvedBy}`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all baselines
 * @param {Object} options - Listing options
 * @returns {Promise<Object>} List of baselines
 */
export async function listBaselines(options = {}) {
  const {
    filter = {},
    config = BASELINE_CONFIG
  } = options;

  try {
    const baselineDir = config.directories.baseline;
    const metadataDir = config.directories.metadata;

    if (!fs.existsSync(baselineDir)) {
      return {
        baselines: [],
        total: 0,
        filtered: 0
      };
    }

    // Read all baseline files
    const files = fs.readdirSync(baselineDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));

    const baselines = [];
    for (const file of pngFiles) {
      try {
        // Parse file name to extract test info
        const parsed = parseBaselineFilename(file, config.naming.baseline);
        if (!parsed) continue;

        // Apply filters
        if (filter.testName && parsed.testName !== filter.testName) continue;
        if (filter.viewport && parsed.viewport !== filter.viewport) continue;
        if (filter.theme && parsed.theme !== filter.theme) continue;
        if (filter.status && parsed.status !== filter.status) continue;

        // Get baseline info
        const baselineInfo = await getBaseline(
          parsed.testName,
          parsed.viewport,
          parsed.theme,
          config
        );

        baselines.push({
          filename: file,
          ...parsed,
          ...baselineInfo
        });
      } catch (error) {
        console.warn(`Error processing baseline file ${file}:`, error.message);
      }
    }

    return {
      baselines,
      total: pngFiles.length,
      filtered: baselines.length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up old baselines
 * @param {Object} options - Cleanup options
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupBaselines(options = {}) {
  const {
    config = BASELINE_CONFIG,
    dryRun = false
  } = options;

  try {
    const results = {
      deleted: [],
      archived: [],
      errors: [],
      spaceFreed: 0
    };

    const baselineDir = config.directories.baseline;
    const archiveDir = config.directories.archive;

    if (!fs.existsSync(baselineDir)) {
      return {
        success: true,
        message: 'No baselines to clean up',
        results
      };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.cleanup.maxAgeDays);

    const files = fs.readdirSync(baselineDir);

    for (const file of files) {
      try {
        const filePath = path.join(baselineDir, file);
        const stats = fs.statSync(filePath);

        // Check if file is old enough to clean up
        if (stats.mtime < cutoffDate) {
          const fileSize = stats.size;

          if (config.cleanup.archiveRejected && !dryRun) {
            // Archive instead of delete
            const archivePath = path.join(archiveDir, file);
            fs.copyFileSync(filePath, archivePath);
            results.archived.push({
              file,
              path: filePath,
              archivePath,
              size: fileSize
            });
          }

          if (!dryRun) {
            fs.unlinkSync(filePath);
            results.spaceFreed += fileSize;
          }

          results.deleted.push({
            file,
            path: filePath,
            size: fileSize,
            age: Math.floor((cutoffDate - stats.mtime) / (1000 * 60 * 60 * 24))
          });
        }
      } catch (error) {
        results.errors.push({
          file,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      message: `Cleanup ${dryRun ? 'simulated' : 'completed'}`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions

function generateTestId(testName, viewport, theme) {
  return `${testName}-${viewport}-${theme}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

function generateBaselinePath(testName, viewport, theme, config) {
  const filename = config.naming.baseline
    .replace('{testName}', testName)
    .replace('{viewport}', viewport)
    .replace('{theme}', theme);

  return path.join(config.directories.baseline, filename);
}

function generateMetadataPath(testName, viewport, theme, config) {
  const filename = config.naming.metadata
    .replace('{testName}', testName)
    .replace('{viewport}', viewport)
    .replace('{theme}', theme);

  return path.join(config.directories.metadata, filename);
}

function parseBaselineFilename(filename, pattern) {
  // Simple parsing - in production, use more sophisticated pattern matching
  const parts = filename.replace('.png', '').split('-');
  if (parts.length < 3) return null;

  return {
    testName: parts.slice(0, -2).join('-'),
    viewport: parts[parts.length - 2],
    theme: parts[parts.length - 1]
  };
}

async function createVersionBackup(baselinePath, metadataPath, config) {
  try {
    const baselineDir = config.directories.baseline;
    const archiveDir = config.directories.archive;

    // Ensure archive directory exists
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Get current version
    const versionFile = path.join(config.directories.metadata, config.versioning.metadataFile);
    let versionData = { versions: {} };

    if (fs.existsSync(versionFile)) {
      const content = fs.readFileSync(versionFile, 'utf8');
      versionData = JSON.parse(content);
    }

    const baselineFilename = path.basename(baselinePath);
    const key = generateTestId(
      ...parseBaselineFilename(baselineFilename, config.naming.baseline)
    );

    const currentVersion = (versionData.versions[key] || 0) + 1;
    versionData.versions[key] = currentVersion;

    // Create version backup
    const versionFilename = config.versioning.namingPattern
      .replace('{testName}', key.split('-').slice(0, -2).join('-'))
      .replace('{viewport}', key.split('-').slice(-2, -1)[0])
      .replace('{theme}', key.split('-').slice(-1)[0])
      .replace('{version}', currentVersion);

    const versionPath = path.join(archiveDir, versionFilename);
    fs.copyFileSync(baselinePath, versionPath);

    // Update version tracking
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

    return {
      success: true,
      version: currentVersion,
      path: versionPath
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function updateVersionTracking(metadata, config) {
  try {
    const versionFile = path.join(config.directories.metadata, config.versioning.metadataFile);
    let versionData = { versions: {} };

    if (fs.existsSync(versionFile)) {
      const content = fs.readFileSync(versionFile, 'utf8');
      versionData = JSON.parse(content);
    }

    const key = metadata.testId;
    versionData.versions[key] = metadata.version;
    versionData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateApprovalTracking(metadata, config) {
  try {
    const approvalFile = path.join(config.directories.metadata, config.approval.approvalFile);
    let approvalData = { approvals: {} };

    if (fs.existsSync(approvalFile)) {
      const content = fs.readFileSync(approvalFile, 'utf8');
      approvalData = JSON.parse(content);
    }

    const key = metadata.testId;
    approvalData.approvals[key] = {
      approved: metadata.approved,
      approvedBy: metadata.approvedBy,
      approvedAt: metadata.approvedAt,
      approvalComment: metadata.approvalComment,
      version: metadata.version
    };
    approvalData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(approvalFile, JSON.stringify(approvalData, null, 2));

    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  initializeBaselines,
  createBaseline,
  getBaseline,
  approveBaseline,
  listBaselines,
  cleanupBaselines,
  BaselineMetadata,
  BASELINE_CONFIG
};