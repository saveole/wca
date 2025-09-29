/**
 * Chrome Extension Testing Utilities
 *
 * This file provides utilities for testing Chrome extensions with Playwright,
 * handling extension-specific operations like getting extension ID, navigating
 * to extension pages, and handling extension context.
 */

/**
 * Get the Chrome extension ID from the manifest
 * @returns {Promise<string>} Extension ID
 */
export async function getExtensionId() {
  // In a real implementation, this would extract from manifest or use a known ID
  // For testing purposes, we'll use a placeholder
  return 'YOUR_EXTENSION_ID';
}

/**
 * Navigate to an extension page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} pagePath - Path within the extension (e.g., 'ui/main_popup.html')
 * @returns {Promise<void>}
 */
export async function navigateToExtensionPage(page, pagePath) {
  const extensionId = await getExtensionId();
  const url = `/ui/main_popup.html

  // Navigate with extended timeout for extension pages
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 10000
  });
}

/**
 * Wait for extension to be fully loaded
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function waitForExtensionLoad(page) {
  // Wait for extension-specific elements to be available
  await page.waitForSelector('body', { timeout: 10000 });

  // Wait for any dynamic content to load
  await page.waitForLoadState('networkidle', { timeout: 5000 });
}

/**
 * Inject content script for page extraction (if needed)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function injectContentScript(page) {
  await page.addInitScript(() => {
    // Mock chrome API for testing
    if (typeof chrome === 'undefined') {
      window.chrome = {
        runtime: {
          sendMessage: () => Promise.resolve({}),
          onMessage: {
            addListener: () => {}
          }
        },
        storage: {
          sync: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve()
          },
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve()
          }
        },
        tabs: {
          query: () => Promise.resolve([{}]),
          sendMessage: () => Promise.resolve({})
        }
      };
    }
  });
}

/**
 * Get extension manifest information
 * @returns {Promise<Object>} Manifest data
 */
export async function getManifest() {
  try {
    // In real implementation, this would read manifest.json
    return {
      manifest_version: 3,
      name: "WebClip Assistant",
      version: "1.0.0",
      description: "AI-powered web content capture and organization tool"
    };
  } catch (error) {
    console.error('Failed to load manifest:', error);
    return {};
  }
}

/**
 * Setup extension testing environment
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function setupExtensionTest(page) {
  // Inject chrome API mocks
  await injectContentScript(page);

  // Set default viewport for desktop testing
  await page.setViewportSize({ width: 1280, height: 720 });

  // Configure for extension testing
  await page.context().route('/ui/main_popup.html
}