/**
 * Popup Visual Regression Test Implementation
 *
 * Implements visual regression testing for Chrome extension popup component
 * with screenshot capture, baseline comparison, and comprehensive validation.
 */

import { test, expect } from '@playwright/test';
import { VisualBaseline } from '../../models/VisualBaseline.js';
import { TestConfiguration } from '../../models/test-configuration.js';
import { ScreenshotUtils } from '../../utils/screenshot-utils.js';
import { ErrorHandler } from '../../utils/error-handler.js';

test.describe('Popup Visual Regression Tests', () => {
  let testConfig;
  let screenshotUtils;
  let baselineManager;

  test.beforeAll(async () => {
    testConfig = new TestConfiguration({
      viewport: { width: 360, height: 600 },
      theme: 'light',
      screenshot: {
        enabled: true,
        threshold: 0.1,
        fullPage: false
      },
      timeout: {
        default: 5000,
        screenshot: 3000
      }
    });

    baselineManager = new VisualBaseline({
      component: 'popup',
      viewport: '360x600',
      theme: 'light'
    });

    screenshotUtils = new ScreenshotUtils(testConfig.screenshot);
  });

  test.describe('Initial State Rendering', () => {
    test('should capture popup initial state screenshot @visual', async ({ page }) => {
      try {
        // Navigate to extension popup
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');

        // Wait for popup to load
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Capture screenshot
        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.popup-container',
          'popup-initial-state'
        );

        // Compare with baseline
        const comparison = await baselineManager.compareWith(screenshotPath);

        // Assert visual match
        expect(comparison.matches, `Visual difference detected: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Difference ${comparison.difference} exceeds threshold 0.05`).toBeLessThan(0.05);

        // Log performance metrics
        test.info().annotations.push({
          type: 'performance',
          description: `Screenshot capture time: ${comparison.captureTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-initial-screenshot',
          component: 'popup-visual'
        });

        test.fail(`Failed to capture initial popup screenshot: ${handledError.message}`);
      }
    });

    test('should validate all popup elements are visible @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const elements = {
          title: '.popup-title',
          urlField: '.url-input',
          description: '.description-textarea',
          saveButton: '.save-button'
        };

        // Validate each element is visible
        const visibilityResults = {};

        for (const [elementName, selector] of Object.entries(elements)) {
          const element = await page.$(selector);
          const isVisible = element ? await element.isVisible() : false;
          const boundingBox = element ? await element.boundingBox() : null;

          visibilityResults[elementName] = {
            visible: isVisible,
            boundingBox: boundingBox,
            selector: selector
          };

          expect(isVisible, `${elementName} should be visible`).toBe(true);
          expect(boundingBox, `${elementName} should have bounding box`).not.toBeNull();
        }

        // Log element positions for debugging
        test.info().annotations.push({
          type: 'element-positions',
          description: JSON.stringify(visibilityResults, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-element-visibility',
          component: 'popup-visual'
        });

        test.fail(`Failed to validate popup elements: ${handledError.message}`);
      }
    });
  });

  test.describe('Dark Mode Rendering', () => {
    test('should capture popup dark mode screenshot @visual @dark-mode', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Enable dark mode
        await page.emulateMedia({ colorScheme: 'dark' });

        // Create dark mode baseline
        const darkBaseline = new VisualBaseline({
          component: 'popup',
          viewport: '360x600',
          theme: 'dark'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.popup-container',
          'popup-dark-mode'
        );

        const comparison = await darkBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Dark mode visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Dark mode difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-dark-mode',
          component: 'popup-visual'
        });

        test.fail(`Failed to capture dark mode screenshot: ${handledError.message}`);
      }
    });

    test('should validate text contrast in dark mode @accessibility @dark-mode', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.emulateMedia({ colorScheme: 'dark' });

        const contrastValidation = await screenshotUtils.validateTextContrast(
          page,
          '.popup-container'
        );

        expect(contrastValidation.passed, 'Text contrast should meet WCAG standards').toBe(true);
        expect(contrastValidation.minimumRatio, `Minimum contrast ratio ${contrastValidation.minimumRatio} below WCAG AA requirement`).toBeGreaterThanOrEqual(4.5);

        // Log contrast details for debugging
        test.info().annotations.push({
          type: 'contrast-details',
          description: JSON.stringify(contrastValidation.details, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-dark-mode-contrast',
          component: 'popup-visual'
        });

        test.fail(`Failed to validate dark mode contrast: ${handledError.message}`);
      }
    });
  });

  test.describe('Loading State Rendering', () => {
    test('should capture loading state screenshot @visual @loading', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Trigger loading state
        await page.click('.save-button');

        // Wait for loading spinner to appear
        await page.waitForSelector('.loading-spinner', { state: 'visible', timeout: 2000 });

        const loadingBaseline = new VisualBaseline({
          component: 'popup-loading',
          viewport: '360x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.loading-spinner',
          'popup-loading-state'
        );

        const comparison = await loadingBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Loading state visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Loading state difference ${comparison.difference} exceeds threshold 0.1`).toBeLessThan(0.1);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-loading-state',
          component: 'popup-visual'
        });

        test.fail(`Failed to capture loading state screenshot: ${handledError.message}`);
      }
    });

    test('should validate loading spinner animation @visual @loading', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.click('.save-button');
        await page.waitForSelector('.loading-spinner', { state: 'visible', timeout: 2000 });

        const animationValidation = await screenshotUtils.validateAnimation(
          page,
          '.loading-spinner'
        );

        expect(animationValidation.isAnimating, 'Loading spinner should be animating').toBe(true);
        expect(animationValidation.frameRate, `Animation frame rate ${animationValidation.frameRate} below minimum`).toBeGreaterThan(30);

        // Log animation metrics
        test.info().annotations.push({
          type: 'animation-metrics',
          description: `Frame rate: ${animationValidation.frameRate}fps, Duration: ${animationValidation.duration}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-loading-animation',
          component: 'popup-visual'
        });

        test.fail(`Failed to validate loading animation: ${handledError.message}`);
      }
    });
  });

  test.describe('Error State Rendering', () => {
    test('should capture error state screenshot @visual @error', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Simulate error state
        await page.evaluate(() => {
          window.showErrorState('network');
        });

        await page.waitForSelector('.error-message', { state: 'visible', timeout: 2000 });

        const errorBaseline = new VisualBaseline({
          component: 'popup-error',
          viewport: '360x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.error-message',
          'popup-error-state'
        );

        const comparison = await errorBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Error state visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Error state difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-error-state',
          component: 'popup-visual'
        });

        test.fail(`Failed to capture error state screenshot: ${handledError.message}`);
      }
    });

    test('should validate error message visibility and styling @visual @error', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.evaluate(() => {
          window.showErrorState('validation');
        });

        await page.waitForSelector('.error-message', { state: 'visible', timeout: 2000 });

        const errorValidation = await screenshotUtils.validateErrorStyling(
          page,
          '.error-message'
        );

        expect(errorValidation.visible, 'Error message should be visible').toBe(true);
        expect(errorValidation.color, 'Error message color should be valid hex').toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(errorValidation.backgroundColor, 'Error message background should be valid hex').toMatch(/^#[0-9A-Fa-f]{6}$/);

        // Log styling details
        test.info().annotations.push({
          type: 'error-styling',
          description: JSON.stringify({
            color: errorValidation.color,
            backgroundColor: errorValidation.backgroundColor,
            fontSize: errorValidation.fontSize,
            padding: errorValidation.padding
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-error-styling',
          component: 'popup-visual'
        });

        test.fail(`Failed to validate error styling: ${handledError.message}`);
      }
    });
  });

  test.describe('Success State Rendering', () => {
    test('should capture success notification screenshot @visual @success', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Simulate success state
        await page.evaluate(() => {
          window.showSuccessState();
        });

        await page.waitForSelector('.success-notification', { state: 'visible', timeout: 2000 });

        const successBaseline = new VisualBaseline({
          component: 'popup-success',
          viewport: '360x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.success-notification',
          'popup-success-state'
        );

        const comparison = await successBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Success state visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Success state difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-success-state',
          component: 'popup-visual'
        });

        test.fail(`Failed to capture success state screenshot: ${handledError.message}`);
      }
    });

    test('should validate success message auto-hide behavior @visual @success', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.evaluate(() => {
          window.showSuccessState();
        });

        await page.waitForSelector('.success-notification', { state: 'visible', timeout: 2000 });

        const autoHideValidation = await screenshotUtils.validateAutoHideBehavior(
          page,
          '.success-notification'
        );

        expect(autoHideValidation.visibleInitially, 'Success message should be visible initially').toBe(true);
        expect(autoHideValidation.hiddenAfterDelay, 'Success message should hide after delay').toBe(true);
        expect(autoHideValidation.hideDelay, `Hide delay ${autoHideValidation.hideDelay}ms exceeds 3000ms limit`).toBeLessThan(3000);

        // Log timing details
        test.info().annotations.push({
          type: 'auto-hide-timing',
          description: `Initial visibility: ${autoHideValidation.visibleInitially}, Hide delay: ${autoHideValidation.hideDelay}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-auto-hide',
          component: 'popup-visual'
        });

        test.fail(`Failed to validate auto-hide behavior: ${handledError.message}`);
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should meet screenshot capture performance target @performance @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const startTime = Date.now();

        await screenshotUtils.captureElement(page, '.popup-container', 'performance-test');

        const captureTime = Date.now() - startTime;

        expect(captureTime, `Screenshot capture time ${captureTime}ms exceeds 500ms target`).toBeLessThan(500);

        // Log performance metric
        test.info().annotations.push({
          type: 'performance-metric',
          description: `Screenshot capture time: ${captureTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-performance',
          component: 'popup-visual'
        });

        test.fail(`Failed to measure screenshot performance: ${handledError.message}`);
      }
    });
  });
});