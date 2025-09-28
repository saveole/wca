import { test, expect } from '@playwright/test';
import { compareScreenshots } from '../utils/screenshot-utils.js';
import { ScreenshotCache } from '../utils/screenshot-cache.js';
import config from '../utils/config.js';

test.describe('Visual Regression Test Examples', () => {
  let screenshotCache;

  test.beforeAll(() => {
    // Initialize screenshot cache for performance optimization
    screenshotCache = new ScreenshotCache({
      maxMemorySize: config.cache.maxMemorySize,
      maxCacheEntries: config.cache.maxCacheEntries,
      defaultTTL: config.cache.defaultTTL,
      compressionLevel: config.cache.compressionLevel
    });
  });

  test.describe('Chrome Extension UI Components', () => {
    test('popup should render correctly with proper layout and styling', async ({ page }) => {
      const startTime = performance.now();

      // Set viewport and theme
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.emulateMedia({ colorScheme: 'light' });

      // Navigate to popup
      await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');

      // Wait for content to load with error handling
      try {
        await page.waitForSelector('.popup-container', {
          timeout: config.defaultTimeout,
          state: 'attached'
        });
      } catch (error) {
        throw new Error(`Popup container not found: ${error.message}`);
      }

      // Capture screenshot with performance monitoring
      const screenshot = await page.screenshot({
        fullPage: true,
        animations: 'disabled',
        timeout: config.performance.screenshotCaptureTarget
      });

      // Generate cache key
      const cacheKey = `popup-visual-desktop-light-${Date.now()}`;

      // Compare with baseline using cached comparison
      const result = await compareScreenshots({
        screenshot,
        baselinePath: 'tests/ui/visual/baseline/popup-desktop-light.png',
        testName: 'popup-visual-desktop-light',
        tolerance: config.baselines.tolerance,
        useCache: config.cache.enabled,
        compressionLevel: config.cache.compressionLevel
      });

      // Cache screenshot for future use
      if (config.cache.enabled) {
        await screenshotCache.cacheScreenshot(cacheKey, screenshot, {
          theme: 'light',
          viewport: 'desktop',
          component: 'popup',
          timestamp: Date.now()
        });
      }

      // Performance validation
      const executionTime = performance.now() - startTime;
      expect(executionTime, `Test execution time ${executionTime}ms exceeds target`).toBeLessThan(config.performance.testExecutionTarget);

      // Validate visual comparison
      expect(result.passed, result.message).toBe(true);
    });

    test('settings page should display all configuration options correctly', async ({ page }) => {
      const startTime = performance.now();

      // Set viewport and theme
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.emulateMedia({ colorScheme: 'dark' });

      // Navigate to settings
      await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/settings.html');

      // Wait for settings to load
      await page.waitForSelector('.settings-container', {
        timeout: config.defaultTimeout,
        state: 'visible'
      });

      // Verify all expected sections are present
      const expectedSections = [
        '.api-settings',
        '.theme-settings',
        '.export-settings',
        '.notion-settings'
      ];

      for (const section of expectedSections) {
        await expect(page.locator(section)).toBeVisible();
      }

      // Capture screenshot
      const screenshot = await page.screenshot({
        fullPage: true,
        animations: 'disabled'
      });

      // Compare with baseline
      const result = await compareScreenshots({
        screenshot,
        baselinePath: 'tests/ui/visual/baseline/settings-desktop-dark.png',
        testName: 'settings-visual-desktop-dark',
        tolerance: config.baselines.tolerance
      });

      // Performance validation
      const executionTime = performance.now() - startTime;
      expect(executionTime).toBeLessThan(config.performance.testExecutionTarget);

      expect(result.passed, result.message).toBe(true);
    });

    test('form elements should maintain consistent styling across themes', async ({ page }) => {
      const themes = ['light', 'dark'];
      const results = [];

      for (const theme of themes) {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Focus on form elements
        await page.focus('#title-input');
        await page.fill('#title-input', 'Test Title');

        // Capture form screenshot
        const screenshot = await page.screenshot({
          clip: { x: 0, y: 100, width: 360, height: 200 }, // Focus on form area
          animations: 'disabled'
        });

        const result = await compareScreenshots({
          screenshot,
          baselinePath: `tests/ui/visual/baseline/form-elements-${theme}.png`,
          testName: `form-elements-${theme}`,
          tolerance: config.baselines.tolerance
        });

        results.push({ theme, result });
      }

      // Validate all themes
      for (const { theme, result } of results) {
        expect(result.passed, `Form elements in ${theme} theme failed: ${result.message}`).toBe(true);
      }
    });
  });

  test.describe('Dynamic Content States', () => {
    test('loading states should display correctly with proper spinners', async ({ page }) => {
      await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');

      // Simulate loading state
      await page.evaluate(() => {
        document.body.classList.add('loading');
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
      });

      // Wait for loading state to be visible
      await page.waitForSelector('.loading-spinner', { timeout: 5000 });

      const screenshot = await page.screenshot({
        fullPage: true,
        animations: 'disabled'
      });

      const result = await compareScreenshots({
        screenshot,
        baselinePath: 'tests/ui/visual/baseline/loading-state.png',
        testName: 'loading-state',
        tolerance: config.baselines.tolerance
      });

      expect(result.passed, result.message).toBe(true);
    });

    test('error states should display user-friendly messages', async ({ page }) => {
      await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');

      // Simulate error state
      await page.evaluate(() => {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
          <div class="error-icon">⚠️</div>
          <div class="error-text">Failed to save content. Please try again.</div>
          <button class="retry-button">Retry</button>
        `;
        document.querySelector('.popup-container').appendChild(errorContainer);
      });

      await page.waitForSelector('.error-message', { timeout: 5000 });

      const screenshot = await page.screenshot({
        fullPage: true,
        animations: 'disabled'
      });

      const result = await compareScreenshots({
        screenshot,
        baselinePath: 'tests/ui/visual/baseline/error-state.png',
        testName: 'error-state',
        tolerance: config.baselines.tolerance
      });

      expect(result.passed, result.message).toBe(true);
    });

    test('success states should show confirmation messages', async ({ page }) => {
      await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');

      // Simulate success state
      await page.evaluate(() => {
        const successContainer = document.createElement('div');
        successContainer.className = 'success-notification';
        successContainer.innerHTML = `
          <div class="success-icon">✅</div>
          <div class="success-text">Content saved successfully!</div>
          <div class="success-details">Saved to: Web Clips</div>
        `;
        document.body.appendChild(successContainer);
      });

      await page.waitForSelector('.success-notification', { timeout: 5000 });

      const screenshot = await page.screenshot({
        fullPage: true,
        animations: 'disabled'
      });

      const result = await compareScreenshots({
        screenshot,
        baselinePath: 'tests/ui/visual/baseline/success-state.png',
        testName: 'success-state',
        tolerance: config.baselines.tolerance
      });

      expect(result.passed, result.message).toBe(true);
    });
  });

  test.describe('Responsive Design Testing', () => {
    const viewports = [
      { width: 1280, height: 720, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 800, height: 600, name: 'small-desktop' }
    ];

    viewports.forEach(viewport => {
      test(`popup should adapt to ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Verify responsive behavior
        const isOverflowing = await page.evaluate(() => {
          const container = document.querySelector('.popup-container');
          return container.scrollWidth > container.clientWidth ||
                 container.scrollHeight > container.clientHeight;
        });

        expect(isOverflowing, `Popup overflows on ${viewport.name} viewport`).toBe(false);

        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled'
        });

        const result = await compareScreenshots({
          screenshot,
          baselinePath: `tests/ui/visual/baseline/popup-${viewport.name}.png`,
          testName: `popup-responsive-${viewport.name}`,
          tolerance: config.baselines.tolerance
        });

        expect(result.passed, result.message).toBe(true);
      });
    });
  });

  test.afterAll(async () => {
    // Clean up cache
    if (screenshotCache) {
      await screenshotCache.clear();
    }
  });
});

// Export for use in other test files
export const visualTestExamples = {
  basicPopupTest: 'popup should render correctly with proper layout and styling',
  settingsTest: 'settings page should display all configuration options correctly',
  formElementsTest: 'form elements should maintain consistent styling across themes',
  loadingStateTest: 'loading states should display correctly with proper spinners',
  errorStateTest: 'error states should display user-friendly messages',
  successStateTest: 'success states should show confirmation messages',
  responsiveTest: 'popup should adapt to different viewport sizes'
};